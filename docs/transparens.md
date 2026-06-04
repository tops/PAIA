# Systembeskrivning och Transparensrapport: AI-Politik v3

Detta dokument beskriver hur systemet **AI-Politik v3** samlar in, analyserar, värderar och kategoriserar politiska påståenden (*claims*) och ställningstaganden gällande artificiell intelligens (AI). 

Rapporten är skapad för att ge användare full transparens i hur partiernas positioner beräknas, hur olika källor vägs, och hur den underliggande analysmodellen fungerar.

---

## 1. Källinsamling (Hur vi hittar källor)

Systemet samlar in data från både formella parlamentariska källor och externa politiska och opinionsbildande kanaler. Detta görs för att fånga både skarp lagstiftningspolitik och det bredare politiska agendatrycket.

### A. Riksdagens API
Det primära datainflödet sker via ett automatiserat skript som söker i Riksdagens öppna data-databas.
* **Tidsspann:** Systemet bevakar riksmöten från och med **2018/19 till innevarande riksmöte (2025/26)** inför valet 2026.
* **Söktermer:** Skriptet söker brett efter AI-relaterade termer för att fånga upp relevanta handlingar:
  * `artificiell intelligens`
  * `maskininlärning`
  * `algoritmer`
  * `ansiktsigenkänning`
  * `automatiserat beslutsfattande`
  * `språkmodeller`
  * `cybersäkerhet`
* **Dokumenttyper:** Vi hämtar och analyserar följande typer av riksdagshandlingar:
  * **Motioner (`mot`):** Riksdagsledamöters eller partiers egna förslag.
  * **Propositioner (`prop`):** Regeringens lagförslag.
  * **Skrivelser (`skr`):** Regeringens rapportering eller strategiska meddelanden.
  * **Utskottsbetänkanden (`bet`):** Riksdagsutskottens ställningstaganden.
  * **Interpellationer (`ip`):** Skriftliga frågor till ministrar som leder till debatt.
  * **Frågor (`frg`):** Skriftliga frågor från ledamöter till statsråd.

### B. Externa källor
Då riksdagshandlingar inte alltid täcker den fulla politiska debatten eller tidiga regeringsbeslut, bevakar systemet även externa informationsflöden:
* **Regeringskansliet:** Pressmeddelanden, kommittédirektiv och presskonferenser (t.ex. beslut om nationella AI-utredningar eller inrättande av beräkningsinfrastruktur).
* **Partiernas officiella kanaler:** Valmanifest, pressrum, partiprogram och officiella utspel.
* **Medier och debatt:** Debattartiklar (t.ex. *DN Debatt*, *Altinget*, *SvD*) skrivna av politiska aktörer, samt remissvar från tunga instanser.
* **Intresseorganisationer & Expertenkäter:** Bidrag från organisationer med stort agendatryck (t.ex. *Almega Techföretagen*, *Sveriges Kommuner och Regioner (SKR)*) samt oberoende AI-forskare.

---

## 2. Claim-extraktion (Hur vi hittar och tolkar påståenden)

När ett källdokument har hämtats analyseras dess textinnehåll (titel, sammanfattning och citat) för att identifiera specifika påståenden (*claims*) och kategorisera dem.

### Spåruppdelning (Tracks)
För att säkerställa att partiernas officiella policyer inte blandas ihop med allmän debatt eller yttre påtryckningar delas alla claims in i tre spår:

1. **Spår A: AI-policy (Policy-claims):** Representerar ett politiskt partis eller regeringsmedlems faktiska förslag, ståndpunkt eller värdering kring hur AI ska styras, finansieras eller regleras. *Endast dessa claims ligger till grund för beräkningen av partiernas politiska index.*
2. **AI-nära frågor (`nearAiFlag`):** Påståenden där AI nämns men inte är kärnfrågan (t.ex. digitalt utanförskap i allmänhet eller kundtjänsteffektivisering). Dessa filtreras bort från partiernas profilindex.
3. **Kampanj & Demokrati (`campaignPracticeFlag`):** Diskussioner om desinformation, trollkonton, påverkanskampanjer och valintegritet (Spår C).
4. **Externt agendatryck (`externalPressureFlag`):** Claims som härrör från icke-politiska externa aktörer (t.ex. expertis, lobbygrupper, myndigheter). Dessa används för att mäta agendatryck och utföra gap-analyser men påverkar inte partiernas egna policy-index.

