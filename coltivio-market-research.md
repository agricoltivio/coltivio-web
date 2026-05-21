# Coltivio Market Research — Swiss Farm-Management Software

Internal strategy document. Last updated 2026-05-21.

Focus: Swiss-only farm-management tools across **full-suite**, **livestock-only**, and **crop/agronomy-only** segments. Direct-sales / commerce platforms intentionally out of scope for this round (the user de-prioritised them). All figures are CHF and refer to annual list pricing unless stated otherwise.

---

## 1. TL;DR

- **The market is fragmented.** Barto (fenaco-backed) is the would-be category leader but stuck at ~5,000 users and losing money (–CHF 2.8M in 2023). Everyone else is a niche player.
- **No single product covers fields + livestock + commerce + modern mobile** the way Coltivio does. The closest full-suite is **Agrosoft Swiss / Farmsolution** (mature, broad, but DE-only and dated UX).
- **Crop journaling is a crowded mid-tier**: Smartfarm (IP-SUISSE / Agrosolution, CHF 80–120), eFeldkalender (CHF 150, ~2,558 farms), Agroplus (~2,200 users, DE/FR/IT), plus Barto's bundle at CHF 139.
- **Livestock specialists are mostly German imports** (Helm MultiRind, dsp-Agrosoft HERDEplus). High-quality but desktop-rooted and not Swiss-localised at the deepest level. Agrosoft Swiss Kuhtime is the Swiss-native option.
- **Accounting is owned by Averio (AgroOffice + Agro-Twin merger, Jan 2025) and Pinus.** Not Coltivio's segment — but farmers buy these tools first and stick.
- **Distribution is the real moat**: Barto rides on 67 fenaco-LANDIs offering on-site setup; Smartfarm rides on IP-SUISSE membership. Coltivio has neither.
- **Pricing norm is "one fee per farm/year"**, not per-seat. Coltivio's CHF 15/seat/month is structurally different and will need clear positioning.
- **The fenaco data-ownership critique is a positioning gift.** Uniterre and others have publicly attacked Barto for funnelling farmer data to fenaco. Open-source + farmer-owned data is a real wedge.

---

## 2. Market overview

| Metric | Value (2025) | Source |
|---|---|---|
| Total Swiss farms | 46,270 (–1.7% YoY) | BFS / Agrarbericht 2025 |
| Average farm area | 22.5 ha (+0.4 ha YoY) | BFS |
| Bio farms | 7,819 (–0.9% YoY); 18.5% of LN | BFS |
| Smartphone penetration (CH pop.) | ~96% | Statista 2023 |
| iOS share | 37–57% (depending on methodology) | comparis / Statista |

**Structural trend**: fewer, larger farms. Bigger farms have more administrative load → more reason to digitise. But ~46k farms is a *small* TAM — even 10% market share is ~4,600 paying farms, which constrains how big a competitor can get and explains why Barto is bleeding money.

**Regulatory drivers that force software adoption**:
- **TVD (Tierverkehrsdatenbank)** — cattle movement reporting mandatory.
- **Suisse-Bilanz** — nutrient accounting; required for direct payments.
- **ÖLN / IP-Suisse** — ecological-performance documentation.
- **Kontrolldossier** — inspection dossiers per canton.
- **Cantonal Datenaustausch** (Gelan, LAWIS, Acorda, etc.) — varies by canton.

These compliance requirements are the *only* reason most farmers tolerate software at all. A product that doesn't tick at least Feldkalender + Suisse-Bilanz + cantonal export is barely competitive.

**Language reality**: DE dominates (~65% of farms), FR ~25% (Romandie), IT ~5% (Ticino). Most tools support DE only or DE+FR. Trilingual (DE/FR/IT) is rare and a clear gap.

---

## 3. Full-suite competitors

### 3.1 Barto

