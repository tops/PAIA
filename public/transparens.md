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

$$\text{Totalvikt} = \text{Policygrad-faktor} \times \text{Källvikt} \times \text{Partibärings-faktor} \times \text{Evidens-faktor} \times \text{Gransknings-faktor}$$

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
* **Ny (Ogranskad):** Faktor = `0.5` (används som en säkerhetsmarginal för automatiskt inhämtade claims).
* **Granskad:** Faktor = `0.8` (verifierad text och korrekta metadata).
* **Kalibrerad / Låst:** Faktor = `1.0` (officiella tunga policydokument med full kvalitetssäkring).

---

### B. Partiets Positioneringsstatus
Beroende på antal claims och deras sammanlagda vikt klassificeras partiets ställningstagande inom en dimension enligt följande trappa:

1. **Ingen bedömning:** Färre än 2 claims eller en sammanlagd totalvikt under `0.5`.
2. **Indikation:** Minst 2 claims registrerade.
3. **Preliminär position:** Minst 3 claims samt förekomst av hög källvikt eller hög partibäring.
4. **Fast position:** Minst 3 claims från officiella källor, hög partibäring/källvikt, spridda över minst två olika datum (visar kontinuitet över tid).
5. **Stark position:** Minst 5 claims, officiell källa, hög partibäring, hög konkretiseringsgrad samt minst 2 skarpa förslag på högsta policynivå (nivå 3).

---

### C. Politiska Axlar (Index 0–5)
När alla Spår A-claims har viktats beräknas partiernas genomsnittliga position på tre ideologiska huvudaxlar:

1. **Marknadsacceleration (Acceleration):** Driver partiet på för snabbare AI-användning, avregleringar, innovationsstöd och kommersialisering?
2. **Skydd & Reglering (Protection):** Fokuserar partiet på integritetsskydd, etiska regler, riskminimering, tillsyn och efterlevnad av AI Act?
3. **Statlig Styrning (Governance):** Vill partiet ha centralt samordnad offentlig infrastruktur, statliga investeringar och myndighetsstyrning?

Varje enskilt claim har förkodade bidrag (0-5) på dessa tre axlar. Partiets slutgiltiga index beräknas som ett **viktat genomsnitt** av alla dess claims:

$$\text{Slutgiltigt Index} = \frac{\sum (\text{Bidrag} \times \text{Totalvikt})}{\sum \text{Totalvikt}}$$

Detta ger partierna en placering mellan 0 och 5 på respektive axel.

---

## 5. Agendatryck och Gap-analys

Systemet jämför partiernas aktivitet mot det externa trycket från civilsamhälle, myndigheter och experter för att identifiera "politiska gap" per dimension.

* **Agendatryck (Agenda Pressure):** Beräknas dynamiskt baserat på antalet externa claims i en dimension och aktörernas tyngd (lobbygrupper som SKR/Almega eller myndigheter ger högre agendatryck).
* **Partirespons (Party Response):** Beräknas baserat på partiernas samlade volym och konkretiseringsgrad av claims i samma dimension.

Genom att ställa agendatryck mot partirespons drar systemet följande slutsatser:
* **Blind fläck:** Lågt agendatryck och ingen/låg respons från partierna.
* **Tyst valfråga med möjlig sprängkraft:** Högt externt agendatryck men partierna är passiva eller tysta.
* **Underutvecklad partipolitik:** Medelhögt agendatryck men partiernas svar är svaga eller saknar konkretisering.
* **Etablerad politisk fråga:** Både agendatryck och partiernas respons är hög.
* **Överrepresenterad partidebatt:** Partierna debatterar frågan flitigt trots att det yttre trycket eller expertbehovet är lågt.

---

## 6. Kvalitetssäkring (QA)

För att garantera dataintegritet och förhindra att felaktig eller partisk data smyger in i systemet, genomgår databasen en tvåstegsprocess:

### 1. Automatiserad QA-Monitor (`quality_assurance.cjs`)
Ett node-skript körs regelbundet mot databasen för att upptäcka anomalier:
* **Partitillhörighets-kontroll:** Matchar aktörsnamn mot kända mönster (t.ex. om texten innehåller "Ebba Busch" korrigeras partitillhörigheten automatiskt till KD om den råkat bli fel).
* **Aktörstyp-justering:** Kontrollerar att ministrar och regeringsdokument klassificeras som `Regering` eller `Minister` istället för enskild ledamot.
* **Semantisk dimensionskorrigering:** Skriptet läser citatens ordval (t.ex. ordet "cyber" eller "totalförsvar" tvingar fram dimension 9, medan "skola" eller "kompetens" styr till dimension 6) för att minimera felaktig kategorisering under insamlingen.
* **Gränsvärdes-validering:** Säkerställer att alla poäng och vikter ligger inom sina tillåtna intervall.

### 2. Manuell Granskning och Kalibrering
Innan claims betraktas som fullvärdiga (`Granskad` eller `Kalibrerad`) och får full vikt (faktor 0.8 eller 1.0) granskas de manuellt av en administratör i systemets editor. Här kan citat verifieras mot den länkade källan och missvisande tolkningar korrigeras.
