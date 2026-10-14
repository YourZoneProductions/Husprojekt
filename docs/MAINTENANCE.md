# Husprojekt: drift og videreudvikling

## Kilder og adgang
- Hovedprojekt: https://github.com/YourZoneProductions/Husprojekt (Next.js, npm-lockfil).
- Privat live-app: https://husprojekt-rasmus.tangyghost16.chatgpt.site
- Sites-projekt: appgprj_6acf15c9e0c4819184607009f0e68831. Hostingkilden bruger Vinext og pnpm, men deler app/, components/ og lib/supabase/ med hovedprojektet.
- Supabase-projekt: ukgynmqtcllypvkwxipp. Brug den tilsluttede Supabase-integration. Ingen tokens eller adgangskoder i kode eller dette dokument.
- Hent altid aktuelle filer og projektstatus. Scratchstier fra tidligere samtaler er ikke vedvarende adgang.

## Arbejdsgang
1. Læs den seneste version af dette dokument i GitHub og hostingkilden, de åbne pull requests og Sites' aktuelle version. Afklar eventuelle forskelle før ændringer. Genbrug eksisterende grene og PR'er frem for dubletter.
2. Kontrollér Supabases projektstatus og lav en lille læseforespørgsel mod appens tabeller. Verificér at uautoriserede roller ikke kan læse husdata. Dette er en driftstest, ikke en garanti mod gratisplanens inaktivitetspause.
3. Vælg næste ufærdige, afgrænsede opgave. Ingen ændringer af eksisterende brugerdata for at demonstrere funktioner. Brug simulerede data til tests.
4. Gem fælles appændringer i GitHub på en separat gren og en opdateret PR. Flet ikke i main uden brugerens udtrykkelige godkendelse af fletningen. GitHub-repoet er offentligt: ingen persondata, databasedumps eller nøgler må committes.
5. Kør relevante komponenttests, TypeScript, lint og build i Next-projektet. I hostingkilden bruges Sites' build og workflowhjælpere; bevar hostingidentitet, privat adgang og runtimekonfiguration. Ingen ændring af adgangsmodel eller nye betalte tjenester.
6. Kopiér kontrollerede fælles appændringer til hostingkilden, bevar Sites-specifikke build-, lib- og runtimefiler, og udgiv til det eksisterende private Site. Kontrollér deploymentens slutstatus.
7. Opdatér opgavestatus i begge kilder og noter hvad der blev testet og eventuelle begrænsninger. Besked til brugeren på dansk ved en ny leverance eller et problem, der kræver handling. Ingen beskeder til andre personer.
8. Ved manglende forbindelse eller fejl: undlad at påstå succes. Beskriv konkret blokering. Nulstil aldrig databasen, deaktivér ikke RLS, og opret ikke nye brugere som genvej.

## Prioriteret opgavekø
- [x] Privat upload af PNG/JPG/WebP (maks. 10 MB) pr. etage, visning/zoom og valg af tidligere versioner. Upload ændrer ingen rum eller projekter.
- [ ] Plantegninger, næste del: forslag til rumgrænser, navne og m² med brugerens godkendelse. Automatisk billedanalyse er ikke tilsluttet; ingen betalt tjeneste uden godkendelse. Der er endnu ingen rigtige tegninger i floor_plans til at afprøve analysen på.
- [x] Budget og delopgaver bruger fælles data; aktive projekter kan åbnes fra overblik.
- [x] Mobil: responsiv menu som forbliver åben, læsbare økonomifelter og formularer uden vandret rulning.
- [x] Projektredigering: navn, budget, start/slut og status; validering og direkte opdatering af oversigter.
- [x] Delopgaver: synlige fejlbeskeder, gemmestatus og kontrol af ugyldige beløb.
- [x] Loginside og nulstilling: danske tekster og testet callback.
- [ ] Bekræft produktions-URL i Supabase-indstillinger og gennemfør rigtig e-mailtest. Brugeren har bekræftet, at normalt login til live-appen virker.
- [x] Menu: vis antal aktive projekter pr. rum.
- [ ] Standardskabeloner til projekter, fx køkken, uden automatisk at oprette opgaver i brugerens hus.
- [ ] Plantegninger med klikbare rum og zoom. Find og verificér originale plantegningsfiler eller eksisterende floor_plans-data; opfind ikke geometri eller rumplaceringer. Hvis filer mangler, markér opgaven blokeret og fortsæt en uafhængig opgave.
- [ ] Billeder/dokumenter pr. projekt med private Storage-politikker og validerede filgrænser.
- [ ] Samlet tidsplan og visning af deadlines på tværs af rum.
- [x] Kontrolleret gennemgang af husmedlemskab og RLS med isolerede, tilbagerullede tests.
- [ ] Senere deling: eksplicitte, afgrænsede læserettigheder og tilbagekaldelse.
- [ ] Downloadbar app efter stabil webbasis.

