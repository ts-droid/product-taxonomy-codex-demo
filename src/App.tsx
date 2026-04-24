import { useEffect, useMemo, useState } from 'react';
import {
  Database,
  ExternalLink,
  Filter,
  FolderTree,
  LayoutDashboard,
  Link2,
  RefreshCcw,
  Save,
  Search,
  Settings2,
  Sparkles,
  Store,
  Tags,
} from 'lucide-react';
import { Badge } from './components/Badge';
import { StatCard } from './components/StatCard';
import { DEFAULT_RAW_URLS, DEFAULT_REFERENCES, DEFAULT_SETTINGS } from './lib/demoData';
import { buildTaxonomy, parseProducts, type Product, type Settings } from './lib/catalog';

const ALL_IN_MAIN = '__ALL_IN_MAIN__';

function Section({ title, subtitle, icon: Icon, right, children }: { title: string; subtitle: string; icon: typeof FolderTree; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="card">
      <div className="card-head">
        <div className="head-left">
          <div className="icon-shell"><Icon size={18} /></div>
          <div>
            <h3>{title}</h3>
            <p className="muted">{subtitle}</p>
          </div>
        </div>
        {right}
      </div>
      <div className="card-body">{children}</div>
    </section>
  );
}

function Pill({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button className={active ? 'pill pill-active' : 'pill'} onClick={onClick}>
      {children}
    </button>
  );
}

