# Product Taxonomy Codex Demo

Detta är ett litet React/Vite-projekt för att testa dynamisk kategoribyggnad från RAW-länkar.

## Vad som är förbättrat

- `Spara / bygg om` i adminläget
- separata taggspår för:
  - **specifikationer**: används för filtrering, t.ex. HDMI, Ethernet, 85W, VGA, SD-kortläsare, färg, layout
  - **funktioner**: används för sammanhang, navigation och relaterade produkter, t.ex. trådlös, resevänlig, skärmanslutning
- förbättrad layout-detektion för tangentbord:
  - `nordisk`
  - `nordic layout`
  - `nordic-layout`
  - `us eng layout`
  - `us english`
  - `us-layout`
  - `amerikansk layout`
- mindre dubbel-fallback i trädet:
  - huvudfallback: `Fler tillbehör`
  - underfallback: `Blandat` / `Fler undergrupper`

## Starta

```bash
npm install
npm run dev
```

För att köra den serverade Railway-versionen lokalt:

```bash
npm run build
npm run start
```

## Deploy på Railway

Projektet innehåller `railway.json` och en liten Node-server som både:

- serverar den byggda `dist/`-appen
- exponerar `/api/import-raw` för att hämta verkligt RAW-innehåll från produktsidor
- hämtar externa referens-URL:er som benchmarkkontext
- exponerar `/api/health` för Railways healthcheck

```bash
npm run build
npm run start
```

## Rekommenderat nästa steg i Codex

1. Lägg in ett separat normaliseringslager för:
   - color
   - layout
   - wattage
   - connectivity
   - compatibility
2. Koppla detta till era riktiga LLM-prompter.
3. Exportera resultat till JSON/CSV.
4. Lägg till visning av kategori-förslag och taxonomy-versioner.

## Viktiga filer

- `src/lib/catalog.ts` — all nuvarande logik för parsing, taggning och taxonomy
- `src/lib/rawPipeline.ts` — parsing från verkligt RAW-innehåll + prompt-preview
- `src/App.tsx` — adminvy och kundvy
- `server.mjs` — backend för RAW-import och servering i Railway
- `src/lib/demoData.ts` — defaultdata och settings