## Seneste verificerede udgangspunkt
2026-10-14: Brugeren kan logge ind og se det eksisterende hus på live-siden. Supabase ACTIVE_HEALTHY, 1 hus, 2 etager og 19 rum. PR #1 blev flettet i main med brugerens udtrykkelige godkendelse. Første live-kildecommit: 476089444664be0d0681a08c92f3c58eb5b81192. Tidligere kode- og komponentchecks bestået; fuld browser-QA er ikke udført i denne kørsel.

## Leverance under kontrol 2026-10-14
Mobilmenu, projektredigering og synlige gemmefejl er implementeret. Komponenten testes med simulerede databasekald via `npm run test:components`, herunder fejlede writes og validering. Ingen ændringer i brugerens husdata er nødvendige for testen. PR #1 er flettet; fremtidige fletninger kræver særskilt godkendelse.

## Plantegninger, første del – 2026-10-14
- Private filer ligger i Storage-bucket `floor-plans`, stier `<floor-id>/<tilfældig uuid>.<png|jpg|webp>`. Adgang kræver login og medlemskab af huset via etagen. Ingen public URL eller service role i klienten.
- Versioner tilføjes som nye rækker i den eksisterende `floor_plans`-tabel. Hver upload får ny filsti; ingen eksisterende billeder, rum, m² eller projekter overskrives. Kun den nye fil ryddes op, hvis metadata ikke kunne gemmes.
- Filer hentes med brugerens login via `storage.download`; browserens lokale blob-URL frigives ved versions-/etageskift. Ingen signerede URL'er gemmes i databasen.
- PDF og automatisk rumgenkendelse er ikke understøttet endnu; det vises i UI. Udvikl forslag/godkendelse som næste del uden at kalde denne uploadversion automatisk analyse.
- Tilføjet migration `20261014070848_private_floor_plan_storage.sql`, som allerede er anvendt på det tilknyttede Supabase-projekt. Ændringen opretter kun bucket og afgrænsede Storage-politikker. Anvend ikke migrationen igen på samme projekt. Rummene er uændrede.
- `npm run test:components` kører nu også floor-plans-testen med simulerede kald: filsignatur/MIME/størrelse, fejlet upload, oprydning, privat download, historik, etageskift, zoom og retry. Next-build, lint og TypeScript samt Sites-build kontrolleres før udgivelse. Ingen testfiler eller testmetadata skrives i brugerens rigtige hus.
- Projektguidens næste del skal afdække følgearbejde via betingede spørgsmål (flytning af vask, vægge, installationer osv.), før brugeren vælger delopgaver. Formålet er overblik og realistisk budget; ingen prisgaranti eller nye betalte AI-tjenester.

## Egne konti og boliger – 2026-10-14
- Nyeste brugerprioritet: en webapp hvor hver bruger opretter egen konto og bolig med egne rum, projekter og budgetter. Deling med bank/håndværker kommer senere med udtrykkelige rettigheder til udvalgte data. Downloadbar app/PWA kommer efter stabil webbasis.
- Implementeret dansk oprettelse/login, e-mailbekræftelses-callback (PKCE-kode og token_hash), sikre tilladte returadresser og tom bolig ved første login. En ny konto får ingen af Rasmus' data. Etager og rum kan tilføjes; m² er valgfrit og manuelt angivet.
- Første bolig oprettes atomisk via `create_initial_house`; gentagne kald for samme konto returnerer eksisterende medlemsbolig. Direkte oprettelse af medlemskab er fjernet. Deling/invitationer er ikke implementeret. UI vælger fortsat én medlemsbolig; flere boliger pr. konto er en senere udvidelse.
- Migration `20261014134321_secure_account_onboarding.sql` er allerede anvendt på Supabase. Den lukker selvtilmelding til vilkårlige hus-id'er og forhindrer projekt/rum-koblinger på tværs af huse. Den ændrer ingen eksisterende husdata. Må ikke køres igen på dette projekt.
- `tests/account-isolation.sql` bruger syntetiske auth-/husdata i én transaktion med ROLLBACK: isolerede læsninger, idempotent oprettelse, afvist medlemskabsbypass, afvist anonym oprettelse og afvist projekt/rum på tværs af huse, også ved legitimt medlemskab af begge. Testen er kørt og bestået; ingen testkonti blev gemt.
- Komponenttest dækker oprettelse, fejl/retry, duplikerede boligindsendelser, etage-/rumtilknytning, decimalareal og e-mailbekræftelsesnavigation. Fortsat ingen fuld browser-/rigtig e-mailtest i denne kørsel.
- Siden forbliver privat og kun tilgængelig for ejeren via Sites. Andre brugere kan derfor ikke besøge oprettelsesflowet endnu. Offentlig adgang eller konkrete testbrugere kræver særskilt ændring af Sites-adgang. Kontrollér Supabases tilladte redirect-URL'er og gennemfør en rigtig e-mailtest før invitation af andre.
- Næste afgrænsede arbejde: verificeret testbrugerforløb og derefter afgrænset deling med læseadgang/tilbagekaldelse, før tilbud og rollebaserede skriveadgange. Fortsæt også plantegningsforslag og betinget køkkenguide uden betalt AI.