| | |
|---|---|
| URL | barto.ch |
| Backer | **Barto AG** — fenaco owns ~68% (acquired Dec 2024); previously powered by 365FarmNet (Germany), fully Swiss since 2 July 2025 |
| Target | All Swiss farms; positioned as *the* national digital Hofmanager |
| Platform | Web + mobile apps (modernised 2025) |
| Languages | DE / FR / IT |
| Pricing | **Bundle CHF 139/yr** (5 core modules: Feldkalender, Tierverkehr Rinder, Wiesen- & Auslaufjournal, Fruchtfolgeplanung, Datenaustausch Kantone). Modules à la carte CHF 29–150 (Suisse-Bilanz CHF 49, Kontrolldossier CHF 49, Rumiplan CHF 150, Fertiplan CHF 69, UFA Gallo Support CHF 85). Free tier: basic Feldkalender + several advisor-side modules (Lager Basis, MyDocs LANDI, AGROLINE / LANDOR Services) |
| Swiss integrations | TVD, Suisse-Bilanz, all major cantonal systems, LANDOR / UFA / MELIOR advisor data |
| Users | ~5,000 (per *Uniterre*, repeated in BauernZeitung commentary) |
| Financials | Losses: CHF –1.8M (2022), –2.3M to –2.8M (2023 — sources differ slightly). Annual revenue ~CHF 100k. Sustained by fenaco capital. |

**Critical reception**:
- *Uniterre* (peasant union): *"Fenaco sammelt über die vorangetriebene Digitalisierung mit dem Barto-Tool Daten und erlangt dadurch Zugang und Kontrolle über die Schweizer Landwirtschaft."* Direct allegation that Barto exists to extract farmer data for fenaco's sales arm (LANDOR, UFA, AGROLINE).
- Data-protection policy explicitly permits fenaco-informatique staff access to operational data.
- Originally publicly-funded (via Agridea and Identitas AG); personnel rotation between Agridea and Barto raises governance questions.
- BauernZeitung quotes acknowledge slow adoption: *"Der Schweizer Markt ist klein"* (Ulrich Ryser, Barto), *"Die Angst vor mehr Kontrolle und neuen Auflagen sei spürbar"* (older farmers fear control via digitisation).

**Implications for Coltivio**: Barto is wide and well-distributed but *politically contested*. There is a real audience that does not want to feed fenaco. Open-source is not just an engineering choice — it's a positioning weapon here.

### 3.2 Agrosoft Swiss / Farmsolution

| | |
|---|---|
| URL | agrosoft.ch |
| Backer | Privately held Swiss SME, 30+ years |
| Target | Mid–large Swiss farms wanting one tool for everything |
| Platform | Desktop + browser + mobile app (app.farmsolution.ch) |
| Languages | DE only |
| Pricing | Not public on site — modular/configurator-based, contact sales (a signal: bigger-farm / sales-led motion) |
| Modules | Feldmanager (crops), Kuhtime Series (dairy herd, feeding, breeding), Agrosem (insemination/vet billing), Rima (beef fattening), Faktura (direct-sales invoicing), Agrobuchhaltung (accounting) |
| Swiss integrations | TVD online, Zuchtdaten-Sync, SwissGAP, FAT machine tables |
| Differentiator | *"Eine für alles"* — genuinely full-stack; commerce + livestock + crops in one. Closest functional analogue to Coltivio. Privacy stance: *"Ihre Daten sind geheim!"* — no third-party partners. |

**Implications for Coltivio**: This is the **strongest direct competitor**. Same scope ambition; differences are UX (Agrosoft is older / heavier), open-source (Coltivio yes, Agrosoft no), multilingual (Coltivio yes, Agrosoft DE-only), pricing transparency (Coltivio published, Agrosoft hidden), and mobile-first orientation (Coltivio yes, Agrosoft mobile-as-companion). If a Swiss-farm shopper has heard of any full-suite besides Barto, it's Agrosoft.

### 3.3 AGRO-TECH (AGRIDEA / SBV)

| | |
|---|---|
| URL | agridea.ch — software section |
| Backer | AGRIDEA (extension/consultancy, federal-linked) + Schweizer Bauernverband |
| Target | Practising farmers needing compliance documentation |
| Platform | Local install + mobile data collection via smartphone/tablet |
| Languages | DE / FR (likely) |
| Pricing | Not transparent on site — Abacuscity webshop |
| Differentiator | Quasi-institutional credibility; deeply embedded with cantonal advisors and BLW |