### Metadata per Claim
Varje identifierat claim lagras som ett standardiserat datakort (`ClaimCard`) med följande nyckelparametrar:
* **Aktör (`actor`):** Den person, det utskott eller parti som gjort uttalandet.
* **Aktörstyp (`actorType`):** Regering, Minister, Riksdagsgrupp, Enskild riksdagsledamot, Myndighet, Intresseorganisation, Expert, etc.
* **Partitillhörighet (`partyAffiliation`):** S, M, SD, C, V, MP, L, KD, eller *Externt* (för icke-partianknutna).
* **Originalcitat (`originalQuote`):** Det exakta textavsnittet från källan.
* **Neutral sammanfattning (`neutralSummary`):** En objektiv tolkning av ståndpunkten.
* **Taggar (`tags`):** Semantiska sökord (t.ex. *AI Act*, *datacenter*, *kompetensförsörjning*).

---

## 3. Kategorisering (AI-dimensioner och typer)

För att kunna jämföra politik inom specifika områden kategoriseras varje claim efter typ och ämnesområde.

### A. De 12 AI-politiska dimensionerna
Systemet mappar varje påstående mot en eller flera av 12 låsta dimensioner som spänner över hela AI-fältet:

| ID | Dimension | Beskrivning |
|:---|:---|:---|
| **1** | Styrning och politiskt ledarskap | Övergripande styrning, nationella AI-strategier, samordning och politiskt ägarskap. |
| **2** | Ekonomi, produktivitet och konkurrenskraft | AI som drivkraft för tillväxt, investeringar och nationell konkurrenskraft. |
| **3** | Infrastruktur, data och beräkningskapacitet | Superdatorer, datacenter, molninfrastruktur och delning av offentliga/privata data. |
| **4** | Reglering, tillsyn och rättssäkerhet | Implementering av AI Act, tillsynsmyndigheter (t.ex. IMY), sandlådor och rättssäkerhet. |
| **5** | Offentlig förvaltning och välfärd | AI-användning i kommuner, regioner och statliga myndigheter för att effektivisera välfärden. |
| **6** | Arbetsmarknad, kompetens och omställning | Utbildningssatsningar (skola, högskola, yrkesutbildning) samt trygghetssystem vid automatisering. |
| **7** | Etik, mänskliga rättigheter och inkludering | Skydd mot diskriminering, etiska riktlinjer, tillgänglighet och mänskliga rättigheter. |
| **8** | Demokrati, medier och informationspåverkan | Trollkonton, desinformation, deepfakes, avsändartransparens och valpåverkan. |
| **9** | Säkerhet, totalförsvar och cyberrisker | Cyberförsvar, geopolitiska risker med utländska AI-modeller, spionage samt militär AI. |
| **10** | Språk, kultur, upphovsrätt | Nationella språkmodeller (GPT-SW3), upphovsrätt för kulturskapare och kulturarv. |
| **11** | Innovation, företagande och kommersialisering | Stöd till start-ups, kommersialisering av AI-forskning och tekniköverföring. |
| **12** | Miljö, energi och hållbarhet | Datacenters energiförbrukning, miljöpåverkan av hårdvara och AI för grön omställning. |

### B. Påståendetyp (`claimType`)
Varje påstående klassificeras som en av följande typer:
* **Problem:** Identifiering av brister eller utmaningar.
* **Mål:** Visioner eller önskade framtida tillstånd utan konkreta verktyg.
* **Åtgärd:** Skarpa, konkreta politiska förslag eller fattade beslut.
* **Risk:** Potentiella hot eller negativa bieffekter av AI.
* **Värdering:** Principiella ställningstaganden eller ideologiska betraktelser.
* **Ansvar:** Diskussion om vem som bär skulden eller ansvaret för ett utfall.

---

## 4. Värdering och Poängsättningsmodell

För att aggregera enskilda påståenden till övergripande partiprofiler använder systemet en matematisk viktning. Detta förhindrar att en enskild riksdagsledamots motion väger lika tungt som ett skarpt regeringsbeslut.