## Flere etager ved boligoprettelse – 2026-10-14
- Brugeren har bekræftet mobilfunktion og testkontoens adskilte tomme bolig. Ny brugerpræference: præcis stavning `1. Sal` og `2. Sal`.
- Boligoprettelse tilbyder Kælder, Stueetage (forvalgt), 1. Sal, 2. Sal og en etage med eget navn. Mindst én etage kræves; tomme eller dobbelte navne afvises. Flere etager kan stadig tilføjes senere.
- Ny RPC `create_house_with_floors` opretter bolig, ejermedlemskab og alle valgte etager i én transaktion. Samme brugerlock som den oprindelige RPC sikrer idempotens også mellem gamle/nye klienter. Gamle RPC bevares; eksisterende boliger ændres ikke.
- Migration `20261014201627_multi_floor_onboarding.sql` er allerede anvendt på Supabase. `tests/multi-floor-isolation.sql` består med ROLLBACK: fire etager i korrekt navngivning/rækkefølge, eget navn, idempotens, adgangsadskillelse og anonym afvisning. Ingen testdata gemt.
- Komponenttests dækker standardvalg, 1. Sal/2. Sal, ingen valgte etager og eget navn. TypeScript og builds kontrolleres før privat udgivelse. Browser-QA ikke tilgængelig i denne kørsel.

## Etager og områder – 2026-10-14
- Oprettelsen bruger nu begrebet Etager og områder. Alle valgte standarders navne er redigerbare, og flere egne områder (garage, skur, have osv.) kan tilføjes/fjernes før oprettelsen. Standardnavne 1. Sal og 2. Sal bevares.
- Menu og formular til senere tilføjelse anvender samme begreb. Det er fortsat eksisterende floors/rooms-model og atomisk create_house_with_floors; ingen databaseskemaændring eller omdøbning af eksisterende data. Denne leverance tilføjer ikke efterfølgende omdøbning af gemte områder.
- Tests dækker flere egne områder, omdøbning ved oprettelse og eksisterende budget/projekt/uploadfunktioner. TypeScript, lint og begge builds kontrolleres; ingen browser-QA tilgængelig.

## Gantt-tidslinje – 2026-10-14
- Samlet tidslinje i boligoverblik og projekttidslinje med delopgaver i valgt projekt. Begge bruger samme localProjects som budget og eksisterende formularer; ændringer opdaterer tidslinjen direkte.
- Projekters expected_start/expected_end vises som perioder. Delopgaver har kun due_date i nuværende model og vises som fristpunkter; ingen opdigtet start/varighed eller schemaændring. Én kendt projektdato vises også som punkt med tydelig tekst.
- Samme danske dagsdato og eksisterende definition af forsinkelse: uafsluttet + frist før i dag. Rød forsinket, gul frist i dag, grøn afsluttet; status og datoer står også som tekst. Projektoverskridelse vises med stiplet forlængelse til i dag. Manglende/ugyldige datoer markeres uden at skjule rækker.
- Hele den kendte periode og i dag indgår i aksen. På mobil kan kun selve tidslinjen rulles vandret. Ingen afhængigheder, automatisk flytning eller træk af datoer endnu. Næste tidsplandel: eksplicit startdato/varighed for delopgaver og kortere periode/zoom ved lange tidsplaner.
- tests/timeline.cjs dækker datoer/skudår, perioder, fristpunkter, overskredet/i dag/afsluttet, ukendte datoer, ugyldige intervaller og re-render. Eksisterende komponenttests, TypeScript, lint og Next-/Sites-build kontrolleres. Ingen testwrites i brugerens hus; browser-QA ikke tilgængelig.
