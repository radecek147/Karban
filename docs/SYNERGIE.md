# Synergie žolíků — velký test kombinací (2026-10-08)

Zadání: projet všechny kombinace žolíků a najít nejsilnější synergie na skóre, na peníze a na škálování. Hra má být
vyvážená, ale pár věcí smí zůstat „rozbitých“ jako v Balatru. Rozhodnutí a úpravy jsou v `docs/DECISIONS.md`
(2026-10-08 „Synergie žolíků“). Všechna čísla platí pro hru **po** úpravách z tohoto testu.

## Shrnutí

- **Nejsilnější motor hry je Fotograf z pouti.** Násobí první figuru ×2 při každé aktivaci, i nad strop opakování.
  S čímkoli, co kartu opakuje (Šťastná sedmička, Dechovka, Volební komise, Hudební automat, Ozvěna, Spartakiáda,
  Fotbalový fanoušek, červená pečeť), roste exponenciálně, nejvýš ×1024 na jedné figuře. Ve dvou žolících dává ×5–17,
  v pěti ×943 proti stejným kartám bez žolíků. Tohle je to „Photochad“, které jsi chtěl: zůstává jako záměrně rozbitá věc.
- **Bez Fotografa je strop o dva řády níž:** nejlepší pětice (Karlův most, Archivář, Silvestr, Dálnice D1, Směnárna)
  dává ×37. Běžní žolíci bez Fotografa mezi sebou výraznou synergii nemají.
- **Ani nejsilnější sestava hru sama nevyhraje.** Na Imperialu (nejtěžší síla piva) vyhrál bot bez zásahu 0 z 20 runů,
  s nejlepšími sestavami vloženými v patře 3 vyhrál 3–5 z 20. Běžný Photochad (Fotograf + Komise + Fanoušek + Automat)
  vyhrál 3 z 20 a jeden run došel do patra 16.
- **Druhá rodina: kopírování ×mult.** Archivář zopakuje epického nebo legendárního souseda: Orloj + Archivář ×10,5,
  Blaničtí rytíři + Archivář ×9, Karlův most + Archivář ×4,5.
- **Rozbité karetní stavby:** Barva z 5 skleněných karet s červenou pečetí a duhovou edicí dá ×81 000 i bez žolíků,
  ocelové karty s červenou pečetí v ruce rostou 2,25× za každou kartu. Jackpoty jako v Balatru, zůstávají.
- **Peníze:** opravdové motory jsou Dechovka + zlaté pečeti (30–57 Kč za kolo) a šťastné karty + Dechovka (~20 Kč za
  kolo). Nový Zlatník a Žebrák sedí přesně v pásmu běžného žolíka (2–3 Kč za kolo).
- **Opraveno a vyváženo:** Fotografa nejde kopírovat (každá kopie zdvojovala exponent: až ×10⁹ na kartě), Sklář šel
  zneužít ke klonování skla, spropitné Průvodce šlo obejít, Pozlacovač dával +9 Kč za kolo (teď +4), Defenestrace ~13 Kč
  za kolo (teď ~6–7).
- **Stabilita:** ~1,2 milionu přesných vyhodnocení skóre a ~150 000 akcí fuzzu s ukládáním a načítáním proběhlo bez
  jediné výjimky, NaN nebo nekonečna. Obtížnost po úpravách: Desítka 34,3 / 34,7 / 31,7 % (pásmo 25–35 %), Imperial
  0,8 / 2,1 / 1,7 % (pásmo pod 3 %).

## Jak jsem testoval

