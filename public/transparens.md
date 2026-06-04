# Så fungerar Politisk AI-analys: Vår metod och transparens

Välkommen till **Politisk AI-analys**! Det här verktyget är skapat som ett oberoende medborgarinitiativ inför riksdagsvalet 2026. Syftet är att göra det enkelt för dig som väljare att förstå och jämföra hur Sveriges politiska partier ställer sig till den snabba utvecklingen av artificiell intelligens (AI) med hjälp av AI-baserad analys och visualisering.

För att du ska kunna lita på våra analyser är vi helt transparenta med hur vi samlar in materialet, hur vi tolkar politikernas uttalanden och hur den matematiska modellen räknar ut partiernas positioner på vår AI-karta. Här går vi igenom hela vår metod steg för steg!

---

## 1. Hur vi samlar in materialet (Våra källor)

För att ge en rättvisande bild söker vi information både i riksdagens formella register och i den bredare offentliga debatten. Vi letar efter uttalanden från partierna som handlar om hur AI ska användas, utvecklas eller begränsas.

### A. Riksdagens öppna data
Detta är vår viktigaste källa. Ett skript söker automatiskt i riksdagens databas efter dokument från riksmötena **2018/19 fram till idag (2025/26)**. Vi letar efter nyckelord som:
* *Artificiell intelligens* & *AI*
* *Maskininlärning* & *algoritmer*
* *Ansiktsigenkänning* & *biometrisk identifiering*
* *Automatiserat beslutsfattande*
* *Språkmodeller* (t.ex. GPT, LLM)
* *Cybersäkerhet* (kopplat till AI-risker)

Vi analyserar följande typer av dokument från riksdagen:
* **Propositioner:** Regeringens färdiga lagförslag.
* **Motioner:** Förslag från enskilda riksdagsledamöter eller partigrupper.
* **Utskottsbetänkanden:** Beslut och rekommendationer från riksdagens utskott.
* **Skriftliga frågor och svar:** Frågor som riksdagsledamöter ställt direkt till ministrar i regeringen.

### B. Offentliga utspel och debatt
Eftersom partiernas visioner ofta formuleras utanför riksdagens väggar läser vi också:
* **Regeringsbeslut och utredningar:** Exempelvis pressmeddelanden från regeringen om AI-satsningar.
* **Partiprogram och valmanifest:** Officiella texter från partiernas egna hemsidor.
* **Debattartiklar:** Åsiktsartiklar skrivna av ledande politiker på plattformar som DN Debatt eller Altinget.

---

## 2. Vad är ett "påstående" (Claim) och hur tolkar vi det?

Vid insamlingen av dokument identifieras specifika **påståenden** (även kallade *claims*). Ett påstående är ett kort sammanfattat ställningstagande eller förslag. 

Varje påstående sparas med:
1. **Vem som sa det:** Namn på politikern och partitillhörighet.
2. **Källa:** Länk till originaldokumentet så att du kan läsa själv.
3. **Exakt citat:** Det faktiska citatet så att ingenting tas ur sitt sammanhang.
4. **Enkel sammanfattning:** En kort och neutral sammanfattning av vad politikern vill.

### Olika typer av påståenden
Vi delar in uttalandena i olika kategorier för att se *hur* partierna pratar om AI:
* **Problem:** Politiker påpekar en brist (t.ex. *"Sverige halkar efter i AI-forskning"*).
* **Mål:** En vision eller ambition (t.ex. *"Sverige ska bli bäst på att använda AI i välfärden"*).
* **Åtgärd:** Ett konkret politiskt förslag (t.ex. *"Vi vill anslå 500 miljoner kronor till superdatorer"*).
* **Risk:** Varningar för faror (t.ex. *"AI kan kränka medborgarnas integritet"*).

---

## 3. Våra tre politiska axlar (Kompassen)

För att placera partierna på kartan mäter vi deras inställning längs tre oberoende spår. Varje påstående som registreras ges poäng (mellan 0 och 5) på dessa tre axlar:

### 🚀 Främja & Accelerera AI (Acceleration)
* **Vad det betyder:** Att vilja trycka på gasen. Fokus ligger på ekonomisk tillväxt, företagande, internationell konkurrenskraft och att minska krångliga regler för att låta innovationen flöda fritt.
* **Exempel:** *"Vi måste underlätta för företag att utveckla AI-produkter och ta bort onödiga hinder."*

