import { useEffect, useMemo, useState } from 'react';
import {
  BrainCircuit,
  Database,
  Download,
  ExternalLink,
  Filter,
  FolderTree,
  Gavel,
  LayoutDashboard,
  Link2,
  ListChecks,
  RefreshCcw,
  Save,
  Search,
  Settings2,
  Sparkles,
  Store,
  ShieldCheck,
  Tags,
} from 'lucide-react';
import { Badge } from './components/Badge';
import { StatCard } from './components/StatCard';
import { DEFAULT_RAW_URLS, DEFAULT_REFERENCES, DEFAULT_SETTINGS } from './lib/demoData';
import { buildTaxonomy, parseProducts, type Product, type Settings } from './lib/catalog';
import {
  DEFAULT_RAW_PROMPT_TEMPLATE,
  DEFAULT_REFERENCE_PROMPT_TEMPLATE,
  buildRawExtractionPrompt,
  buildReferenceSupportPrompt,
  matchReferenceSources,
  parseImportedProducts,
  type ImportedRawSource,
  type ImportedReferenceSource,
  type RawImportFailure,
  type ReferenceImportFailure,
} from './lib/rawPipeline';
import {
  deriveCandidateSuggestions,
  normalizeTaxonomyValue,
  type AdminReviewItem,
  type AdminStoredTag,
  type CandidateSuggestion,
  type TaxonomyAdminState,
} from './lib/taxonomyAdmin';

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

function defaultManualTagDraft() {
  return {
    tagKey: 'specification' as const,
    canonicalId: '',
    displayName: '',
    groupName: '',
    aliases: '',
  };
}

function defaultReviewDecisionDraft(item?: AdminReviewItem | null) {
  return {
    canonicalId: item?.suggestedDisplayName ? normalizeTaxonomyValue(item.suggestedDisplayName).replace(/\s+/g, '_') : item?.candidateValue ? normalizeTaxonomyValue(item.candidateValue).replace(/\s+/g, '_') : '',
    displayName: item?.suggestedDisplayName ?? item?.candidateValue ?? '',
    groupName: item?.suggestedGroup ?? '',
    aliases: item?.candidateValue ?? '',
  };
}