| Metoda                                            | Co přesně                                                                                                                                                                                                                                                                                                                                                       | Rozsah                                                             |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Laboratoř dvojic (`scripts/joker-synergy.ts`)     | Z runů tří botů (max, flush, pairs) jsem vzal stavy při vstupu do Večerky v patře 4 a 8: balíček s vylepšeními, úrovně kombinací, kupóny. U každého stavu je 12 typických rukou a ke každé asi 9 kandidátních tahů. Sestava se skóruje přesně enginem na každém tahu a bere se nejlepší. Škálující žolíci mají zralý stav, změřený vložením do runu od patra 2. | 107 žolíků samostatně, všech 5 671 dvojic v obou pořadích, 9 stavů |
| Paprskové hledání                                 | Nejsilnější sestavy 3–5 žolíků na stavech z patra 8, zvlášť bez legendárních (v obchodě nejsou) a zvlášť bez Fotografa                                                                                                                                                                                                                                          | 3 dávky po 10, pool 46 žolíků                                      |
| Celé runy (`scripts/joker-synergy-runs.ts build`) | Bot hraje Imperial; v patře 3 dostane zadanou sestavu (Přibitou); po výhře pokračuje nekonečný režim                                                                                                                                                                                                                                                            | 12 sestav × 20 seedů                                               |
| Peníze (`scripts/joker-synergy-runs.ts econ`)     | Žolík nebo dvojice od začátku runu; rozdíl vydělaných Kč na vyhrané kolo proti stejnému seedu bez něj, do patra 6                                                                                                                                                                                                                                               | 20 žolíků + 190 dvojic × 6 seedů                                   |
| Analytici, ověřovatelé, skeptici                  | 6 pohledů (×mult a opakování, škálování, peníze, pravidla, karty, chyby); každý navrhl ~9 kombinací, jiný agent je změřil ve skutečném enginu, dva skeptici přeměřili ty nejsilnější                                                                                                                                                                            | 54 kombinací, 27 přeměřených                                       |

„×N“ v tabulkách = součet skóre typických rukou se sestavou / totéž bez žolíků (stejné karty, stejné úrovně). U +mult
žolíků je to proti prázdné sestavě víc než ve skutečném buildu, kde už nějaký mult je; ×mult žolíků se to netýká.
„Synergie“ = o kolik je dvojice silnější, než by odpovídalo oběma žolíkům zvlášť (×1 = nezávislí).

## Skóre

### Nejsilnější dvojice bez legendárních (v obchodě dostupné)

|   # | Dvojice                             | Vzácnost        | Patro 8 | Patro 4 | Synergie |
| --: | ----------------------------------- | --------------- | ------: | ------: | -------: |
|   1 | Fotograf z pouti + Šťastná sedmička | běžný + vzácný  |   ×16,6 |   ×62,8 |     ×8,8 |
|   2 | Dechovka + Fotograf z pouti         | epický + běžný  |    ×8,6 |    ×5,4 |     ×4,6 |
|   3 | Fotograf z pouti + Volební komise   | běžný + běžný   |    ×5,5 |    ×7,5 |     ×3,1 |
|   4 | Karlův most + Archivář              | epický + epický |    ×4,5 |    ×3,7 |     ×2,4 |
|   5 | Fotograf z pouti + Hudební automat  | běžný + běžný   |    ×4,5 |    ×5,3 |     ×2,5 |
|   6 | Silvestr + Archivář                 | epický + epický |    ×4,3 |    ×1,8 |     ×2,1 |
|   7 | Dálnice D1 + Silvestr               | epický + epický |    ×4,2 |    ×2,7 |     ×1,0 |
|   8 | Dálnice D1 + Archivář               | epický + epický |    ×4,0 |    ×4,0 |     ×2,0 |
|   9 | Kouzelník z pouti + Silvestr        | epický + epický |    ×4,0 |    ×2,7 |     ×1,0 |
|  10 | Směnárna + Silvestr                 | epický + epický |    ×4,0 |    ×2,5 |     ×1,0 |

Další s Fotografem: Spartakiáda ×3,2, Fotbalový fanoušek ×3,0. Šťastná sedmička je nejsilnější proto, že s šancí
1 ze 7 přidá kartě 7 opakování: první figura pak dostane ×2⁸ = ×256. V patře 4 (nízké úrovně) je to až ×63.

### Jen běžní žolíci

|   # | Dvojice                            | Patro 8 | Patro 4 |
| --: | ---------------------------------- | ------: | ------: |
|   1 | Fotograf z pouti + Volební komise  |    ×5,5 |    ×7,5 |
|   2 | Fotograf z pouti + Hudební automat |    ×4,5 |    ×5,3 |
|   3 | Fotograf z pouti + Meteorolog      |    ×2,3 |    ×2,4 |
|   4 | Meteorolog + Tramvaják             |    ×2,1 |    ×3,2 |
|   5 | Fotograf z pouti + Tramvaják       |    ×2,0 |    ×3,4 |

