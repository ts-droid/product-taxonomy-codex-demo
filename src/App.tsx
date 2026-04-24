import { useEffect, useMemo, useState } from 'react';
import {
  BrainCircuit,
  Database,
  Download,
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
import {
  buildTaggingPrompt,
  matchReferenceSources,
  parseImportedProducts,
  type ImportedRawSource,
  type ImportedReferenceSource,
  type RawImportFailure,
  type ReferenceImportFailure,
} from './lib/rawPipeline';

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
  const [importedSources, setImportedSources] = useState<ImportedRawSource[]>([]);
  const [importFailures, setImportFailures] = useState<RawImportFailure[]>([]);
  const [importedReferences, setImportedReferences] = useState<ImportedReferenceSource[]>([]);
  const [referenceFailures, setReferenceFailures] = useState<ReferenceImportFailure[]>([]);
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [importedAt, setImportedAt] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState('');
  const [selectedPromptSourceId, setSelectedPromptSourceId] = useState<number | null>(null);
  const [selectedMain, setSelectedMain] = useState<string | null>(null);
  const [selectedSub, setSelectedSub] = useState<string>(ALL_IN_MAIN);
  const [selectedSpecFilters, setSelectedSpecFilters] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  const dirty = draftRawUrls !== applied.rawUrls || draftReferences !== applied.references || JSON.stringify(draftSettings) !== JSON.stringify(applied.settings);
  const draftRawUrlCount = useMemo(() => draftRawUrls.split(/\n+/).map((v) => v.trim()).filter(Boolean).length, [draftRawUrls]);
  const appliedRawUrlCount = useMemo(() => applied.rawUrls.split(/\n+/).map((v) => v.trim()).filter(Boolean).length, [applied.rawUrls]);
  const products = useMemo(
    () => (importedSources.length ? parseImportedProducts(importedSources, applied.settings) : parseProducts(applied.rawUrls, applied.settings)),
    [applied, importedSources]
  );
  const taxonomy = useMemo(() => buildTaxonomy(products, applied.settings), [products, applied.settings]);
  const references = useMemo(() => applied.references.split(/\n+/).map((v) => v.trim()).filter(Boolean), [applied.references]);
  const promptSource = useMemo(
    () => importedSources.find((source) => source.id === selectedPromptSourceId) ?? importedSources[0] ?? null,
    [importedSources, selectedPromptSourceId]
  );
  const promptPreview = useMemo(
    () => (promptSource ? buildTaggingPrompt(promptSource, applied.settings, importedReferences) : ''),
    [promptSource, applied.settings, importedReferences]
  );
  const matchedPromptReferences = useMemo(
    () => (promptSource ? matchReferenceSources(promptSource, importedReferences, 3) : []),
    [promptSource, importedReferences]
  );
  const referenceMatchesByProduct = useMemo(() => {
    const entries = products.map((product) => {
      const source = importedSources.find((item) => item.id === product.id) ?? {
        id: product.id,
        rawUrl: product.rawUrl,
        slug: product.slug,
        sourceTitle: product.title,
        rawText: product.searchText,
        highlightLines: [],
        specificationLines: [],
        excerpt: product.searchText,
        fetchedAt: '',
      };
      return [product.id, matchReferenceSources(source, importedReferences, 2)] as const;
    });
    return new Map(entries);
  }, [products, importedSources, importedReferences]);

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

  const rebuild = () => {
    setApplied({ rawUrls: draftRawUrls, references: draftReferences, settings: { ...draftSettings } });
    setImportedSources([]);
    setImportFailures([]);
    setImportedReferences([]);
    setReferenceFailures([]);
    setImportStatus('idle');
    setImportedAt(null);
    setImportMessage('');
    setSelectedPromptSourceId(null);
  };

  const resetDraft = () => {
    setDraftRawUrls(applied.rawUrls);
    setDraftReferences(applied.references);
    setDraftSettings({ ...applied.settings });
  };

  const importRawData = async () => {
    const nextApplied = { rawUrls: draftRawUrls, references: draftReferences, settings: { ...draftSettings } };
    setApplied(nextApplied);
    setImportStatus('loading');
    setImportFailures([]);
    setReferenceFailures([]);
    setImportMessage('');

    try {
      const response = await fetch('/api/import-raw', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rawUrls: nextApplied.rawUrls, references: nextApplied.references }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? `Importen misslyckades (${response.status})`);
      }

      const data = await response.json() as {
        importedAt: string;
        sources: ImportedRawSource[];
        failures: RawImportFailure[];
        referenceSources: ImportedReferenceSource[];
        referenceFailures: ReferenceImportFailure[];
      };
      setImportedSources(data.sources);
      setImportFailures(data.failures ?? []);
      setImportedReferences(data.referenceSources ?? []);
      setReferenceFailures(data.referenceFailures ?? []);
      setImportedAt(data.importedAt);
      setImportStatus(data.sources.length ? 'success' : 'error');
      setImportMessage(data.sources.length ? 'RAW-innehåll och referenskontext inläst från källsidorna.' : 'Ingen RAW-data kunde importeras.');
      setSelectedPromptSourceId(data.sources[0]?.id ?? null);
    } catch (error) {
      setImportedSources([]);
      setImportedReferences([]);
      setImportStatus('error');
      setImportMessage(error instanceof Error ? error.message : 'Okänt importfel');
    }
  };

  return (
    <div className="app-shell">
      <header className="hero card">
        <div>
          <div className="hero-tag"><Sparkles size={14} /> Dynamisk taxonomy-demo från RAW-länkar</div>
          <h1>Adminvy + kundvy för produktträd</h1>
          <p className="muted">Projektversionen kan nu växla mellan slug-fallback och riktig RAW-import. Specifikationer används för filtrering. Funktioner används för navigering, förståelse och rekommendationer.</p>
        </div>
        <div className="mode-switch">
          <button className={mode === 'admin' ? 'mode-button active' : 'mode-button'} onClick={() => setMode('admin')}><LayoutDashboard size={16} /> Admin</button>
          <button className={mode === 'customer' ? 'mode-button active' : 'mode-button'} onClick={() => setMode('customer')}><Store size={16} /> Kundvy</button>
        </div>
      </header>

      <div className="stats-grid">
        <StatCard label="Produkter" value={products.length} sublabel="unika RAW-länkar" icon={Database} />
        <StatCard label="Huvudgrupper" value={taxonomy.mainGroups.length} sublabel="skapade vid senaste byggning" icon={FolderTree} />
        <StatCard label="Källdata" value={importedSources.length ? 'RAW' : 'Slug'} sublabel={importedSources.length ? `${importedSources.length} produkter lästa från råinnehåll` : 'fallback till URL/slugs'} icon={Download} />
        <StatCard label="Referens-URL:er" value={references.length} sublabel={importedReferences.length ? `${importedReferences.length} referenser inlästa` : 'för benchmark/vidare logik'} icon={Link2} />
      </div>

      {mode === 'admin' ? (
        <div className="two-col">
          <div className="stack">
            <Section title="Import & källor" subtitle="Ändringar ligger som utkast tills du väljer att bygga om eller läsa in RAW-data." icon={Link2} right={dirty ? <Badge tone="warning">Utkast ändrat</Badge> : <Badge tone="success">Aktiv version</Badge>}>
              <div className="button-row">
                <button className="primary-button" onClick={rebuild}><Save size={16} /> Spara / bygg om</button>
                <button className="secondary-button" onClick={importRawData} disabled={importStatus === 'loading'}><Download size={16} /> {importStatus === 'loading' ? 'Läser RAW-data...' : 'Läs in RAW-data'}</button>
                <button className="secondary-button" onClick={resetDraft}><RefreshCcw size={16} /> Återställ utkast</button>
              </div>
              <div className="status-stack">
                <div className="status-item">
                  <span className="subheading">Nuvarande importläge</span>
                  {importStatus === 'loading' ? <Badge tone="warning">Hämtar källdata</Badge> : importedSources.length ? <Badge tone="success">Riktig RAW-import aktiv</Badge> : <Badge>Slug-fallback aktiv</Badge>}
                </div>
                <div className="muted">
                  {importMessage || 'Klicka på "Läs in RAW-data" för att hämta titel, specs och innehåll från källsidorna via backend.'}
                  {importedAt ? ` Senaste import: ${new Date(importedAt).toLocaleString('sv-SE')}.` : ''}
                </div>
                {dirty && (
                  <div className="warning-box">
                    <strong>Utkastet visas inte ännu</strong>
                    <div className="small">Du har {draftRawUrlCount} RAW-länkar i utkastet men vyn bygger fortfarande på {appliedRawUrlCount} applicerade länkar tills du klickar `Spara / bygg om` eller `Läs in RAW-data`.</div>
                  </div>
                )}
                {!!importFailures.length && (
                  <div className="warning-box">
                    <strong>Misslyckade importer</strong>
                    <div className="list-stack compact">
                      {importFailures.map((failure) => (
                        <div key={failure.rawUrl} className="row-item small">
                          {failure.rawUrl} - {failure.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {!!referenceFailures.length && (
                  <div className="warning-box">
                    <strong>Misslyckade referenser</strong>
                    <div className="list-stack compact">
                      {referenceFailures.map((failure) => (
                        <div key={failure.referenceUrl} className="row-item small">
                          {failure.referenceUrl} - {failure.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                <strong>Hur pipeline:n fungerar nu</strong>
                <p>Utan import körs en snabb slug-baserad fallback. Efter RAW-import bygger appen taggarna på titel, specifikationsrader, highlights och övrig text från produktsidan. Externa referenser hämtas också och används som benchmarkkontext i prompt-preview och referensmatchning.</p>
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

            <Section title="Prompt-preview" subtitle="Visar prompten som kan skickas till en LLM för vald produkt efter RAW-import." icon={BrainCircuit} right={importedSources.length ? <Badge tone="accent">LLM-ready</Badge> : <Badge tone="warning">Import krävs</Badge>}>
              {importedSources.length ? (
                <>
                  <div className="field-stack">
                    <label>Produkt för prompt-preview</label>
                    <select className="select-field" value={promptSource?.id ?? importedSources[0]?.id} onChange={(e) => setSelectedPromptSourceId(Number(e.target.value))}>
                      {importedSources.map((source) => (
                        <option key={source.id} value={source.id}>{source.sourceTitle}</option>
                      ))}
                    </select>
                  </div>
                  <div className="info-box">
                    <strong>Källsammanfattning</strong>
                    <p>{promptSource?.excerpt}</p>
                  </div>
                  <div className="info-box">
                    <strong>Matchade referenser</strong>
                    {matchedPromptReferences.length ? (
                      <div className="list-stack compact">
                        {matchedPromptReferences.map((reference) => (
                          <div className="row-item" key={reference.referenceUrl}>
                            <strong>{reference.title}</strong>
                            <div className="muted small">{reference.matchedTerms.join(', ') || 'allmän benchmarkmatch'}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p>Inga tydliga referenser matchade den här produkten ännu.</p>
                    )}
                  </div>
                  <div className="field-stack">
                    <label>Prompt</label>
                    <textarea className="code-area" readOnly value={promptPreview} />
                  </div>
                </>
              ) : (
                <div className="empty">Ingen prompt-preview ännu. Kör först RAW-import så att prompten baseras på verkligt produktinnehåll i stället för bara sluggen.</div>
              )}
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
                    {!!importedReferences.length && (
                      <div className="meta-block">
                        <div className="subheading">Matchade referenser</div>
                        <div className="pill-row">
                          {(referenceMatchesByProduct.get(product.id) ?? []).length
                            ? (referenceMatchesByProduct.get(product.id) ?? []).map((reference) => <span className="mini-tag soft" key={`${product.id}-${reference.referenceUrl}`}>{reference.title}</span>)
                            : <span className="muted small">Ingen tydlig referensmatch</span>}
                        </div>
                      </div>
                    )}
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