**Implications**: AGRO-TECH benefits from institutional trust but ages poorly compared to web-native tools. Not a direct UX competitor to Coltivio, but a *credibility* competitor in the advisor channel.

### 3.4 Pinus (PiNUS21 / PiNUS Classic)

| | |
|---|---|
| URL | pinus-buchhaltungssoftware.ch |
| Backer | Pinus AG, swissmadesoftware-certified |
| Target | Swiss farms, SMEs, associations needing accounting |
| Platform | Browser (PiNUS21) + desktop (Classic). No native mobile app. |
| Languages | DE primarily |
| Pricing | Modular configurator-based, annual subscription. Public price configurator on site. |
| Focus | Accounting-first: Buchhaltung, Faktura, Lohn, Viehregister, Anlagen-/Pacht-Buchführung |

**Implications**: Pinus is the accounting incumbent. Coltivio does **not** compete here — and probably shouldn't try. Worth integrating with (export to Pinus / Agro-Twin formats) rather than competing.

### 3.5 AgroOffice / Agro-Twin (Averio AG)

| | |
|---|---|
| URL | agro-office.ch / agro-twin.ch (merged as Averio AG, Jan 2025) |
| Backer | Network of Agro-Treuhand cantonal trusts |
| Target | Buchhaltung-first farms; the Agro-Treuhand channel |
| Platform | Desktop + mobile companion (AgroOffice Scan for receipts) |
| Languages | DE |
| Pricing | Price list PDF published; lizenzgebühren updated annually (2024 price increase signalled) |
| Focus | Accounting + Faktura + Viehregister + e-banking + QR-Bill |

**Implications**: Same story as Pinus — accounting incumbent, deep treuhand channel. Coltivio sidesteps.

### 3.6 FarmOffice.ch (NEXT Farming via STUDER AG)

| | |
|---|---|
| URL | farmoffice.ch |
| Backer | STUDER AG Lyssach — Swiss reseller of NEXT Farming (formerly FarmFacts, Germany) |
| Target | Larger / precision-farming operations; GPS-steering buyers |
| Platform | Cloud + tractor hardware integration |
| Languages | DE |
| Pricing | Not disclosed — sales-led |
| Differentiator | Precision Land Management (PLM), GPS auto-steering, weather stations |

**Implications**: Higher-end / arable-focused. Not an immediate competitor to Coltivio's small-farm target, but a ceiling on how big a Coltivio customer can grow without churning out to PLM tools.

### 3.7 365FarmNet (now subsumed under Barto for Switzerland)

Was the Claas-backed German FMIS that powered Barto. As of July 2025, Barto AG took over operation for CH/LI. Standalone product still exists for DE/AT/EU at 365farmnet.com (~€5/mo up to 50 ha, area-based above). **Not relevant as a separate Swiss player anymore.**

---

## 4. Crop / agronomy specialists

### 4.1 Smartfarm (IP-SUISSE + Agrosolution)

| | |
|---|---|
| URL | smartfarm.ch |
| Backer | IP-SUISSE label + Agrosolution AG |
| Target | Field-crop farmers; especially IP-SUISSE members |
| Platform | Web (primary) + mobile (PWA-style) |
| Languages | DE / FR |
| Pricing | **CHF 80/yr (IP-SUISSE members) / CHF 120/yr (Agrosolution license, non-members)**. 6-month free trial. |
| Swiss integrations | Gelan (geoadmin), LAWIS / LAWIS Plus, Wallis canton system, TVD-style livestock journals |
| Differentiator | Launched July 2024. *"Von Bauern, für Bauern."* Two Swiss data centres. PCI-DSS. Endorsed by IP-SUISSE (one of the largest Swiss producer labels — major distribution lever). |

**Implications for Coltivio**: **The most dangerous mid-tier direct competitor**. Same scope as Coltivio's Feldkalender + journals at half the price. Distribution via IP-SUISSE membership is hard to match. Coltivio needs to be visibly better on UX, mobile, multilingual (IT), and commerce.

### 4.2 eFeldkalender