Bez Fotografa dělají dvojice běžných žolíků ×1,8–2,1 a chovají se skoro nezávisle.

### Legendární (jen z razítka Výjimka z vyhlášky a štítku Pouťová tombola)

|   # | Dvojice                    | Patro 8 | Patro 4 |
| --: | -------------------------- | ------: | ------: |
|   1 | Orloj + Archivář           |   ×10,5 |   ×10,8 |
|   2 | Orloj + Blaničtí rytíři    |    ×9,4 |    ×9,5 |
|   3 | Blaničtí rytíři + Archivář |    ×9,0 |    ×9,0 |
|   4 | Doktor Faust + Orloj       |    ×8,8 |    ×8,9 |
|   5 | Bruncvíkův meč + Orloj     |    ×8,7 |    ×5,7 |

Legendární ×mult jsou mezi sebou nezávislé (synergie ×1,0): prostě se násobí. Skutečnou synergii s nimi má jen
Archivář, který je zkopíruje (musí stát hned napravo od nich).

### Nejlepší sestavy 3–5 žolíků (patro 8, bez legendárních)

| Velikost | Sestava (v pořadí zleva)                                                                               | Síla |
| -------: | ------------------------------------------------------------------------------------------------------ | ---: |
|        3 | Fotograf z pouti, Šťastná sedmička, Kouzelník z pouti                                                  |  ×74 |
|        3 | Fotograf z pouti, Volební komise, Šťastná sedmička                                                     |  ×63 |
|        3 | Fotograf z pouti, Hudební automat, Šťastná sedmička                                                    |  ×50 |
|        4 | Fotograf z pouti, Šťastná sedmička, Kouzelník z pouti, Volební komise                                  | ×305 |
|        4 | Dechovka, Fotograf z pouti, Šťastná sedmička, Kouzelník z pouti                                        | ×219 |
|        5 | Fotograf z pouti, Šťastná sedmička, Kouzelník z pouti, Volební komise, Napodobitel (kopíruje Sedmičku) | ×943 |
|        5 | Hudební automat, Fotograf z pouti, Šťastná sedmička, Kouzelník z pouti, Kopírák                        | ×832 |
|        5 | Fotograf z pouti, Šťastná sedmička, Kouzelník z pouti, Volební komise, Silvestr                        | ×635 |

**Bez Fotografa** je nejlepší pětice Karlův most, Archivář, Silvestr, Dálnice D1, Směnárna se ×37 (trojice ×9,7,
čtveřice ×19). Před zákazem kopírování Fotografa měla nejlepší pětice ×169 000.

### Ověření celými runy (Imperial, sestava od patra 3, 20 seedů)

| Sestava                                                    | Výhry | Patro ⌀ | Nejdál | Nejlepší ruka |
| ---------------------------------------------------------- | ----: | ------: | -----: | ------------: |
| bot bez zásahu                                             |  0/20 |     4,4 |      6 |             — |
| Hudební automat + Dechovka + Fotograf + Archivář + Kopírák |  5/20 |     7,1 |     14 |       4,1·10⁸ |
| Fotograf + Komise + Sedmička + Kouzelník + Kopírák         |  3/20 |     6,6 |     13 |       7,1·10⁷ |
| Dechovka + Fotograf + Sedmička + Kouzelník                 |  3/20 |     6,5 |     15 |       2,3·10⁸ |
| Fotograf + Komise + Fanoušek + Automat (běžní a vzácný)    |  3/20 |     7,2 |     16 |       5,2·10⁷ |
| Vodník + D1 + Kouzelník + Meteorolog + Rundu všem          |  3/20 |     5,8 |     10 |       3,0·10⁵ |
| Meteorolog + Stará garda + Karlův most + D1 + Směnárna     |  2/20 |     5,2 |     11 |       1,6·10⁶ |
| Orloj + Archivář                                           |  2/20 |     5,7 |     10 |       3,8·10⁵ |
| Karlův most + Archivář + D1 + Silvestr + Směnárna          |  1/20 |     5,1 |      9 |       3,3·10⁵ |
| Fotograf + Šťastná sedmička                                |  0/20 |     4,5 |      8 |       1,9·10⁷ |
| Fotograf + Volební komise                                  |  0/20 |     4,1 |      7 |       6,5·10⁶ |

