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

## Deploy på Railway

Projektet innehåller `railway.json` och kan deployas direkt från GitHub i Railway.

```bash
npm run build
npm run start
```

## Rekommenderat nästa steg i Codex

1. Byt ut slug-baserad parsing mot riktig hämtning av RAW-innehåll.
2. Lägg in ett separat normaliseringslager för:
   - color
   - layout
   - wattage
   - connectivity
   - compatibility
3. Koppla detta till era riktiga LLM-prompter.
4. Exportera resultat till JSON/CSV.
5. Lägg till visning av kategori-förslag och taxonomy-versioner.

## Viktiga filer

- `src/lib/catalog.ts` — all nuvarande logik för parsing, taggning och taxonomy
- `src/App.tsx` — adminvy och kundvy
- `src/lib/demoData.ts` — defaultdata och settings