### 🛡️ Reglera & Skydda (Protection)
* **Vad det betyder:** Att vilja sätta upp skyddsräcken. Fokus ligger på etik, mänskliga rättigheter, personlig integritet och att noggrant följa lagar (som EU:s nya AI Act) för att förhindra övervakning och diskriminering.
* **Exempel:** *"Användningen av ansiktsigenkänning i offentliga miljöer måste begränsas för att skydda medborgarnas frihet."*

### 🏛️ Offentlig Styrning (Governance)
* **Vad det betyder:** Att vilja ha staten som motor och samordnare. Fokus ligger på centrala myndighetsbeslut, skattemedel till gemensam digital infrastruktur och att skolan, sjukvården och välfärden ska styras gemensamt för att dra nytta av AI på ett rättvist sätt.
* **Exempel:** *"Staten bör inrätta en ny myndighet för att samordna AI-inköp till alla svenska kommuner."*

---

## 4. Hur räknar vi ut poängen? (Vår matematiska modell)

Alla uttalanden är inte lika mycket värda. En enskild riksdagsledamot som skriver en motion sent på kvällen kan inte väga lika tungt som när hela regeringen fattar ett formellt beslut eller lägger fram en statsbudget.

Därför använder vi en formel för att räkna ut varje påståendes **Totalvikt** (hur mycket det påverkar partiet på kartan):

$$\text{Totalvikt} = \text{Policygrad} \times \text{Källans tyngd} \times \text{Partiförankring} \times \text{Stödjande bevis} \times \text{Granskningsstatus} \times \text{Tidsavtrappning}$$

### De sex byggstenarna i formeln:

1. **Policygrad (Hur skarpt är förslaget?):**
   * *Låg (0.25):* Allmänna visioner eller värderingar.
   * *Medel (0.75):* Standardförslag eller motioner.
   * *Hög (1.00):* Skarpa lagförslag eller budgetbeslut.
2. **Källans tyngd (Var publicerades det?):**
   * Skala 1 till 5. Ett regeringsbeslut ges en 5:a, en partimotion får en 4:a, medan en enskild riksdagsfråga får en 3:a, och debattartiklar/tweets får en 1:a eller 2:a.
3. **Partiförankring (Vem talar?):**
   * En enskild ledamot som driver en egen linje får en lägre faktor (0.4), medan partiledarens eller partistyrelsens officiella linje får högsta faktor (1.0).
4. **Stödjande bevis (evidenceStrength):**
   * Mäter hur väl underbyggt påståendet är med statistik, forskning eller utredningar (omvandlas till en faktor mellan 0.2 och 1.0).
5. **Granskningsstatus (reviewStatus):**
   * Nya påståenden som hämtats in automatiskt men ännu inte kontrollerats har en lägre vikt (0.5). När vi har granskat och bekräftat att text och kategori stämmer får det full vikt (0.8 till 1.0).
6. **Tidsavtrappning (Ålder):**
   * Mäter hur aktuellt påståendet är. Ett färskt påstående från innevarande riksmötesår (2025/26) ges full vikt (1.0), medan äldre ställningstaganden trappas av med **15 % per år** ned till en lägsta viktfaktor på 0.3. Detta förhindrar att historisk politik felaktigt låser fast ett partis nuvarande inställning.

### Skydd mot systemmanipulation (Gaming)

* **Gruppering av överlappande påståenden:** Om samma parti lägger fram flera liknande motioner inom samma ämnesområde (dimension) och med samma nyckelord under samma månad (30-dagarsfönster), grupperar systemet dessa. Endast det tyngsta förslaget ges full vikt, medan efterföljande förslag dämpas kraftigt till **25 %** (faktor 0.25). Detta förhindrar att ett parti kan manipulera sina poäng genom att upprepa samma förslag i många riksdagsdokument.
* **Tuffare krav för Stark Position:** För att ett parti ska uppnå ställningen "Stark position" räcker det inte med hög aktivitet; minst **50 %** av deras bidragande påståenden måste komma från officiella, tunga partikällor (regeringsbeslut eller partiledningsmotioner), inte enskilda ledamöter.