Dvojice s Fotografem samy na Imperialu nestačí (sestava nahradí botovy žolíky). Šéfové, kteří berou figury, a
nutnost mít figuru na prvním místě z nich dělají sázku, ne jistotu. Pětice zvednou Imperial z 0 na 15–25 % výher.

### Rekordy jedné ruky (ověřovatelé, skutečný engine, po úpravách)

| Sestava a karty                                                               |                    Skóre / násobek |
| ----------------------------------------------------------------------------- | ---------------------------------: |
| Ozvěna + Komise + Automat + Fotograf, jeden K s červenou pečetí (10 aktivací) |  110 592 (×3 950 proti bez žolíků) |
| Fotograf + Fanoušek + Dechovka, pět králů (Dvorní balíček)                    | 6 128 640 (s Faustem 24,5 milionu) |
| Libuše + Archivář, čtyři dámy s červenou pečetí                               |                     285 856 (×327) |
| Hloupý Honza + Archivář na Dvojici                                            |                                ×24 |
| Orloj + Blaničtí rytíři + Pivní sommelier, 4. ruka kola                       |                              ×45,6 |

Pořadí hraje roli: +mult žolík nalevo od Fotografa dá ×1,75 víc než napravo (Fotograf pak násobí větší mult).
Archivář vlevo od cíle nekopíruje nic.

## Karty a balíček (bez žolíků nebo s jedním)

| Stavba                                                       |                  Násobek | Poznámka                                                                                |
| ------------------------------------------------------------ | -----------------------: | --------------------------------------------------------------------------------------- |
| Barva z 5 skleněných karet s červenou pečetí a duhovou edicí |     ×81 000 (bez žolíků) | každá karta ×3 při každé ze dvou aktivací; stačí jakékoli jedno opakování, ne jen pečeť |
| Barva z 5 skleněných karet s červenou pečetí                 |                   ×1 400 | realisticky 3 z 5 karet: ×45                                                            |
| Čtveřice ze 4 skleněných karet + Dechovka                    |                     ×256 | bez razítek, jen 4 rady Babiččina vitrína                                               |
| Ocelové karty s červenou pečetí v ruce                       |           ×2,25 za kartu | 4 karty ×22, 7 karet ×292; ocel nepraská                                                |
| Jabloň + Kopřivový čaj                                       | čipy karty ×2 za pár rad | 12 rad = ×4,8; balíček se nezmenší                                                      |
| Sklář + skleněné karty                                       |           sklo je trvalé | vrací jen sklo prasklé při skórování                                                    |

## Peníze

### Samostatně (Δ Kč na vyhrané kolo proti stejnému runu bez žolíka, bot max, do patra 6)

| Žolík                             | Vzácnost | Δ Kč/kolo | Pásmo vzácnosti |
| --------------------------------- | -------- | --------: | --------------: |
| Kupónová privatizace              | epický   |      +8,5 |             5–7 |
| Válečná kořist                    | vzácný   |      +5,7 |             3–5 |
| Notář                             | vzácný   |      +4,1 |             3–5 |
| Pozlacovač (po úpravě, dřív +9,1) | běžný    |      +4,0 |             2–3 |
| Brigádník                         | běžný    |      +4,0 |             2–3 |
| Třináctý plat                     | běžný    |      +3,3 |             2–3 |
| Bazarník                          | běžný    |      +3,2 |             2–3 |
| Žebrák                            | běžný    |      +3,0 |             2–3 |
| Pošťák                            | běžný    |      +2,9 |             2–3 |
| Zlatník                           | běžný    |      +2,8 |             2–3 |
| Sázkař                            | běžný    |      +2,5 |             2–3 |
| Zahrádkář Venca                   | běžný    |      +2,5 |             2–3 |
| Řezník z rohu                     | běžný    |      +2,4 |             2–3 |
| Pokladnička                       | běžný    |      +1,4 |             2–3 |

Dvojice peněžních žolíků se sčítají (synergie ±2 Kč je šum). Defenestrace u bota dělala +3,9, ale hráč, který do
každého zahození přihodil figuru, bral ~13 Kč (proto úprava). Stavební spoření bot neumí využít (peníze utratí):
se střádáním dá +5 Kč úroku, na balíčku Dlužník 20 Kč úroku za kolo.

