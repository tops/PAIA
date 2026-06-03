# PAI – Driftsättning & Arkitektur

Detta dokument beskriver hur PAI-projektet är driftsatt i Google Cloud/Firebase samt hur du bygger och uppdaterar systemet framöver.

---

## 🏗️ Arkitekturöversikt

Projektet använder en **serverlös arkitektur** (serverless) som körs helt inom Google Clouds gratisnivåer (Spark/Free Tier):

1. **Hemsida (Frontend)**: 
   * Byggd med React, TypeScript och Vite.
   * Driftsatt på **Firebase Hosting** för snabb, global laddningstid (CDN) och gratis SSL (HTTPS).
   * **Live-URL**: [https://paia-2026.web.app](https://paia-2026.web.app)

2. **Claims-databas (Lagring)**:
   * Den genererade JSON-databasen över claims lagras i en offentligt läsbar Google Cloud Storage-bucket (med CORS aktiverat).
   * Hemsidan hämtar denna fil dynamiskt vid uppstart.
   * **Fil-URL**: [https://storage.googleapis.com/pai-claims-data-2026/imported_claims.json](https://storage.googleapis.com/pai-claims-data-2026/imported_claims.json)

3. **Löpande Bevakning (Skrapare)**:
   * Skrapningslogiken (`scripts/fetch_all_sources.js`) är paketerad i en Docker-container och körs som ett **Cloud Run Job** (`pai-scraper-job`) i regionen `europe-west1`.
   * Ett schemalagt jobb i **Cloud Scheduler** triggar skraparen automatiskt **varje natt kl. 04:00 (Stockholms-tid)**.
   * Skraparen laddar ner befintlig JSON-fil från GCS, söker av Riksdagens API och andra källor efter nya AI-uttalanden, klassificerar dem automatiskt och laddar upp den uppdaterade filen till GCS igen.

---

## 🚀 Driftsättning & Kommandon

### 1. Uppdatera Hemsidan (Frontend)
Om du eller AI-assistenten har gjort kodändringar i källkoden (`src/` osv.) och vill publicera dem på live-sajten:

```bash
# 1. Bygg produktions-koden (kompilerar och minifierar till /dist)
npm run build

# 2. Driftsätt till Firebase Hosting
npx firebase deploy --only hosting
```

### 2. Uppdatera Skraparen (Cloud Run Job)
Om du ändrar i skrapningslogiken (`scripts/fetch_all_sources.js`) eller lägger till nya sökord:

1. Kör följande deploy-skript som skapats i projektet:
   ```bash
   node scripts/deploy_scraper.js
   ```
2. Skriptet kommer automatiskt att:
   * Paketera källkoden och ladda upp den till GCS.
   * Starta ett bygge i **Google Cloud Build** (som bygger Docker-containern direkt i molnet).
   * Uppdatera Cloud Run-jobbet (`pai-scraper-job`) med den nya container-avbildningen.
   * Verifiera/uppdatera Cloud Scheduler-triggern.

*(Detta kräver att du är inloggad lokalt på din dator via `npx firebase login`).*

### 3. Köra Skraparen Lokalt (Utveckling)
Om du vill testa skraparen lokalt på din dator:

```bash
# Kör skraparen (sparar resultatet lokalt i /public/imported_claims.json)
npm run fetch-data
```

---

## ⚙️ Google Cloud Projektinställningar

* **GCP Project ID**: `pai-monitor-2026`
* **GCP Project Number**: `68299174428`
* **GCS Storage Bucket**: `pai-claims-data-2026`
* **Cloud Run Region**: `europe-west1`
* **Artifact Registry Repo**: `pai-repo`