### Detektering av linjebyten
Om ett parti förändrar sina ställningstaganden på någon av de tre ideologiska axlarna med mer än **1.0 poäng** när vi jämför deras politik före 2024 med politiken efter 2024, flaggas detta aktivt i systemet som ett detekterat linjebyte.

### Ideologiska motpoler per dimension
För var och en av de 12 dimensionerna analyserar vi partiernas genomsnittliga placering på de tre ideologiska axlarna (Acceleration, Protection, Governance). Systemet beräknar därefter det ideologiska avståndet mellan alla partier och identifierar automatiskt vilka två partier som står i **störst motpol till varandra** i den specifika frågan.

---

## 5. Vad är ett "politiskt gap" (Gap-analys)?

Politisk AI-analys gör mer än att bara kartlägga partierna. Vi samlar även in "externt agendatryck" – det vill säga vad oberoende experter, forskare, myndigheter och intresseorganisationer varnar för eller föreslår.

Genom att jämföra vad forskare och experter pekar ut som viktigast med vad politikerna faktiskt pratar om, kan vi hitta **politiska gap** (blinda fläckar). 

För att ge en stabil och rättvisande bild av detta gap, oavsett hur stor databasen växer, använder systemet en **relativ normaliseringsmodell** på skalan 0 till 5:

### A. Agendatryck (Externa)
Mäter trycket från externa aktörer (myndigheter, civilsamhälle, fackförbund och forskare/experter) inom respektive dimension. 
* **Beräkning:** Systemet räknar antalet externa ställningstaganden och normaliserar detta linjärt mot den dimension som har allra flest externa inlägg i databasen.
* **Exkludering av riksdagsutskott:** Utskottsbetänkanden exkluderas från agendatrycket eftersom de består av partipolitiker och representerar lagstiftande konsensus snarare än externa oberoende expertkrav.

### B. Partirespons (Index)
Mäter partiernas sammantagna engagemang inom en specifik dimension.
* **Beräkning:** Istället för att bara räkna antal dokument, summerar systemet den sammanlagda totalvikten för alla partiers policyförslag i dimensionen (där skarpa budgetmotioner och förslag väger mycket tyngre än enkla skriftliga frågor).
* **Kvadratrots-skalning (SQRT):** Vissa dimensioner (såsom övergripande politisk AI-styrning) har extrema mängder dokument och fungerar som "outliers" som annars skulle pressa ner alla andra områden till noll. För att motverka detta använder systemet en kvadratrots-normalisering relativt det mest debatterade området:
  $$\text{Partirespons} = 5.0 \times \sqrt{\frac{\text{Dimensionens totala vikt}}{\text{Maximal totalvikt i databasen}}}$$
  Detta ger en mer balanserad och nyanserad spridning av värdena där medelstora valfrågor (t.ex. AI i skolan eller vården) fortfarande framträder tydligt.

### C. Mappning till Gap-bedömning
Genom att jämföra det normaliserade agendatrycket ($A$) med den normaliserade partiresponsen ($P$) delas dimensionerna in i sex kategorier:
* **Etablerad politisk fråga:** Både tryck och respons är högt ($A \ge 2.5$ och $P \ge 2.5$).
* **Tyst valfråga med möjlig sprängkraft:** Det externa trycket är mycket högt men partierna har knappt några förslag ($A \ge 3.0$ och $P < 2.0$).
* **Underutvecklad partipolitik:** Externa aktörer visar medelhögt intresse men partiernas respons är fortfarande låg ($A \ge 2.0$ och $P < 2.5$).
* **Överrepresenterad partidebatt:** Partierna lägger mycket energi på frågan men det externa expertintresset är förhållandevis lågt ($A < 2.0$ och $P \ge 3.0$).
* **Blind fläck:** Båda parter visar mycket lågt intresse ($A < 1.5$ och $P < 1.5$).
* **Balanserad bevakning:** Övriga fall där tryck och respons följs åt på en rimlig nivå.

---

## 6. Kvalitetssäkring och mänsklig kontroll

För att förhindra felaktig information eller missvisande tolkningar använder vi ett system i två steg:

1. **Automatisk granskning (Skript):** En inbyggd programvara söker igenom databasen efter felaktigheter (till exempel om en minister felaktigt klassificerats som en enskild ledamot, eller om en riksdagsledamot kopplats till fel parti).
2. **Mänsklig faktagranskning:** Alla påståenden granskas manuellt av våra analytiker innan de markeras som "verifierade". Vi kontrollerar att citaten stämmer överens med riksdagens officiella protokoll och att tolkningen är neutral och saklig.

---

## 7. Metodologiska begränsningar och källkritik

Ingen matematisk modell kan fullt ut fånga det politiska samtalets alla nyanser. Som användare bör du ha följande begränsningar i åtanke när du läser våra index:

* **Fokuspoäng är inte moraliska betyg:** Betyget (0-5) på de dimensionella korten representerar *detaljrikedom och konkretionsnivå* i partiets förslag – inte hur "bra" eller "moraliskt lämpligt" ett förslag är. Ett parti kan ha 4.8 poäng i etikfrågor eftersom de har lagt fram mycket detaljerade förslag på hur AI-övervakning ska införas, inte för att de värnar personlig integritet.
* **Falsk exakthet:** De decimaltal som visas (t.ex. 3.24) är matematiska medelvärden av kvalitativa redaktionella bedömningar. De bör läsas som övergripande trender och jämförelser snarare än exakta sanningar.
* **Sökordsbegränsningar:** Även om vårt insamlingsskript söker brett, kan vissa viktiga strukturreformer (t.ex. breda högskolesatsningar eller förändringar i sekretesslagstiftning) som i praktiken påverkar AI-utvecklingen missas om de inte innehåller ord som "algoritmer" eller "artificiell intelligens". Vi kompletterar därför databasen med manuella sökningar och granskningar.
* **Mängdbias och relativ profilering (Regeringspartier vs Opposition):** Regeringspartier (särskilt Moderaterna, M) producerar genom regeringskansliet en avsevärt mycket större mängd officiella dokument (propositioner, strategier, kommittédirektiv) än oppositionspartier. Om man enbart räknar absolut vikt eller antal claims blir det missvisande då regeringen framstår som drivande inom nästan alla politikområden. För att motverka denna obalans mäter systemet partiprofileringen per område baserat på **relativt fokus** (hur stor procentuell andel av partiets *egna totala digitala engagemang* som ägnas åt just det området). Detta lyfter fram vad partierna faktiskt prioriterar i sin egen digitala agenda, oavsett om de sitter i regeringsställning eller inte.

*Om du hittar något påstående som du anser är felaktigt eller missvisande kategoriserat, tveka inte att höra av dig till oss! Vårt mål är att ge en så korrekt och opartisk bild som möjligt.*

---

## 8. Testa AI-analysatorn (AI-Lab)

Här kan du testa hur vår automatiska klassificeringsmotor fungerar. Klistra in en politisk text (debattartikel, motion eller uttalande) så försöker systemet automatiskt identifiera ämnesområde, policygrad, källvikt samt beräkna bidrag till de tre ideologiska axlarna. 

Vänligen granska resultaten noggrant. Detta är ett experimentellt lab och alla skarpa påståenden i vår databas genomgår alltid en mänsklig kvalitetsgranskning.

---

## 9. Öppen källkod och GitHub-arkiv

Vi tror att transparens är en grundpelare i ett demokratiskt samhälle. För att vem som helst ska kunna granska vår metodik, granska koden bakom insamlingsskripten och verifiera den matematiska modellen, har vi gjort hela källkoden tillgänglig som öppen källkod.

Du hittar vårt GitHub-repo här: [GitHub - Politisk AI-analys](https://github.com/valet2026/politisk-ai-analys).

### Varför gör vi detta?
* **Oberoende granskning:** Medborgare, journalister och experter kan själva köra koden, läsa formlerna och kontrollera att inga partiska viktningsfaktorer används.
* **Samarbete:** Om du hittar buggar i vår texttolkning eller vill bidra med nya sökord och källor kan du enkelt lämna förslag (pull requests).
* **Demokratiskt ansvar:** Ett system som analyserar folkvalda politikers ställningstaganden bör själv vara helt öppet och fritt från dolda algoritmer.

---

## 10. Skicka feedback

Vi läser allt som kommer in och försöker återkoppla till dig om vi hinner.