### Peněžní motory (ověřovatelé a skeptici)

| Motor                                             |                                     Kč za kolo | Poznámka                                                        |
| ------------------------------------------------- | ---------------------------------------------: | --------------------------------------------------------------- |
| Dechovka + zlaté pečeti na kartách stejné hodnoty | 9–25, s dobíráním 30–57 (Dvorní balíček 56–96) | každá aktivace = 2 Kč; každá karta skóruje jen jednou za kolo   |
| Šťastné karty + Dechovka                          |                                            ~20 | čtveřice šťastných ~39 Kč za ruku, ale čtveřice jen ve 23 % kol |
| Zlatník + Fanoušek + Dechovka (Dvorní balíček)    |                                            ~23 | na Hospodském balíčku Zlatník 2,9 Kč                            |
| Bazarník s prázdnými sloty                        |                                             12 | sám se omezuje: s dvěma dalšími žolíky 6                        |
| Válečná kořist                                    |                            7,7 ⌀, v patře 8 14 | roste s každým šéfem, za run ~184 Kč                            |
| Krakonoš + Archivář + Pošťák                      |                                           5–10 | každá pranostika vydělá a dá +3 úrovně                          |
| Pět peněžních žolíků na figury s kopiemi          |                                            ~46 | celý slotový prostor bez jakéhokoli skóre                       |

## Škálování (roste během runu)

| Motor                              |                                                   Hodnota | Poznámka                                 |
| ---------------------------------- | --------------------------------------------------------: | ---------------------------------------- |
| Sběrač hub + Archivář              |                   ×61 při 30 zničených kartách (sám ×6,4) | Archivář zopakuje celý stav, tedy umocní |
| Sběrač hub + Řezník z rohu         |                              ×6 v patře 8, ×9,5 v kole 40 | balíček se zmenšuje k 6–8 kartám         |
| Libuše + Archivář                  | dámy: 13 % → 77 % → 100 % rukou s 5 dámami (kola 8/16/24) | strop ×1,4¹⁰ = ×29 na ruku               |
| Praotec Čech + Archivář            |                                         +2 úrovně za kolo | základ roste s druhou mocninou úrovně    |
| Krakonoš + Archivář + modré pečeti |                                   +2,3–3,9 úrovně za kolo | každá pranostika +3 úrovně               |
| Kořenářka + Rybář + Teta z poradny |                                          ~+6 mult za kolo | s fialovými pečetěmi                     |
| Válečná kořist                     |                         +2 Kč za každého šéfa, každé kolo | v nekonečném režimu ~30 Kč za kolo       |
| Klenotník + opakování              |                      +10 čipů na kartu za každou aktivaci | ~+75 čipů za kolo                        |

## Pravidla a konzistence

- **Turistický průvodce + Barvoslepý strýc** = Barva v 100 % úvodních rukou (bez nich 6,9 %). Je to konzistence,
  ne síla: vlastní přínos ×1,1. S Vyšlapanou cestou je Postupka v barvě skoro v každé ruce, takže se z ní stává
  výchozí kombinace (a dobrý cíl pro pranostiky na míru).
- **Postupkový motor** (Vyšlapaná cesta + Kolotoč + Meteorolog + Stará garda) je o 30–70 % silnější než barevný při
  stejných úrovních. Silný střed, ne rozbitý.
- **Hloupý Honza** stojí a padá s úrovní Vysoké karty: na úrovni 8 s Panem vrchním a Karlovým mostem 156 000, na
  úrovni 1 slabší než Pivní tácek.

## Antisynergie a pasti

- **Barvoslepý strýc + šéfka Pověrčivá babka:** babka pak vyřadí polovinu balíčku (dvě barvy místo jedné). Pravidlem je
  to správně (barvy jsou sloučené pro všechno), popisek strýce to teď říká.
- **Archivář vlevo od cíle** nekopíruje nic; Napodobitel neumí kopírovat epické a legendární žolíky; Fotografa nekopíruje
  nikdo.
