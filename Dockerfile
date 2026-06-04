# Använd en officiell Node.js-avbildning
FROM node:22-slim

# Skapa arbetskatalog
WORKDIR /app

# Kopiera paketfiler
COPY package*.json ./

# Sätt miljövariabel för att undvika Puppeteer-nedladdningar i byggsteget
ENV PUPPETEER_SKIP_DOWNLOAD=1

# Installera endast produktionsberoenden
RUN npm install --omit=dev

# Kopiera skriptkatalog och övriga filer
COPY scripts/ ./scripts/

# Standardkommando för att köra vår Cloud Run wrapper
CMD ["node", "scripts/cloud_run_scraper.js"]