function RangeInput({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return (
    <div className="range-box">
      <div className="range-head">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <div className="range-labels"><span>{min}</span><span>{max}</span></div>
    </div>
  );
}

function currentProducts(mainGroup: ReturnType<typeof buildTaxonomy>['mainGroups'][number] | undefined, selectedSub: string): Product[] {
  if (!mainGroup) return [];
  if (selectedSub === ALL_IN_MAIN) return mainGroup.products;
  return mainGroup.subGroups.find((item) => item.name === selectedSub)?.products ?? [];
}

export default function App() {
  const [mode, setMode] = useState<'admin' | 'customer'>('admin');
  const [draftRawUrls, setDraftRawUrls] = useState(DEFAULT_RAW_URLS);
  const [draftReferences, setDraftReferences] = useState(DEFAULT_REFERENCES);
  const [draftSettings, setDraftSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [applied, setApplied] = useState({ rawUrls: DEFAULT_RAW_URLS, references: DEFAULT_REFERENCES, settings: DEFAULT_SETTINGS });
  const [selectedMain, setSelectedMain] = useState<string | null>(null);
  const [selectedSub, setSelectedSub] = useState<string>(ALL_IN_MAIN);
  const [selectedSpecFilters, setSelectedSpecFilters] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  const dirty = draftRawUrls !== applied.rawUrls || draftReferences !== applied.references || JSON.stringify(draftSettings) !== JSON.stringify(applied.settings);

  const products = useMemo(() => parseProducts(applied.rawUrls, applied.settings), [applied]);
  const taxonomy = useMemo(() => buildTaxonomy(products, applied.settings), [products, applied.settings]);
  const references = useMemo(() => applied.references.split(/\n+/).map((v) => v.trim()).filter(Boolean), [applied.references]);

  useEffect(() => {
    if (!taxonomy.mainGroups.length) return;
    const first = taxonomy.mainGroups[0];
    const exists = selectedMain && taxonomy.mainGroups.some((item) => item.name === selectedMain);
    if (!exists) {
      setSelectedMain(first.name);
      setSelectedSub(ALL_IN_MAIN);
      setSelectedSpecFilters([]);
    }
  }, [taxonomy, selectedMain]);

  const mainGroup = taxonomy.mainGroups.find((item) => item.name === selectedMain) ?? taxonomy.mainGroups[0];
  const baseProducts = currentProducts(mainGroup, selectedSub);
  const specPills = useMemo(() => {
    const freq = new Map<string, number>();
    baseProducts.forEach((product) => {
      product.specificationTags.forEach((tag) => freq.set(tag, (freq.get(tag) || 0) + 1));
    });
    return [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'sv')).map(([tag, count]) => ({ tag, count }));
  }, [baseProducts]);

  useEffect(() => {
    setSelectedSpecFilters((prev) => prev.filter((tag) => specPills.some((item) => item.tag === tag)));
  }, [specPills]);

  const visibleProducts = useMemo(() => {
    let result = [...baseProducts];
    if (selectedSpecFilters.length) {
      result = result.filter((product) => selectedSpecFilters.every((tag) => product.specificationTags.includes(tag)));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((product) => product.title.toLowerCase().includes(q) || product.specificationTags.some((tag) => tag.includes(q)) || product.featureTags.some((tag) => tag.includes(q)));
    }
    return result;
  }, [baseProducts, selectedSpecFilters, search]);

  const layoutDiagnostics = useMemo(() => {
    return products.filter((product) => product.productType === 'Tangentbord' && !product.layout);
  }, [products]);

  const rebuild = () => setApplied({ rawUrls: draftRawUrls, references: draftReferences, settings: { ...draftSettings } });
  const resetDraft = () => {
    setDraftRawUrls(applied.rawUrls);
    setDraftReferences(applied.references);
    setDraftSettings({ ...applied.settings });
  };

  return (
    <div className="app-shell">
      <header className="hero card">
        <div>
          <div className="hero-tag"><Sparkles size={14} /> Dynamisk taxonomy-demo från RAW-länkar</div>
          <h1>Adminvy + kundvy för produktträd</h1>
          <p className="muted">Projektversionen har nu separata taggspår för specifikationer och funktioner. Specifikationer används för filtrering. Funktioner används för navigering, förståelse och rekommendationer.</p>
        </div>
        <div className="mode-switch">
          <button className={mode === 'admin' ? 'mode-button active' : 'mode-button'} onClick={() => setMode('admin')}><LayoutDashboard size={16} /> Admin</button>
          <button className={mode === 'customer' ? 'mode-button active' : 'mode-button'} onClick={() => setMode('customer')}><Store size={16} /> Kundvy</button>
        </div>
      </header>

      <div className="stats-grid">
        <StatCard label="Produkter" value={products.length} sublabel="unika RAW-länkar" icon={Database} />
        <StatCard label="Huvudgrupper" value={taxonomy.mainGroups.length} sublabel="skapade vid senaste byggning" icon={FolderTree} />
        <StatCard label="Referens-URL:er" value={references.length} sublabel="för benchmark/vidare logik" icon={Link2} />
        <StatCard label="Spec-taggar" value={applied.settings.maxSpecTags} sublabel="max för filtrering" icon={Tags} />
      </div>

      {mode === 'admin' ? (
        <div className="two-col">
          <div className="stack">
            <Section title="Import & källor" subtitle="Ändringar ligger som utkast tills du väljer att bygga om." icon={Link2} right={dirty ? <Badge tone="warning">Utkast ändrat</Badge> : <Badge tone="success">Aktiv version</Badge>}>
              <div className="button-row">
                <button className="primary-button" onClick={rebuild}><Save size={16} /> Spara / bygg om</button>
                <button className="secondary-button" onClick={resetDraft}><RefreshCcw size={16} /> Återställ utkast</button>
              </div>
              <div className="split-grid">
                <div>
                  <label>RAW-länklista</label>
                  <textarea value={draftRawUrls} onChange={(e) => setDraftRawUrls(e.target.value)} />
                </div>
                <div>
                  <label>Externa referens-URL:er</label>
                  <textarea value={draftReferences} onChange={(e) => setDraftReferences(e.target.value)} />
                </div>
              </div>
            </Section>

            <Section title="Inställningar" subtitle="Separata maxvärden för specifikationer och funktioner gör logiken mer stabil." icon={Settings2} right={<Badge tone="accent">Ny taggmodell</Badge>}>
              <div className="ranges-grid">
                <RangeInput label="Max totalt antal taggar" value={draftSettings.maxTotalTags} min={8} max={30} onChange={(value) => setDraftSettings((s) => ({ ...s, maxTotalTags: value }))} />
                <RangeInput label="Max specifikationstaggar" value={draftSettings.maxSpecTags} min={4} max={16} onChange={(value) => setDraftSettings((s) => ({ ...s, maxSpecTags: value }))} />
                <RangeInput label="Max funktionstaggar" value={draftSettings.maxFeatureTags} min={4} max={16} onChange={(value) => setDraftSettings((s) => ({ ...s, maxFeatureTags: value }))} />
                <RangeInput label="Max huvudgrupper" value={draftSettings.mainMax} min={3} max={12} onChange={(value) => setDraftSettings((s) => ({ ...s, mainMax: value }))} />
                <RangeInput label="Max undergrupper" value={draftSettings.subMax} min={3} max={10} onChange={(value) => setDraftSettings((s) => ({ ...s, subMax: value }))} />
                <RangeInput label="Kolumner i kundgrid" value={draftSettings.customerGridCols} min={2} max={4} onChange={(value) => setDraftSettings((s) => ({ ...s, customerGridCols: value }))} />
              </div>
              <div className="info-box">
                <strong>Varför tangentbord hamnade under Övriga tangentbord</strong>
                <p>Det berodde på att den tidigare regeluppsättningen bara fångade vissa layout-variationer. Nu fångas både <em>nordisk</em>, <em>nordic layout</em>, <em>us eng layout</em>, <em>us english</em> och <em>us-layout</em> som separata specifikationer.</p>
              </div>
            </Section>

            <Section title="Kategoriöversikt" subtitle="Endast ett fallback-spår används nu: Fler tillbehör / Blandat. Det minskar dubbel 'övrigt'-känsla." icon={FolderTree}>
              <div className="list-stack">
                {taxonomy.mainGroups.map((group) => (
                  <div className="group-card" key={group.name}>
                    <div className="group-row"><strong>{group.name}</strong><Badge>{group.count} produkter</Badge></div>
                    <div className="pill-row">
                      {group.subGroups.map((sub) => <span key={sub.name} className="mini-tag">{sub.name} · {sub.count}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </div>

          <div className="stack">
            <Section title="Taggdiagnostik" subtitle="Specifikationer används för filtrering. Funktioner används för sammanhang och rekommendationer." icon={Tags}>
              <div className="tag-columns">
                <div>
                  <div className="subheading">Topp-specifikationer</div>
                  <div className="pill-row">{taxonomy.topSpecificationTags.map((item) => <span className="mini-tag" key={item.tag}>{item.tag} · {item.count}</span>)}</div>
                </div>
                <div>
                  <div className="subheading">Topp-funktioner</div>
                  <div className="pill-row">{taxonomy.topFeatureTags.map((item) => <span className="mini-tag" key={item.tag}>{item.tag} · {item.count}</span>)}</div>
                </div>
              </div>
            </Section>

            <Section title="Layout-kontroll" subtitle="Här ser du tangentbord som fortfarande inte får någon layout. Det hjälper felsökningen." icon={Search} right={<Badge>{layoutDiagnostics.length} utan layout</Badge>}>
              <div className="list-stack compact">
                {layoutDiagnostics.length === 0 ? <div className="empty">Alla tangentbord i listan fick layout korrekt.</div> : layoutDiagnostics.map((product) => <div className="row-item" key={product.id}>{product.title}</div>)}
              </div>
            </Section>

            <Section title="Produktplaceringar" subtitle="Varje produkt visar separat uppdelning för specifikationer, funktioner och relaterade produkter." icon={Database}>
              <div className="product-list">
                {products.map((product) => (
                  <article className="product-card" key={product.id}>
                    <div className="group-row">
                      <div>
                        <strong>{product.title}</strong>
                        <div className="muted small">{product.dynamicMainCategory} → {product.dynamicSubCategory}</div>
                      </div>
                      <a href={product.rawUrl} className="icon-link"><ExternalLink size={15} /></a>
                    </div>
                    <div className="meta-block">
                      <div className="subheading">Specifikationer</div>
                      <div className="pill-row">{product.specificationTags.map((tag) => <span className="mini-tag" key={tag}>{tag}</span>)}</div>
                    </div>
                    <div className="meta-block">
                      <div className="subheading">Funktioner</div>
                      <div className="pill-row">{product.featureTags.map((tag) => <span className="mini-tag soft" key={tag}>{tag}</span>)}</div>
                    </div>
                    <div className="meta-block">
                      <div className="subheading">Relaterade produkter</div>
                      <div className="pill-row">{product.recommendationMatches.length ? product.recommendationMatches.map((item) => <span className="mini-tag linked" key={`${product.id}-${item.productId}-${item.target}`}>{item.title}</span>) : <span className="muted small">Inga matchade relaterade produkter</span>}</div>
                    </div>
                  </article>
                ))}
              </div>
            </Section>
          </div>
        </div>
      ) : (
        <div className="two-col sidebar-layout">
          <div className="stack">
            <Section title="Butiksnavigation" subtitle="Välj huvudkategori eller en undergrupp. Filterpillsen uppdateras dynamiskt." icon={Store}>
              <div className="nav-tree">
                {taxonomy.mainGroups.map((group) => (
                  <div className="nav-group" key={group.name}>
                    <button className={selectedMain === group.name ? 'nav-main active' : 'nav-main'} onClick={() => { setSelectedMain(group.name); setSelectedSub(ALL_IN_MAIN); setSelectedSpecFilters([]); setSearch(''); }}>{group.name}<span>{group.count}</span></button>
                    <button className={selectedMain === group.name && selectedSub === ALL_IN_MAIN ? 'nav-sub active' : 'nav-sub'} onClick={() => { setSelectedMain(group.name); setSelectedSub(ALL_IN_MAIN); setSelectedSpecFilters([]); }}>Alla i huvudkategori<span>{group.count}</span></button>
                    {group.subGroups.map((sub) => (
                      <button className={selectedMain === group.name && selectedSub === sub.name ? 'nav-sub active' : 'nav-sub'} key={sub.name} onClick={() => { setSelectedMain(group.name); setSelectedSub(sub.name); setSelectedSpecFilters([]); }}>{sub.name}<span>{sub.count}</span></button>
                    ))}
                  </div>
                ))}
              </div>
            </Section>
          </div>

          <div className="stack">
            <Section title="Aktuell vy" subtitle="Specifikationer filtrerar produkterna. Flera val kombineras med AND-logik." icon={Filter}>
              <div className="toolbar">
                <div>
                  <div className="view-title">{mainGroup?.name ?? 'Ingen grupp'} / {selectedSub === ALL_IN_MAIN ? 'Alla i huvudkategori' : selectedSub}</div>
                  <div className="muted">{visibleProducts.length} produkter i vyn</div>
                </div>
                <div className="search-box">
                  <Search size={16} />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Sök i vald kategori" />
                </div>
              </div>
              <div className="subheading">Filterbara specifikationer</div>
              <div className="pill-row">
                <Pill active={!selectedSpecFilters.length} onClick={() => setSelectedSpecFilters([])}>Alla</Pill>
                {specPills.map((item) => (
                  <Pill key={item.tag} active={selectedSpecFilters.includes(item.tag)} onClick={() => setSelectedSpecFilters((prev) => prev.includes(item.tag) ? prev.filter((tag) => tag !== item.tag) : [...prev, item.tag])}>
                    {item.tag} · {item.count}
                  </Pill>
                ))}
              </div>
            </Section>

            <div className={applied.settings.customerGridCols === 2 ? 'grid products-grid two' : applied.settings.customerGridCols === 4 ? 'grid products-grid four' : 'grid products-grid three'}>
              {visibleProducts.map((product) => (
                <article className="product-card" key={product.id}>
                  <div className="eyebrow">{product.productType}</div>
                  <h4>{product.title}</h4>
                  <div className="meta-block">
                    <div className="subheading">Specifikationer</div>
                    <div className="pill-row">{product.specificationTags.map((tag) => <span className="mini-tag" key={tag}>{tag}</span>)}</div>
                  </div>
                  <div className="meta-block">
                    <div className="subheading">Funktioner</div>
                    <div className="pill-row">{product.featureTags.map((tag) => <span className="mini-tag soft" key={tag}>{tag}</span>)}</div>
                  </div>
                  <div className="meta-block">
                    <div className="subheading">Relaterade produkter i butiken</div>
                    <div className="pill-row">{product.recommendationMatches.length ? product.recommendationMatches.map((item) => <span className="mini-tag linked" key={`${product.id}-${item.productId}`}>{item.title}</span>) : <span className="muted small">Ingen match i aktuell lista</span>}</div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
