# AI-Politik v3: Positionsbevakning

Detta är ett webbaserat analysverktyg för att följa, utvärdera och jämföra partiernas ställningstaganden och förslag kring artificiell intelligens (AI) inför riksdagsvalet 2026.

## 📖 Dokumentation & Transparens

För full transparens gällande verktygets underliggande logik, se vår systembeskrivning:
* 📄 **[Systembeskrivning & Transparensrapport (transparens.md)](file:///Users/tops/Documents/Antigravity/PAI/docs/transparens.md)**

I transparensrapporten hittar du detaljerade beskrivningar av:
1. Hur källor samlas in (Riksdagens API + externa källor).
2. Hur påståenden (*claims*) extraheras och delas upp i analysspår.
3. De 12 AI-politiska dimensionerna.
4. Den matematiska poängsättnings- och viktningsmodellen för påståenden och partiprofiler.
5. Agendatryck och gap-analyser.
6. Systemets kvalitetssäkring (QA).

---

## 🛠️ Komma igång (Skript)

Projektet är byggt med React, TypeScript och Vite. Följande kommandon finns tillgängliga:

### 1. Starta utvecklingsserver
Startar en lokal utvecklingsserver med Hot Module Replacement (HMR):
```bash
npm run dev
```

### 2. Hämta och uppdatera data
Kör den löpande positionsbevakningen. Skriptet söker av Riksdagens API för riksmöten 2018/19–2025/26 och läser in färska regeringsbeslut, partiprogram och expertutlåtanden, och sparar ner dem till `imported_claims.json`:
```bash
npm run fetch-data
```

### 3. Kvalitetssäkring (QA)
För att köra kvalitetssäkringen och verifiera dimensioner, partikopplingar samt lyfta fram kalibrerade dokument:
```bash
node scripts/quality_assurance.cjs
```

### 4. Bygg för produktion
Kompilerar TypeScript-koden och paketerar projektet till produktionsfiler i katalogen `/dist`:
```bash
npm run build
```

### 5. Förhandsgranska produktionsbygge
Kör en lokal server som serverar det färdigbyggda paketet från `/dist`:
```bash
npm run preview
```