export default function App() {
  const defaultPromptTemplates = useMemo(() => ({
    raw: DEFAULT_RAW_PROMPT_TEMPLATE,
    reference: DEFAULT_REFERENCE_PROMPT_TEMPLATE,
  }), []);
  const [mode, setMode] = useState<'admin' | 'customer'>('admin');
  const [draftRawUrls, setDraftRawUrls] = useState(DEFAULT_RAW_URLS);
  const [draftReferences, setDraftReferences] = useState(DEFAULT_REFERENCES);
  const [draftSettings, setDraftSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [draftPromptTemplates, setDraftPromptTemplates] = useState(defaultPromptTemplates);
  const [applied, setApplied] = useState({
    rawUrls: DEFAULT_RAW_URLS,
    references: DEFAULT_REFERENCES,
    settings: DEFAULT_SETTINGS,
    promptTemplates: defaultPromptTemplates,
  });
  const [importedSources, setImportedSources] = useState<ImportedRawSource[]>([]);
  const [importFailures, setImportFailures] = useState<RawImportFailure[]>([]);
  const [importedReferences, setImportedReferences] = useState<ImportedReferenceSource[]>([]);
  const [referenceFailures, setReferenceFailures] = useState<ReferenceImportFailure[]>([]);
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [importedAt, setImportedAt] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState('');
  const [adminState, setAdminState] = useState<TaxonomyAdminState | null>(null);
  const [adminStatus, setAdminStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [adminMessage, setAdminMessage] = useState('');
  const [adminActionStatus, setAdminActionStatus] = useState<'idle' | 'saving'>('idle');
  const [selectedAdminTagKey, setSelectedAdminTagKey] = useState<'all' | 'specification' | 'compatibility' | 'feature'>('all');
  const [registrySearch, setRegistrySearch] = useState('');
  const [selectedReviewId, setSelectedReviewId] = useState<number | null>(null);
  const [manualTagDraft, setManualTagDraft] = useState(defaultManualTagDraft);
  const [reviewDecisionDraft, setReviewDecisionDraft] = useState(defaultReviewDecisionDraft());
  const [selectedPromptSourceId, setSelectedPromptSourceId] = useState<number | null>(null);
  const [selectedMain, setSelectedMain] = useState<string | null>(null);
  const [selectedSub, setSelectedSub] = useState<string>(ALL_IN_MAIN);
  const [selectedSpecFilters, setSelectedSpecFilters] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  const promptTemplatesDirty = JSON.stringify(draftPromptTemplates) !== JSON.stringify(applied.promptTemplates);
  const dirty = draftRawUrls !== applied.rawUrls
    || draftReferences !== applied.references
    || JSON.stringify(draftSettings) !== JSON.stringify(applied.settings)
    || promptTemplatesDirty;
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
  const rawPromptPreview = useMemo(
    () => (promptSource ? buildRawExtractionPrompt(promptSource, applied.settings, applied.promptTemplates.raw) : ''),
    [promptSource, applied.settings, applied.promptTemplates]
  );
  const referencePromptPreview = useMemo(
    () => (promptSource ? buildReferenceSupportPrompt(promptSource, applied.settings, importedReferences, applied.promptTemplates.reference) : ''),
    [promptSource, applied.settings, importedReferences, applied.promptTemplates]
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
        compatibilityLines: [],
        excerpt: product.searchText,
        fetchedAt: '',
      };
      return [product.id, matchReferenceSources(source, importedReferences, 2)] as const;
    });
    return new Map(entries);
  }, [products, importedSources, importedReferences]);
  const candidateSuggestions = useMemo<CandidateSuggestion[]>(
    () => {
      if (!adminState) return [];
      const queued = new Set(adminState.reviewQueue.map((item) => `${item.tagKey}:${item.normalizedCandidate}`));
      return deriveCandidateSuggestions(products, importedSources, adminState.storedTags)
        .filter((candidate) => !queued.has(`${candidate.key}:${normalizeTaxonomyValue(candidate.candidateValue)}`));
    },
    [adminState, products, importedSources]
  );
  const filteredRegistryTags = useMemo(() => {
    const q = registrySearch.trim().toLowerCase();
    return (adminState?.storedTags ?? [])
      .filter((tag) => selectedAdminTagKey === 'all' || tag.tagKey === selectedAdminTagKey)
      .filter((tag) => {
        if (!q) return true;
        const haystack = [tag.displayName, tag.canonicalId, tag.groupName ?? '', ...tag.aliases].join(' ').toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => a.tagKey.localeCompare(b.tagKey) || a.displayName.localeCompare(b.displayName, 'sv'));
  }, [adminState, registrySearch, selectedAdminTagKey]);
  const pendingReviewItems = useMemo(
    () => (adminState?.reviewQueue ?? []).filter((item) => item.status === 'pending'),
    [adminState]
  );
  const selectedReviewItem = useMemo(
    () => adminState?.reviewQueue.find((item) => item.id === selectedReviewId) ?? pendingReviewItems[0] ?? null,
    [adminState, pendingReviewItems, selectedReviewId]
  );

  const refreshAdminState = async (message?: string) => {
    setAdminStatus('loading');
    if (message) setAdminMessage(message);

    try {
      const response = await fetch('/api/taxonomy-admin/state');
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? `Kunde inte läsa taxonomy-admin-state (${response.status})`);
      }

      const data = await response.json() as TaxonomyAdminState;
      setAdminState(data);
      setAdminStatus('success');
      setAdminMessage(message ?? 'Canonical tags, alias och review-kö hämtades från taxonomy-admin.');
      setSelectedReviewId((current) => current ?? data.reviewQueue.find((item) => item.status === 'pending')?.id ?? null);
    } catch (error) {
      setAdminStatus('error');
      setAdminMessage(error instanceof Error ? error.message : 'Okänt fel i taxonomy-admin.');
    }
  };

  const queueCandidate = async (candidate: CandidateSuggestion) => {
    setAdminActionStatus('saving');
    try {
      const response = await fetch('/api/taxonomy-admin/review', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sourceRef: candidate.sourceRef,
          tagKey: candidate.key,
          candidateValue: candidate.candidateValue,
          suggestedDisplayName: candidate.suggestedDisplayName,
          suggestedGroup: candidate.suggestedGroup,
          reason: candidate.reason,
          evidence: {
            sourceTitle: candidate.sourceTitle,
            evidence: candidate.evidence,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? 'Kunde inte lägga kandidaten i review-kön.');
      }

      await refreshAdminState(`Kandidaten "${candidate.candidateValue}" skickades till review-kön.`);
    } catch (error) {
      setAdminStatus('error');
      setAdminMessage(error instanceof Error ? error.message : 'Kunde inte skicka kandidaten till review-kön.');
    } finally {
      setAdminActionStatus('idle');
    }
  };

  const saveCanonicalTag = async () => {
    setAdminActionStatus('saving');
    try {
      const response = await fetch('/api/taxonomy-admin/tags', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(manualTagDraft),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? 'Kunde inte spara canonical tag.');
      }

      setManualTagDraft(defaultManualTagDraft());
      await refreshAdminState('Canonical tag sparades i taxonomy-registret.');
    } catch (error) {
      setAdminStatus('error');
      setAdminMessage(error instanceof Error ? error.message : 'Kunde inte spara canonical tag.');
    } finally {
      setAdminActionStatus('idle');
    }
  };

  const decideReviewItem = async (decision: 'approved' | 'rejected') => {
    if (!selectedReviewItem) return;

    setAdminActionStatus('saving');
    try {
      const response = await fetch(`/api/taxonomy-admin/review/${selectedReviewItem.id}/decision`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          decision,
          tagKey: selectedReviewItem.tagKey,
          canonicalId: reviewDecisionDraft.canonicalId,
          displayName: reviewDecisionDraft.displayName,
          groupName: reviewDecisionDraft.groupName,
          aliases: reviewDecisionDraft.aliases,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? 'Kunde inte uppdatera review-item.');
      }

      setReviewDecisionDraft(defaultReviewDecisionDraft());
      await refreshAdminState(decision === 'approved' ? 'Review-item godkänd och sparad som canonical tag.' : 'Review-item markerades som avslagen.');
    } catch (error) {
      setAdminStatus('error');
      setAdminMessage(error instanceof Error ? error.message : 'Kunde inte uppdatera review-item.');
    } finally {
      setAdminActionStatus('idle');
    }
  };

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

  useEffect(() => {
    refreshAdminState();
  }, []);

  useEffect(() => {
    if (selectedReviewItem) {
      setReviewDecisionDraft(defaultReviewDecisionDraft(selectedReviewItem));
      if (selectedReviewId !== selectedReviewItem.id) {
        setSelectedReviewId(selectedReviewItem.id);
      }
    }
  }, [selectedReviewItem]);

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
    setApplied({
      rawUrls: draftRawUrls,
      references: draftReferences,
      settings: { ...draftSettings },
      promptTemplates: { ...draftPromptTemplates },
    });
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
    setDraftPromptTemplates({ ...applied.promptTemplates });
  };

  const applyPromptTemplates = () => {
    setApplied((current) => ({
      ...current,
      promptTemplates: { ...draftPromptTemplates },
    }));
  };

  const resetPromptTemplates = () => {
    setDraftPromptTemplates({ ...defaultPromptTemplates });
  };

  const importRawData = async () => {
    const nextApplied = {
      rawUrls: draftRawUrls,
      references: draftReferences,
      settings: { ...draftSettings },
      promptTemplates: { ...draftPromptTemplates },
    };
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
                <p>Utan import körs en snabb slug-baserad fallback. Efter RAW-import bygger appen taggarna på titel, specifikationsrader, highlights och övrig text från produktsidan. Externa referenser hämtas också och används som sekundär benchmarkkontext via en separat referens-prompt, så att produktens egen RAW-källa fortsätter vara primär.</p>
              </div>
            </Section>

            <Section title="Taxonomy-governance" subtitle="Här styr du canonical tags, alias och review-kö för specifikationer, passar till/med och funktioner." icon={ShieldCheck} right={adminState ? <Badge tone="accent">{adminState.summary.totalTags} canonical</Badge> : <Badge tone="warning">Laddar</Badge>}>
              <div className="button-row">
                <button className="secondary-button" onClick={() => refreshAdminState('Taxonomy-admin uppdateras...')} disabled={adminStatus === 'loading' || adminActionStatus === 'saving'}>
                  <RefreshCcw size={16} /> {adminStatus === 'loading' ? 'Laddar adminstate...' : 'Uppdatera adminstate'}
                </button>
              </div>
              <div className="status-stack">
                <div className="status-item">
                  <span className="subheading">Adminstatus</span>
                  {adminStatus === 'loading' ? <Badge tone="warning">Läser DB</Badge> : adminStatus === 'success' ? <Badge tone="success">Canonical registry aktiv</Badge> : adminStatus === 'error' ? <Badge tone="warning">Adminfel</Badge> : <Badge>Idle</Badge>}
                </div>
                <div className="muted">{adminMessage || 'Canonical registry och review-kö laddas från taxonomy-admin när vyn öppnas.'}</div>
              </div>
              {adminState && (
                <div className="admin-summary-grid">
                  <div className="range-box">
                    <div className="range-head"><span>Specifikationer</span><strong>{adminState.summary.byKey.specification}</strong></div>
                    <div className="muted small">Kända canonical specs och alias</div>
                  </div>
                  <div className="range-box">
                    <div className="range-head"><span>Passar till/med</span><strong>{adminState.summary.byKey.compatibility}</strong></div>
                    <div className="muted small">Canonical kompatibilitetsmål</div>
                  </div>
                  <div className="range-box">
                    <div className="range-head"><span>Funktioner</span><strong>{adminState.summary.byKey.feature}</strong></div>
                    <div className="muted small">Canonical funktionsvokabulär</div>
                  </div>
                  <div className="range-box">
                    <div className="range-head"><span>Alias</span><strong>{adminState.summary.totalAliases}</strong></div>
                    <div className="muted small">Fuzzy/synonymmatchningar</div>
                  </div>
                  <div className="range-box">
                    <div className="range-head"><span>Review-kö</span><strong>{adminState.summary.pendingReview}</strong></div>
                    <div className="muted small">Väntar på beslut</div>
                  </div>
                </div>
              )}
              <div className="split-grid">
                <div className="field-stack">
                  <label>Ny canonical tag</label>
                  <select className="select-field" value={manualTagDraft.tagKey} onChange={(e) => setManualTagDraft((current) => ({ ...current, tagKey: e.target.value as 'specification' | 'compatibility' | 'feature' }))}>
                    <option value="specification">Specification</option>
                    <option value="compatibility">Compatibility</option>
                    <option value="feature">Feature</option>
                  </select>
                  <input className="text-field" value={manualTagDraft.displayName} onChange={(e) => setManualTagDraft((current) => ({ ...current, displayName: e.target.value }))} placeholder="Display name" />
                  <input className="text-field" value={manualTagDraft.canonicalId} onChange={(e) => setManualTagDraft((current) => ({ ...current, canonicalId: e.target.value }))} placeholder="canonical_id" />
                  <input className="text-field" value={manualTagDraft.groupName} onChange={(e) => setManualTagDraft((current) => ({ ...current, groupName: e.target.value }))} placeholder="Group" />
                  <textarea className="compact-area" value={manualTagDraft.aliases} onChange={(e) => setManualTagDraft((current) => ({ ...current, aliases: e.target.value }))} placeholder="Alias eller synonymer, separera med radbrytning eller komma" />
                  <button className="primary-button" onClick={saveCanonicalTag} disabled={adminActionStatus === 'saving'}>
                    <Save size={16} /> {adminActionStatus === 'saving' ? 'Sparar...' : 'Spara canonical tag'}
                  </button>
                </div>
                <div className="info-box">
                  <strong>Governance-regler</strong>
                  <p>Adminvyn följer nu samma modell för alla tre spår: `specification`, `compatibility` och `feature`. Nya värden ska helst först matcha mot kända canonical tags eller alias. Om ingen träff finns skickas kandidaten till review-kön där du kan godkänna, avslå eller göra om den till en ny canonical tag.</p>
                </div>
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

            <Section title="Prompt-preview" subtitle="Visar promptmallarna i klartext, låter dig redigera dem och renderar aktuell preview för vald produkt." icon={BrainCircuit} right={importedSources.length ? <Badge tone="accent">LLM-ready</Badge> : <Badge tone="warning">Import krävs</Badge>}>
              <div className="button-row">
                <button className="primary-button" onClick={applyPromptTemplates}><Save size={16} /> Applicera promptmallar</button>
                <button className="secondary-button" onClick={resetPromptTemplates}><RefreshCcw size={16} /> Återställ standardprompter</button>
              </div>
              {promptTemplatesDirty && (
                <div className="warning-box">
                  <strong>Promptutkastet används inte ännu</strong>
                  <div className="small">Previewn fortsätter visa de applicerade promptmallarna tills du klickar `Applicera promptmallar`, `Spara / bygg om` eller `Läs in RAW-data`.</div>
                </div>
              )}
              <div className="info-box">
                <strong>Stödda placeholders</strong>
                <p><code>{'{{rawUrl}}'}</code>, <code>{'{{slug}}'}</code>, <code>{'{{title}}'}</code>, <code>{'{{highlightLines}}'}</code>, <code>{'{{specificationLines}}'}</code>, <code>{'{{compatibilityLines}}'}</code>, <code>{'{{rawExcerpt}}'}</code>, <code>{'{{referenceContext}}'}</code>, <code>{'{{knownTaxonomyContext}}'}</code>, <code>{'{{maxSpecTags}}'}</code>, <code>{'{{maxFeatureTags}}'}</code>.</p>
              </div>
              <div className="split-grid">
                <div className="field-stack">
                  <label>RAW-promptmall</label>
                  <textarea className="code-area" value={draftPromptTemplates.raw} onChange={(e) => setDraftPromptTemplates((current) => ({ ...current, raw: e.target.value }))} />
                </div>
                <div className="field-stack">
                  <label>Referens-promptmall</label>
                  <textarea className="code-area" value={draftPromptTemplates.reference} onChange={(e) => setDraftPromptTemplates((current) => ({ ...current, reference: e.target.value }))} />
                </div>
              </div>
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
                    <strong>Promptstrategi</strong>
                    <p>Steg 1 använder bara produktens egen RAW-sida för att extrahera fakta och preliminära taggar. Steg 2 använder matchade externa referenser för att normalisera benämningar, kategorier och taggvokabulär utan att skriva över tydliga produktfakta.</p>
                  </div>
                  <div className="info-box">
                    <strong>Matchade referenser</strong>
                    {matchedPromptReferences.length ? (
                      <div className="list-stack compact">
                        {matchedPromptReferences.map((reference) => (
                          <div className="row-item" key={reference.referenceUrl}>
                            <strong>{reference.title}</strong>
                            <div className="muted small">{reference.domain} · {reference.sourceType}</div>
                            <div className="muted small">{reference.matchedTerms.join(', ') || 'allmän benchmarkmatch'}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p>Inga tydliga referenser matchade den här produkten ännu.</p>
                    )}
                  </div>
                  <div className="field-stack">
                    <label>Renderad RAW-prompt</label>
                    <textarea className="code-area" readOnly value={rawPromptPreview} />
                  </div>
                  <div className="field-stack">
                    <label>Renderad referens-prompt</label>
                    <textarea className="code-area" readOnly value={referencePromptPreview} />
                  </div>
                </>
              ) : (
                <div className="empty">Promptmallarna kan redigeras redan nu. Kör sedan RAW-import för att rendera dem med verkligt produktinnehåll och matchade externa referenser i stället för bara sluggen.</div>
              )}
            </Section>

            <Section title="Kandidatförslag" subtitle="Visar taggar från aktuell import som ännu inte matchar kända canonical tags eller alias." icon={ListChecks} right={<Badge tone={candidateSuggestions.length ? 'warning' : 'success'}>{candidateSuggestions.length} öppna</Badge>}>
              {candidateSuggestions.length ? (
                <div className="list-stack compact">
                  {candidateSuggestions.map((candidate) => (
                    <div className="row-item" key={`${candidate.key}-${candidate.sourceRef}-${candidate.candidateValue}`}>
                      <div className="group-row">
                        <div>
                          <strong>{candidate.candidateValue}</strong>
                          <div className="muted small">{candidate.key} · föreslagen grupp: {candidate.suggestedGroup}</div>
                          <div className="muted small">{candidate.sourceTitle}</div>
                        </div>
                        <button className="secondary-button" onClick={() => queueCandidate(candidate)} disabled={adminActionStatus === 'saving'}>
                          <Gavel size={16} /> Till review
                        </button>
                      </div>
                      <div className="info-box compact-box">
                        <strong>Evidens</strong>
                        <p>{candidate.evidence}</p>
                        <div className="muted small">{candidate.reason}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty">Aktuell import matchar kända canonical tags eller alias. Inga nya kandidater hittades just nu.</div>
              )}
            </Section>

            <Section title="Review-kö" subtitle="Här beslutar du om nya specs, passar till/med-värden och funktioner ska bli canonical tags eller avslås." icon={Gavel} right={<Badge tone={pendingReviewItems.length ? 'warning' : 'success'}>{pendingReviewItems.length} väntar</Badge>}>
              <div className="split-grid">
                <div className="list-stack compact">
                  {(adminState?.reviewQueue ?? []).length ? (
                    (adminState?.reviewQueue ?? []).map((item) => (
                      <button key={item.id} className={selectedReviewItem?.id === item.id ? 'review-item active' : 'review-item'} onClick={() => setSelectedReviewId(item.id)}>
                        <div className="group-row">
                          <div>
                            <strong>{item.candidateValue}</strong>
                            <div className="muted small">{item.tagKey} · {item.suggestedGroup ?? 'utan grupp'}</div>
                          </div>
                          <Badge tone={item.status === 'approved' ? 'success' : item.status === 'rejected' ? 'default' : 'warning'}>{item.status}</Badge>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="empty">Review-kön är tom.</div>
                  )}
                </div>
                <div>
                  {selectedReviewItem ? (
                    <div className="field-stack">
                      <label>Valt review-item</label>
                      <div className="info-box compact-box">
                        <strong>{selectedReviewItem.candidateValue}</strong>
                        <div className="muted small">{selectedReviewItem.tagKey} · {selectedReviewItem.reason}</div>
                        <p className="small">{typeof selectedReviewItem.evidence?.evidence === 'string' ? selectedReviewItem.evidence.evidence : 'Ingen evidensrad sparad.'}</p>
                      </div>
                      <input className="text-field" value={reviewDecisionDraft.displayName} onChange={(e) => setReviewDecisionDraft((current) => ({ ...current, displayName: e.target.value }))} placeholder="Display name" />
                      <input className="text-field" value={reviewDecisionDraft.canonicalId} onChange={(e) => setReviewDecisionDraft((current) => ({ ...current, canonicalId: e.target.value }))} placeholder="canonical_id" />
                      <input className="text-field" value={reviewDecisionDraft.groupName} onChange={(e) => setReviewDecisionDraft((current) => ({ ...current, groupName: e.target.value }))} placeholder="Group" />
                      <textarea className="compact-area" value={reviewDecisionDraft.aliases} onChange={(e) => setReviewDecisionDraft((current) => ({ ...current, aliases: e.target.value }))} placeholder="Alias som ska följa med vid godkännande" />
                      <div className="button-row">
                        <button className="primary-button" onClick={() => decideReviewItem('approved')} disabled={adminActionStatus === 'saving'}>
                          <ShieldCheck size={16} /> Godkänn som canonical
                        </button>
                        <button className="secondary-button" onClick={() => decideReviewItem('rejected')} disabled={adminActionStatus === 'saving'}>
                          <Gavel size={16} /> Avslå förslag
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="empty">Välj ett review-item för att godkänna eller avslå det.</div>
                  )}
                </div>
              </div>
            </Section>

            <Section title="Canonical registry" subtitle="Sök bland kända specifikationer, kompatibilitetsmål och funktioner inklusive alias." icon={Tags} right={adminState ? <Badge tone="accent">{filteredRegistryTags.length} synliga</Badge> : <Badge tone="warning">Laddar</Badge>}>
              <div className="toolbar compact-toolbar">
                <div className="pill-row">
                  <Pill active={selectedAdminTagKey === 'all'} onClick={() => setSelectedAdminTagKey('all')}>Alla</Pill>
                  <Pill active={selectedAdminTagKey === 'specification'} onClick={() => setSelectedAdminTagKey('specification')}>Specification</Pill>
                  <Pill active={selectedAdminTagKey === 'compatibility'} onClick={() => setSelectedAdminTagKey('compatibility')}>Compatibility</Pill>
                  <Pill active={selectedAdminTagKey === 'feature'} onClick={() => setSelectedAdminTagKey('feature')}>Feature</Pill>
                </div>
                <div className="search-box compact-search">
                  <Search size={16} />
                  <input value={registrySearch} onChange={(e) => setRegistrySearch(e.target.value)} placeholder="Sök label, id eller alias" />
                </div>
              </div>
              {filteredRegistryTags.length ? (
                <div className="list-stack compact">
                  {filteredRegistryTags.map((tag) => (
                    <div className="row-item" key={`${tag.tagKey}-${tag.canonicalId}`}>
                      <div className="group-row">
                        <div>
                          <strong>{tag.displayName}</strong>
                          <div className="muted small">{tag.tagKey} · {tag.canonicalId} · {tag.groupName ?? 'utan grupp'}</div>
                        </div>
                        <Badge tone={tag.status === 'approved' ? 'success' : 'warning'}>{tag.status}</Badge>
                      </div>
                      <div className="pill-row">
                        {tag.aliases.length ? tag.aliases.map((alias) => <span className="mini-tag soft" key={`${tag.canonicalId}-${alias}`}>{alias}</span>) : <span className="muted small">Inga alias sparade</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty">Ingen canonical tag matchade ditt filter just nu.</div>
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
                            ? (referenceMatchesByProduct.get(product.id) ?? []).map((reference) => <span className="mini-tag soft" key={`${product.id}-${reference.referenceUrl}`}>{reference.title} · {reference.sourceType}</span>)
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