- **+mult žolíci napravo od Fotografa** ztrácejí: Fotograf násobí jen to, co se nasbíralo před ním.
- **Šéfové na figury** (Inventura) a debuff žolíků vypnou celý motor Fotografa na jedno kolo.

## Chyby

- **Opraveno: kopie Fotografa obcházely strop taky.** Každá kopie (Archivář, Kopírák, Napodobitel) přidala další ×2 za
  aktivaci, takže násobek byl 2^(instance × aktivace): naměřeno až ×10⁹ na jedné kartě a nejlepší ruka 7,8·10¹⁰.
  Fotografa teď nejde kopírovat (jako Skláře).
- **Opraveno: Sklář klonoval sklo.** Vyfoukl znovu skleněnou kartu zničenou čímkoli: razítkem Sloučit spisy šlo z jedné
  karty glass@red~poly udělat pět, Kopřivový čaj tiskl čipy z ničeho a Výkup a Úklid dávaly „zničení zdarma“ pro
  Sběrače hub. Teď vrací jen kartu, která praskla při skórování (`onCardDestroyed` dostává důvod zničení).
- **Opraveno: spropitné Turistického průvodce** šlo obejít pátou kartou navíc. Teď se počítají skórující karty.
- **Upřesněno: Barvoslepý strýc** platí i pro pravidla šéfů (popisek).
- **Není chyba:** Klenotník s kopií přidá čipy dvakrát a zlatá pečeť platí při každé aktivaci (kopie = druhá instance,
  peníze z opakování jsou v celé hře záměrně a hlídají to testy). Prodej Sekery v dluhu nechá dluh pod novým limitem
  (jako kreditka v Balatru, uložení to nevadí). Archivář s duhovým kostýmem jde prodat se ziskem jen s kupónem
  Výkupna (se slevou pak jde přeprodávat se ziskem i jiné žolíky).
- **Stabilita:** všech 11 342 sestav dvojic × 9 stavů × 12 rukou bez výjimky, NaN, nekonečna a záporného skóre; fuzz
  ~150 000 akcí (náhodné tahy, výzvy, kopie, dluh) s ukládáním a načítáním bez nálezu.

## Balanc: co zůstává rozbité a co jsem upravil

**Záměrně rozbité (jackpoty jako v Balatru):**

1. Fotograf z pouti + opakování (exponenciální skóre až ×1024 na figuře, chtěné „Photochad“).
2. Sklo s opakováním a duhovou edicí, ocel s červenou pečetí v ruce (karetní stavby, stojí rady a razítka).
3. Dechovka + zlaté pečeti nebo šťastné karty (peněžní stroj, potřebuje karty stejné hodnoty).
4. Archivář + legendární ×mult a Sběrač hub + Archivář (legendární a dva epičtí žolíci jsou vzácní sami o sobě).

**Upraveno:**

| Žolík               | Před                                         | Po                                             | Proč                                                                   |
| ------------------- | -------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------- |
| Fotograf z pouti    | šel kopírovat, každá kopie zdvojila exponent | nejde kopírovat                                | ×10⁹ na kartě, nejlepší pětice ×169 000 → ×943                         |
| Pozlacovač          | pozlatí kartu každé kolo (+9 Kč/kolo)        | šance 1 ze 2 (+4 Kč/kolo)                      | 3× nad pásmem běžného; zlatá karta za 4 Kč z něj dělala sněhovou kouli |
| Defenestrace        | 5 Kč za zahození s 1 figurou (~13 Kč/kolo)   | 4 Kč za zahození se 2 figurami (~6–7 Kč/kolo)  | 3–4× nad pásmem vzácného                                               |
| Sklář               | vracel sklo zničené čímkoli                  | jen sklo prasklé při skórování                 | klonování karet                                                        |
| Turistický průvodce | spropitné jen při 4 zahraných kartách        | při Barvě nebo Postupce ze 4 skórujících karet | obcházení pátou kartou                                                 |

**Sledovat (nechávám, ale jsou na horní hraně):** Bazarník (12 Kč/kolo s prázdnými sloty, sám se omezuje), Kupónová
privatizace (+8,5 Kč, epická), Válečná kořist (+5,7 Kč, vzácná), Meteorolog (běžný, s pranostikami na míru ×1,7 proti
prázdné sestavě), Tramvaják (×2,6 v patře 4).