| | |
|---|---|
| URL | feldkalender.ch |
| Backer | eFeldkalender GmbH (Wileroltigen) |
| Target | Field-crop farmers, all sizes |
| Platform | Web + iOS + Android |
| Languages | DE only |
| Pricing | **CHF 150/yr** (50% promo currently shown on site) |
| Stats | **2,558 registered farms**, 769,429 bookings, 137,911 crops recorded, 13 years in market |
| Swiss integrations | Suisse-Bilanz, SwissGAP, **John Deere OperationsCenter** |
| Differentiator | Real customer base, long track record, machinery-data integration |

**Implications**: Solid mid-tier. ~2,500 farms = bigger than Barto's userbase actually using it for fields. Coltivio's edge: multilingual (eFeldkalender is DE-only), mobile-first UX, integrated livestock + commerce.

### 4.3 Agroplus

| | |
|---|---|
| URL | agroplus.ch |
| Backer | Agroplus Software SA |
| Target | Swiss farmers across language regions |
| Platform | Web (Agroplus Technik) + iOS + Android (auto-sync) |
| Languages | **DE / FR / IT** (rare — only competitor matching Coltivio's trilingual reach) |
| Pricing | Not transparent on site |
| Users | **2,200+ Swiss users** (self-reported) |
| Swiss integrations | Suisse-Bilanz N/P₂O₅ control, ÖLN reporting, multi-farm sync |
| Differentiator | True trilingual, multi-farm/multi-device, ÖLN-tight |

**Implications**: Agroplus is the *one* competitor Coltivio cannot out-language. Need to compete on UX, openness, commerce, and mobile-first thoroughness.

### 4.4 Isagri / Geofolia

| | |
|---|---|
| URL | agrarsoftware.ch |
| Backer | Isagri (French parent, large EU player) |
| Target | Swiss farms (mostly Romandie/cross-border) |
| Platform | Software + 3D cartography (Geofolia), Herdenmanagement |
| Languages | DE / FR |
| Pricing | Not transparent |
| Differentiator | Strong Romandie/French-Swiss presence; 3D parcel cartography |

### 4.5 xarvio Field Manager (BASF)

| | |
|---|---|
| URL | xarvio.com / ag.xarvio.com |
| Backer | **BASF** (global agchem) |
| Target | Arable farmers wanting decision-support (variable seeding, nutrient timing, disease alerts) |
| Platform | Web + mobile |
| Languages | DE primary, multi-language |
| Pricing | Freemium — basic free, paid extensions €/ha (≈ CHF 5/ha savings if bundled) |
| Differentiator | Agronomic intelligence (disease models, satellite zoning), BASF distribution |

**Implications**: Different value prop — decision support, not record-keeping. Some overlap with Coltivio's planning features, but xarvio is selling agronomy advice, Coltivio is selling administration.

### 4.6 Farmdok

| | |
|---|---|
| URL | farmdok.com |
| Backer | Austrian, marketed via Maschinenring |
| Target | All farm sizes; precision + paperless ops |
| Platform | Web + mobile |
| Languages | DE / EN / others |
| Pricing | Public price page; Maschinenring members get discounts |
| Swiss uptake | Limited (Austria-first), but available |

---

## 5. Livestock specialists

### 5.1 Helm-Software (MultiRind, Smartrind, Farmface)

| | |
|---|---|
| URL | helm-software.de |
| Backer | German company (despite some "Winterthur" reseller mentions) |
| Target | Dairy + suckler-cow operations |
| Platform | Desktop core + WebApp companion + smartphone app |
| Languages | DE |
| Pricing | **MultiRind from ~€790** (one-time licence-like) |
| Integrations | German **HIT-Tier** (≈ Swiss TVD equivalent), milking robots, sensors |
| Swiss localisation | Limited — HIT-Tier, not TVD-native |

### 5.2 dsp-Agrosoft (HERDEplus, SCHAFplus)

| | |
|---|---|
| URL | dsp-agrosoft.de |
| Backer | German, 30+ years in livestock software |
| Target | Dairy (HERDEplus), sheep (SCHAFplus), veterinarians, consultants |
| Platform | Desktop heritage + Herde mobile App (iOS) |
| Languages | DE / EN |
| Pricing | Sales-led / not public |
| Integrations | HI-Tier (German), 40+ milking/sensor interfaces, breeding associations |
| Swiss localisation | Limited — same TVD/HIT issue as Helm |

### 5.3 UFA Herd Support (UHS)

| | |
|---|---|
| URL | ufa.ch |
| Backer | UFA AG (fenaco group — feed) |
| Target | Professional dairy farms |
| Platform | Consulting + data analysis (not really a pure software product) |
| Pricing | *"Modest fixed annual cost participation"* — not disclosed |
| Note | This is a feeding-advisory service with data tools, not a standalone software competitor. 25+ year track record. |

### 5.4 Agrosoft Swiss — Kuhtime / Rima

Already covered under §3.2 as part of the Agrosoft Farmsolution suite. The only **Swiss-native** livestock-management product with TVD-native integration. Likely the strongest livestock competitor *for the segment Coltivio targets* (small-mid Swiss farms wanting one tool).

---

## 6. Feature matrix

Comparing Coltivio against the seven most directly competitive products.

| | Coltivio | Barto | Smartfarm | Agrosoft Swiss | eFeldkalender | Agroplus | Helm MultiRind |
|---|---|---|---|---|---|---|---|
| **Modern mobile-first app** | ✅ RN/Expo | ⚠️ Recent rewrite | ⚠️ PWA-style | ⚠️ Mobile companion | ✅ Native iOS/Android | ✅ Native iOS/Android | ⚠️ Companion app |
| **Geoadmin / cantonal parcels** | ✅ | ✅ All cantons | ✅ Gelan + cantons | ✅ | ⚠️ Limited | ✅ | ❌ |
| **TVD-native livestock** | ✅ | ✅ | Partial | ✅ | ❌ | ❌ | ❌ (HIT-Tier, DE) |
| **Treatment journal + withdrawal** | ✅ | ✅ | ⚠️ | ✅ | ❌ | ⚠️ | ✅ |
| **Crop rotation + Suisse-Bilanz** | ✅ (rotation); Suisse-Bilanz planned | ✅ (Suisse-Bilanz CHF 49) | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Commerce / invoicing / sponsorships** | ✅ (web) | ❌ | ❌ | ✅ (Faktura module) | ❌ | ❌ | ❌ |
| **DE / FR / IT / EN** | ✅ all four | DE/FR/IT | DE/FR | DE only | DE only | DE/FR/IT | DE only |
| **Open-source / self-host** | ✅ AGPL-3.0 + CC | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Pricing model** | CHF 15/seat/mo (+ free Demo + 60-day trial) | CHF 139/yr bundle | CHF 80–120/yr | Sales-led | CHF 150/yr | Sales-led | ~€790 one-off |
| **Per-seat (vs per-farm)** | ✅ Seat | Per-farm | Per-farm | Per-farm | Per-farm | Per-farm | Per-licence |

---

## 7. Pain-points heat map

Patterns recurring across competitors (sourced from BauernZeitung, Uniterre, UFA-Revue, Schweizer Bauer, App Store listings, and user-facing copy):

| Cluster | Where it shows up | Coltivio implication |
|---|---|---|
| **"Tool sammelt Daten für die Industrie"** (data conflict-of-interest) | Barto / fenaco — Uniterre's central critique | Open-source + farmer-owned data is a wedge. Lead with it. |
| **Slow adoption among older farmers** | UFA-Revue, BauernZeitung — *"Angst vor mehr Kontrolle"* | Demo tier without friction; let curious neighbours try. |
| **Hidden / sales-led pricing** | Agrosoft Swiss, FarmOffice, AGRO-TECH, AgroOffice, Pinus configurator | Coltivio's transparent CHF 15/seat is a B2C-SaaS signal — feels honest, but is unfamiliar shape. Communicate in CHF/year for farmer-friendliness. |
| **DE-only UX** | eFeldkalender, Agrosoft, Helm, dsp-Agrosoft, AgroOffice, Pinus | Trilingual+ is real differentiation; especially Italian-speaking Ticino is *barely served*. |
| **Desktop heritage, mobile bolt-on** | AgroOffice, Pinus, AGRO-TECH, Helm, dsp-Agrosoft | Mobile-first matters more every year. Field workers won't open a laptop in the barn. |
| **Module sprawl + à la carte add-on fatigue** | Barto's 21 modules; configurator-driven Pinus | Coltivio's flat Demo/Trial/Pro is *simpler*. Marketing point. |
| **Cantonal Datenaustausch fragmentation** | Universal across CH | Coltivio must support at least Gelan + the largest 3–5 cantonal systems early. Table stakes. |
| **Industry-owned tooling** | Barto (fenaco), UFA Herd Support (UFA = fenaco), xarvio (BASF), FarmOffice (NEXT Farming / Claas) | Independence is rare. Lean on it. |

---

## 8. Coltivio positioning

### 8.1 Where Coltivio wins

| vs. | Coltivio's edge |
|---|---|
| **Barto** | Independence (no fenaco data conflict); modern mobile-first; commerce integrated; open-source as guarantee of data ownership |
| **Smartfarm** | Broader scope (livestock + commerce, not just fields); IT language; mobile-first vs. PWA; multi-seat collaboration model |
| **Agrosoft Swiss** | UX modernity; multilingual (Agrosoft DE-only); open-source; web stack accessible to anyone (Agrosoft requires installation/onboarding); transparent pricing |
| **eFeldkalender** | FR + IT + EN coverage; livestock; commerce; one platform vs. specialist tool |
| **Agroplus** | UX, openness, livestock + commerce in same product, mobile-first depth |
| **Helm / dsp-Agrosoft** | Native TVD (not HIT-Tier); Swiss compliance; web-native; integrated with fields |
| **Pinus / AgroOffice** | Not competing — likely **integrate** via exports rather than compete on accounting |

### 8.2 Where Coltivio loses (be honest)

- **No distribution.** Barto has 67 fenaco-LANDIs offering hand-holding. Smartfarm has IP-SUISSE membership list. Coltivio has neither. This is *the* go-to-market constraint.
- **No institutional credibility.** AGRIDEA / SBV stamp on AGRO-TECH; BFS / IP-Suisse on Smartfarm. Coltivio is new and unbranded for the target audience.
- **Cantonal Datenaustausch coverage.** Barto supports all cantonal export formats. Coltivio needs to grind through these one by one (Gelan first → LAWIS → Wallis → Acorda etc.).
- **Suisse-Bilanz, Kontrolldossier, advisor-data modules.** Barto already ships these. Roadmap items for Coltivio.
- **No accounting.** Pinus / Averio own this; farmers will keep using them and want Coltivio to export cleanly.
- **Per-seat is unusual.** Swiss farm software is sold per-farm, one fee. A solo owner-operator looking at "CHF 15/seat/month" must mentally multiply — vs. "CHF 139/year" which is a single number. Reframe the marketing copy as "CHF 180/year for the working farmer, +CHF 180/year per helper". Lead with the *farm* price, not the *seat* price, on the public site.
- **Cold-start trust deficit.** Farmers buy from someone they've met at OLMA or via their LANDI. Coltivio needs a physical presence story.

### 8.3 Recommended target segment for the first 1,000 customers

**Primary: Swiss small-and-mid family farms (<50 ha) with both crops and animals, doing some direct sales, run by an owner-operator under 50, French- or Italian-speaking by preference.**

Rationale, ranked:

1. **Multi-feature need** — Smartfarm/eFeldkalender cover fields only; Helm/dsp cover animals only; Coltivio's "all four" (animals + fields + commerce + tasks) only pays off if the customer actually has all four. That's the small mixed family farm, not the specialist arable operation.
2. **Romandie + Ticino under-served** — most major tools are DE-only or DE+FR. IT speakers in Ticino have very little (only Agroplus and Barto). Coltivio's IT support is a wedge with low competitive density.
3. **Direct-sales orientation** — Coltivio's commerce module is the only one of its kind in this competitive set besides Agrosoft's Faktura. Farms that sell at the door, run sponsorships, or have CSA-style customers cannot be served by Barto today.
4. **Under-50 owner-operator** — smartphone-native, willing to try a new brand, less locked into existing Pinus/Agro-Twin habits.
5. **Bio / IP-Suisse leaners** — the "data ownership" message resonates more here. (IP-SUISSE farmers will lean Smartfarm first; bio independents are the wedge.)

### 8.4 Sharpened differentiator (for the homepage)

> **Coltivio is the mobile-first, open-source farm manager for Swiss family farms — your fields, animals, and customers in one app, owned by you, not by an agribusiness.**

(German variant for the de homepage:)

> **Coltivio ist der mobile-first, quelloffene Hofmanager für Schweizer Familienbetriebe — Felder, Tiere und Direktvermarktung in einer App. Deine Daten gehören dir, nicht der Agrarindustrie.**

### 8.5 Risks (what could kill Coltivio)

| Risk | Likelihood | Mitigation |
|---|---|---|
| **Barto fixes UX and adds direct-sales** | Medium. Fenaco has the capital but historically slow; UX rewrite already happened in 2025, scope creep into commerce is unlikely (would conflict with fenaco's retail partners). | Build commerce moat fast (sponsorships, CSA, invoicing). Brand as the independent alternative. |
| **Smartfarm expands beyond field calendar into livestock + commerce** | Medium-low. IP-SUISSE's focus is compliance/labelling, not operations. But Agrosolution AG could drive this. | Move faster on livestock + Swiss FR/IT. |
| **Agrosoft Swiss modernises** | Medium-low. 30-year-old shop with installed base; modernisation efforts in this category are slow. | Open-source velocity vs. closed-shop SME. |
| **A LANDI / cooperative builds their own tool** | Low–medium. fenaco-LANDIs already have Barto as the answer. A non-fenaco LANDI alliance could fund a competitor. | Court at least one cooperative as a distribution partner early. |
| **Cantonal monopolies on Datenaustausch** | Real. Cantons can favour Barto by tightening export formats. | Lobby BLW for open standards; document non-discrimination. |
| **App Store / Play Store policy on commerce** | Low for Coltivio (web-only Stripe = Spotify model is approved); but app-store reviews can be unpredictable. | Keep purchase flow strictly web; clear listing copy. |
| **Slow farmer trust in a new brand** | High. This is *the* core risk. | Cantonal demos, OLMA presence, partnerships with bio-associations, Coltivio-branded farm stories. |

### 8.6 What would have to be true for Coltivio to win

- **Three cantonal exports shipped within 12 months** (Gelan + LAWIS + Wallis at minimum).
- **Suisse-Bilanz module shipped within 12 months.**
- **At least one bio / IP-Suisse / cantonal partner association** willing to recommend Coltivio.
- **A founder or two physically present** at OLMA Suisse, Tier&Technik, AgriEMOTION events.
- **Trilingual marketing site live in DE/FR/IT** before the first paid campaign.
- **Verbal commitments from 10 pilot farms across all three language regions** before public launch.

If three of those six aren't true within 12 months, the strategy probably needs to compress: smaller footprint, sharper niche (e.g., "Romandie bio farms doing direct sales" full stop, no expansion).

---

## 9. Sources

**Barto**
- https://www.barto.ch/
- https://www.barto.ch/bausteine
- https://www.barto.ch/de/aktuell/medien-ecke
- https://www.barto.ch/de/beratung-und-hilfe/neuheiten-ab-januar26
- https://www.bauernzeitung.ch/artikel/landtechnik/barto-der-alleskoenner-354352
- https://www.bauernzeitung.ch/artikel/organisationen-firmen/barto-uebernahme-von-365-farm-net-neue-abrechnung-neues-lizenzpaket-549437
- https://www.bauernzeitung.ch/artikel/landtechnik/barto-waechst-langsam-und-kommt-mit-neuen-bausteinen-389463
- https://www.bauernzeitung.ch/artikel/agrarpolitik/barto-wird-komplett-schweizerisch-was-bedeutet-das-551621
- https://uniterre.ch/de/barto-wie-konnte-es-soweit-kommen/
- https://www.ufarevue.ch/newsticker/barto-ist-jetzt-ganz-schweizerisch
- https://www.diegruene.ch/artikel/landtechnik/barto-powered-by-365farmnet-digitaler-hof-manager-fuer-schweizer-landwirte-380766

**Agrosoft Swiss**
- https://www.agrosoft.ch/
- https://www.agrosoft.ch/Farmsolution

**Smartfarm / IP-SUISSE**
- https://www.smartfarm.ch/
- https://www.ipsuisse.ch/produzenten/services/
- https://www.ipsuisse.ch/willkommen-bei-smartfarm/
- https://www.schweizerbauer.ch/artikel/ip-suisse-lanciert-neuen-feldkalender-smartfarm
- https://digiagrifood.ch/digiblogs/smartfarm-feldkalender

**eFeldkalender**
- https://feldkalender.ch/
- https://apps.apple.com/ch/app/efeldkalender/id1580609483

**Agroplus**
- https://agroplus.ch/de/app/
- https://agroplus.ch/de/feldkalender/
- https://agroplus.ch/de/agroplus-oeln/
- https://www.bauernzeitung.ch/artikel/landtechnik/agroplus-das-einfachste-online-tool-fuer-den-feldbau-354353

**AGRIDEA / AGRO-TECH**
- https://www.agridea.ch/de/dienstleistungen/unsere-produkte/software/
- https://www.agridea.ch/de/unser-angebot/produktuebersicht/software/agro-tech/
- https://www.bauernzeitung.ch/artikel/landtechnik/agro-tech-reduktion-auf-das-wesentliche-354346

**Pinus**
- https://pinus-buchhaltungssoftware.ch/landwirtschaft/
- https://pinus-buchhaltungssoftware.ch/pinus21/
- https://www.swissmadesoftware.org/en/companies/pinus-ag/home.html

**AgroOffice / Agro-Twin / Averio**
- https://www.agro-office.ch/wp/
- https://agro-twin.ch/
- http://www.agro-office.ch/wp/wp-content/uploads/2020/01/Preisliste.pdf
- https://www.agro-office.ch/wp/wp-content/uploads/2023/12/Schreiben-Preiserhoehung.pdf

**FarmOffice.ch / NEXT Farming**
- https://www.farmoffice.ch/
- https://www.nextfarming.com/

**Helm-Software**
- https://helm-software.de/produkte/multirind
- https://helm-software.de/produkte/farmface
- https://www.topagrar.com/technik/news/ackerschlagkartei-helm-ackerchef-der-sprinter-12507036.html

**dsp-Agrosoft**
- https://www.dsp-agrosoft.de/en/
- https://www.dsp-agrosoft.de/en/product/herdeplus/
- https://www.dsp-agrosoft.de/produkte/schafplus/

**UFA Herd Support**
- https://www.ufa.ch/tiere/rindvieh/milchvieh/ufa-herd-support/
- https://www.ufa.ch/25-jahre-ufa-herd-support-uhs

**Isagri / Geofolia**
- https://www.agrarsoftware.ch/
- https://www.agrarsoftware.ch/geofolia.html

**xarvio Field Manager**
- https://ag.xarvio.com/germany/field-manager.html
- https://ag.xarvio.com/germany/field-manager/preise

**Farmdok**
- https://www.farmdok.com/en/prices/
- https://www.capterra.ch/software/203519/farmdok

**Smart Farm Tech (irrigation, separate market)**
- https://smart-farm.ch/

**Swiss agriculture statistics**
- https://www.agrarbericht.ch/de/betrieb/strukturen/betriebe
- https://www.bfs.admin.ch/bfs/de/home/statistiken/land-forstwirtschaft/landwirtschaft/strukturen.html
- https://www.happytimes.ch/news/gute-nachrichten/38996-happyfarmer-schweiz-zaehlte-2025-ueber-46000-bauernbetriebe-und-152-millionen-kuehe-bio-anbauflaeche-legte-weiter-zu/
- https://www.sbv-usp.ch/de/services/agristat-statistik-der-schweizer-landwirtschaft/statistische-erhebungen-und-schaetzungen-ses/

**Cross-cutting**
- https://www.ufarevue.ch/betriebsfuehrung/digitale-tools-fuer-die-schweizer-landwirtschaft
- https://www.agrarheute.com/management/finanzen/mobile-ackerschlagkarteien-anbieter-444604
- https://www.diegruene.ch/artikel/pflanzenbau/feldkalender-von-barto-und-agroplus-im-test-353812 (behind paywall)
- https://www.schweizerbauer.ch/tag/digital-farming/