### A. Beräkning av Anspråkets Totalvikt (Claim Weight)
Varje påstående tilldelas en matematisk vikt baserat på följande formel:

$$\text{Totalvikt} = \text{Policygrad-faktor} \times \text{Källvikt} \times \text{Partibärings-faktor} \times \text{Evidens-faktor} \times \text{Gransknings-faktor} \times \text{Tidsavtrappning-faktor}$$

#### 1. Policygrad-faktor (`policyDegree`)
Mäter hur konkret eller skarpt förslaget är:
* **Nivå 0 (Ingen policyverkan):** Vikt = `0.0`
* **Nivå 1 (Låg/Visionär):** Vikt = `0.25`
* **Nivå 2 (Medel/Standardförslag):** Vikt = `0.75`
* **Nivå 3 (Hög/Skarpt förslag/Finansiering/Lagstiftning):** Vikt = `1.0`

#### 2. Källvikt (`sourceWeight`)
Mäter källans formella tyngd (skala 1–5):
* **5 (Högst):** Regeringsbeslut, statsbudget, officiella regeringsstrategier.
* **4 (Hög):** Utskottsbetänkanden, tunga partimotioner (kommittémotioner).
* **3 (Medel):** Enskilda riksdagsmotioner, interpellationsdebatter, skriftliga frågor.
* **1-2 (Låg):** Debattartiklar och enkla pressmeddelanden.

#### 3. Partibärings-faktor (`partyBearing`)
Mäter hur väl förankrat påståendet är i partiorganisationen:
* **Låg:** Enskild ledamot driver en egen linje utan officiellt stöd (Faktor = `0.4`).
* **Medel:** Standardmotion undertecknad av flera ledamöter (Faktor = `0.7`).
* **Hög:** Partiets officiella motion, partiledarutspel eller regeringsbeslut (Faktor = `1.0`).

#### 4. Evidens-faktor (`evidenceStrength`)
Baseras på påståendets underbyggda styrka (skala 1–5):
* Formel: $\text{Evidens-faktor} = \text{evidenceStrength} \times 0.2$ (ger ett värde mellan `0.2` och `1.0`).

#### 5. Gransknings-faktor (`reviewStatus`)
Mäter i vilket skede av granskningsprocessen påståendet befinner sig:
* **Ny (Ogranskad):** Faktor = `0.5`
* **Granskad:** Faktor = `0.8`
* **Kalibrerad / Låst:** Faktor = `1.0`

#### 6. Tidsavtrappning-faktor (`recencyFactor`)
Gamla ställningstaganden tonas ned gradvis för att representera partiets nuvarande linje.
* Formel: $\text{recencyFactor} = \max(0.3, 1 - (2026 - \text{utspelsår}) \times 0.15)$

---

### B. Skydd mot systemmanipulation (Deduplicering)
För att förhindra "fusk" genom upprepade likadana riksdagsmotioner kör systemet en grupperingsalgoritm i beräkningsmotorn:
1. Claims från samma parti och inom samma dimension som har ett tidsavstånd på högst **30 dagar** och delar minst **2 gemensamma taggar** betraktas som överlappande.
2. Dessa claims sammanförs i en klustergrupp.
3. Det påstående i gruppen som har högst basvikt behåller sin fulla vikt (100 %). Alla andra claims i gruppen dämpas med en faktor **0.25** (75 % reduktion).

---

### C. Partiets Positioneringsstatus
Beroende på antal claims och deras sammanlagda vikt klassificeras partiets ställningstagande inom en dimension. 
* **Tuffare krav för Stark Position:** För att nå ställningen "Stark position" krävs att partiet har minst 5 claims, officiell källa, hög partibäring, hög konkretiseringsgrad, samt att minst **50 %** av bidragen är officiella/tunga claims (`partyBearing === 'Hög'` eller `sourceWeight >= 4`), vilket eliminerar spam-motioner från enskilda ledamöter.

---

### D. Politiska Axlar och Dimensionell opposition (Motpoler)
Partiets positioner (0–5) på de tre ideologiska huvudaxlarna (*Acceleration*, *Protection*, *Governance*) beräknas som ett viktat genomsnitt av alla partiers claims:

$$\text{Slutgiltigt Index} = \frac{\sum (\text{Bidrag} \times \text{Totalvikt})}{\sum \text{Totalvikt}}$$

#### Uträkning av dimensionella motpoler:
Systemet aggregerar de ideologiska axlarna specifikt per dimension. För varje dimension $d$ beräknas det tredimensionella avståndet (euklidiskt avstånd) mellan partiernas medelpositioner:

$$\text{Avstånd}(A, B) = \sqrt{(Acc_A - Acc_B)^2 + (Prot_A - Prot_B)^2 + (Gov_A - Gov_B)^2}$$

Det par av partier som har störst avvikelse (avstånd $\ge 0.5$) flaggas i gränssnittet som "Motpoler" för den specifika dimensionen, och den mest polariserade axeln visas.

#### Detektering av linjebyten:
Systemet sparar partiers historiska profiler (claims äldre än 2024-01-01) separat och jämför dem med de nya profilerna. Om skillnaden på någon axel är $\ge 1.0$ poäng, flaggar gränssnittet ett linjebyte.

---

## 5. Agendatryck och Gap-analys

Systemet jämför partiernas aktivitet mot det externa trycket från civilsamhälle, myndigheter och experter för att identifiera "politiska gap" per dimension.

* **Agendatryck (Agenda Pressure):** Beräknas dynamiskt. Externa aktörer som **Fackförbund** och **Civilsamhällesorganisationer** är klassificerade som tunga intressegrupper (`hasHeavyActor = true`) jämställda med *Almega Techföretagen*, *SKR* och statliga myndigheter för att balansera debattbevakningen.
* **Relativt fokus per dimension (Profilering):** För att motverka snedvridning där regeringspartier (särskilt Moderaterna, M) dominerar alla områden på grund av en avsevärt mycket större mängd formella handlingar i databasen, använder systemet relativ prioritering (relativt fokus) för att bestämma vilket parti som är "mest profilerat" i respektive dimension.
  * **Formel:**
    $$F_{parti, dim} = \frac{W_{parti, dim}}{W_{parti}}$$
    där $W_{parti}$ är partiets totala claim-vikt över alla 12 dimensioner, och $W_{parti, dim}$ är partiets sammanlagda claim-vikt inom den enskilda dimensionen (efter deduplicering). Den som har högst $F_{parti, dim}$ utses till det mest profilerade partiet i dimensionen, vilket korrekt speglar hur partiet väljer att fördela sina egna resurser i sin digitala agenda.

---

## 6. Kvalitetssäkring (QA)

För att garantera dataintegritet och förhindra att felaktig eller partisk data smyger in i systemet, genomgår databasen en tvåstegsprocess:

### 1. Automatiserad QA-Monitor (`quality_assurance.cjs`)
Ett node-skript körs regelbundet mot databasen för att upptäcka anomalier.

### 2. Manuell Granskning och Kalibrering
Granskning av citat och källor utförs manuellt innan status uppgraderas till `Granskad` eller `Kalibrerad`.

---

## 7. Metodologiska begränsningar och källkritik

* **Fokuspoäng vs Ståndpunkt:** Dimensionspoängen (0-5) mäter *policy-konkretionsgrad* (detaljnivå i förslag), inte om partiet har en positiv eller negativ moralisk grundsyn på ämnet.
* **Falsk exakthet:** Indexvärden är aggregeringar av redaktionella bedömningar och ska ses som kvalitativa kompassriktningar, inte fysikaliska mätningar.
* **Sökordsselektion:** Systemet kan missa breda strukturreformer (t.ex. energiförsörjning) som inte innehåller sökord som "AI" eller "algoritmer", vilket kompenseras genom manuella kompletteringar av databasen.
* **Mängdbias (Regeringspartier vs Opposition):** Eftersom regeringspartier naturligt genererar en större volym officiella handlingar, normaliserar systemet dimensionsprofileringen genom att mäta **relativt fokus** (dimensionens andel av partiets egna totala claim-vikt) snarare än absolut volym för att ge en balanserad bild av partiernas faktiska profileringar.
