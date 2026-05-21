# Coltivio vs. Top Competitors — Deep-Dive Comparison

Companion to `coltivio-market-research.md`. Six competitors picked as the two biggest threats per segment:

| Segment | #1 | #2 |
|---|---|---|
| Full-suite | **Agrosoft Swiss** | **Barto** |
| Crop / agronomy | **Smartfarm** (IP-SUISSE) | **Agroplus** |
| Livestock | **Agrosoft Kuhtime** | **Helm-Software (MultiRind / Myfarm24)** |

For each: positioning vs. Coltivio, where Coltivio wins, where Coltivio is missing features, and a concrete action list to close the gaps.

---

## 1. Full-suite: Agrosoft Swiss (Farmsolution)

### Snapshot
30+ years old, Swiss-developed, Swiss data centres. Modular product family built around one shared database:

- **Feldmanager** — crop production, SwissGAP-compliant
- **Kuhtime Serie** — dairy herd management (covered in detail in §6)
- **Rima** — beef-cattle fattening analytics
- **Agrosem** — insemination + vet billing software
- **Faktura** — direct-sales orders, debtor management
- **Agrobuchhaltung** — accounting (their "Flaggschiff")
- **Farmsolution** — the integrated platform layer + mobile app

Pricing is sales-led / not published. DE-only.

### Positioning against Coltivio
Agrosoft is the **closest functional analogue** to Coltivio in the entire Swiss market. Both pitch a single tool for fields + animals + commerce. The differences are nearly all about *how* — UX vintage, language coverage, ownership model, pricing transparency — not *what*.

If a Swiss small-mid farm has shopped around and has *not* bought Barto, the next product they'll evaluate is Agrosoft. This is the **silent incumbent** for Coltivio's target profile.

### Where Coltivio wins
- **UX modernity.** Coltivio is a 2024–2026 React/RN codebase. Agrosoft has a decade-plus visual heritage and a desktop-first installation feel. Younger owner-operators feel this in 30 seconds.
- **Mobile-first depth.** Agrosoft has a mobile app, but it's clearly the companion to a desktop product. Coltivio's RN app is the primary interface; the web app is the desktop counterpart. The mental model is inverted.
- **Open source + AGPL.** Verifiable data ownership. Agrosoft says *"Ihre Daten sind geheim"* — Coltivio can *prove it* by being inspectable.
- **Multilingual.** Coltivio ships DE/FR/IT/EN. Agrosoft is DE-only — a hard wall for Romandie and Ticino farmers.
- **Pricing transparency.** Public CHF 15/seat/month vs. "contact sales." Modern B2B-SaaS pattern that under-50 buyers expect.
- **Web-native deploy + auto-updates.** Agrosoft's installable-software heritage means version migrations are a customer event. Coltivio's web stack ships continuously.

### Where Coltivio is missing
- **Accounting (Agrobuchhaltung).** Agrosoft's flagship is real double-entry farm bookkeeping with year-end close, automatic posting, and learning behaviour for repeat entries. Coltivio has **no accounting** — and shouldn't try to compete here.
- **Insemination/vet billing (Agrosem).** A specialised module Swiss inseminators and vets use; integrates with breeding associations.
- **Mixed-feed calculation (Kuhtime).** Recipe formulation for total mixed ration (TMR). Coltivio doesn't model rations.
- **Beef fattening performance analytics (Rima).** Daily gains, fattening period analysis, throughput tracking. Coltivio tracks animals but doesn't model fattening cohorts.
- **Mature data-import pipelines.** 30 years of importing from breeding associations (Swissherdbook, Braunvieh Schweiz, Holstein), insemination organisations, milk performance test data. Coltivio is at zero on these third-party connectors.
- **Single shared-database architecture across modules.** Agrosoft's selling point: one master record, multiple lenses. Coltivio has this in principle (one Postgres schema), but the feature surface across "lenses" is narrower today.

### What Coltivio should do
1. **Stop pretending it will compete on accounting.** Ship a clean export to Pinus and AgroOffice/Averio and position those as the accounting backbone. Treat them as partners, not competitors.
2. **Build the Swiss-association data import** to neutralise Agrosoft's 30-year integration lead — at minimum Swissherdbook, Braunvieh Schweiz, milk-performance data (LBE). Without these, the dairy customer cannot leave Agrosoft.
3. **Add ration / mixed-feed planning** as a Pro-tier add-on within 12 months. This is a high-perceived-value feature for dairy and beef.
4. **Add a fattening-cohort view** (start weight, daily gain, slaughter date) — Rima-equivalent, lighter UI.
5. **Lead with the open-source/data-ownership story on the dairy page.** Agrosoft's "Daten sind geheim" claim is the same promise without proof.

---

## 2. Full-suite: Barto

### Snapshot
Fenaco's digital arm (68% ownership since Dec 2024). Fully Swiss since 2 July 2025 (acquired the 365FarmNet product from Claas for Switzerland). ~5,000 users. ~CHF 100k revenue, CHF –2.8M loss in 2023. 21 modules; CHF 139/yr bundle covers the five "compliance staples"; à-la-carte modules CHF 29–150. Free tier includes basic Feldkalender + advisor-side data.

### Positioning against Coltivio
Barto is **the noisy giant**. Distribution via 67 fenaco-LANDIs, partnerships with LANDOR / UFA / AGROLINE / MELIOR, cantonal-export coverage across all 26 cantons. The product is genuinely improving (2025 mobile rewrite, Swiss data hosting). But it's politically contested: Uniterre's data-conflict critique is widely cited, and adoption has been slower than the marketing implies.

For Coltivio, Barto is not the most dangerous *product* — it's the most dangerous *narrative*. Most Swiss farmers will hear about Barto first, simply because of LANDI presence. Coltivio's job is to be the credible alternative when they ask "is there anything else?"

### Where Coltivio wins
- **Independence from agribusiness.** Barto's data-protection policy explicitly grants fenaco-informatique staff access. Coltivio is open-source and unaffiliated. For a farmer who already feels squeezed by fenaco distribution, this is decisive.
- **Mobile-first.** Despite the 2025 rewrite, Barto's app still wraps a web-style modular UI. Coltivio's RN app is field-ergonomic.
- **Direct-sales commerce.** Barto has zero commerce/invoicing/sponsorship features and is unlikely to build them (commercial conflict with fenaco's retail layer).
- **Simpler pricing.** One Pro tier (CHF 15/seat/mo) vs. 21 modules to evaluate. The Barto matrix is exhausting — read the Bausteine page once, and you'll see what farmers grumble about.
- **Bundled multilingual.** Barto supports DE/FR/IT but module quality reportedly varies; Coltivio's i18n is first-class.
- **Auslauf-journal UX as a competitive feature.** Both have it; Coltivio's mobile-first capture is plausibly faster in the barn.

### Where Coltivio is missing
- **Suisse-Bilanz module.** Barto's CHF 49 module computes nutrient balance — required for direct payments. **Coltivio must have this.** No serious dairy/arable farmer will switch until it does.
- **Kontrolldossier (inspection dossier).** CHF 49 module — auto-compiles compliance documentation. Tied to cantonal control schedules. Table stakes.
- **All-canton Datenaustausch.** Barto exports to every cantonal system. Coltivio supports Geoadmin parcel reads; cantonal report exports are not yet feature-comparable. Each canton has its own format (Gelan, LAWIS, Acorda, etc.).
- **Suisse-Bilanz, Rumiplan, Fertiplan, AGROLINE/LANDOR advisor-data integrations.** Barto's tight integration with fenaco-advisor data is — paradoxically — also a feature: advisors push fertiliser plans straight into the calendar. Coltivio has no advisor channel.
- **Distribution channel.** 67 LANDIs offering on-site Barto setup. Coltivio has nobody walking in the kitchen door to install the app.
- **Institutional history.** Barto descends from Agridea + Identitas — quasi-federal credibility, even if the current ownership is private.
- **Two-Swiss-data-centre hosting story.** Barto loudly markets this since July 2025. Coltivio uses Supabase (good, but messaging needs polish — "where does my data live?" is a real farmer question).

### What Coltivio should do
1. **Ship Suisse-Bilanz within the next 6–9 months.** Non-negotiable. Without it Coltivio is not a real Barto alternative for arable + dairy farms.
2. **Ship Kontrolldossier compilation** (PDF/zip export of all required compliance docs for an inspection). 6–12 months.
3. **Pick 3 cantonal Datenaustausch formats and ship them.** Suggested order: Gelan (BE/SO/FR/SZ etc.), LAWIS (LU/AG/UR/OW/NW/ZG), and Acorda (ZH). That's ~60%+ of farms covered. Then layer Wallis and the Romandie cantons.
4. **Be transparent about hosting.** A simple line on the website: *"Coltivio läuft auf Supabase in Frankfurt; auf Wunsch Hosting in der Schweiz im Selfhost-Modus (AGPL)."* That converts the open-source story into a hosting promise.
5. **Counter-narrative content.** A blog post / explainer comparing Barto's data-access policy (linked, quoted) to Coltivio's open codebase. Don't be aggressive — be factual. Let Uniterre do the rhetorical work.
6. **Find a non-fenaco distribution partner.** Possible candidates: Bio Suisse (independent of fenaco), KAGfreiland, one of the cantonal Bauernverband chapters that has friction with fenaco, or one of the smaller producer labels (Demeter, Naturaplan-adjacent). Barto's 67 LANDIs are unbeatable in pure reach but Bio Suisse's ~7,800 farms is a real, addressable slice that *will not* buy Barto.

---

## 3. Crop / agronomy: Smartfarm (IP-SUISSE + Agrosolution)

### Snapshot
Launched 31 July 2024. Backed by IP-SUISSE (one of the largest Swiss producer labels) and Agrosolution AG. CHF 80/yr for IP-SUISSE members, CHF 120/yr otherwise. 6-month free trial both variants. Web + PWA-style mobile. DE + FR. Two Swiss data centres. Gelan + LAWIS + Wallis cantonal integration. PCI-DSS.

### Positioning against Coltivio
Smartfarm is the **fastest-moving direct threat in the field-calendar segment**. It launched ~18 months ago, has IP-SUISSE's distribution baked in, and is priced below every competitor including Barto's bundle. It currently focuses on fields + journals; if it extends into commerce or livestock, the threat to Coltivio compounds.

### Where Coltivio wins
- **Scope.** Smartfarm covers fields + journals + nutrient balance. Coltivio adds livestock (TVD-native), tasks, and commerce. A mixed family farm gets one bill instead of three.
- **Italian language.** Smartfarm is DE/FR only; Coltivio adds IT — a clean Ticino wedge.
- **English language.** Smartfarm has no EN. Coltivio's EN is a small but real edge for international Swiss-resident farmers and seasonal-worker UIs.
- **Open source.** Smartfarm is closed-source SaaS. Coltivio offers self-host + AGPL.
- **Mobile-first native app.** Smartfarm's mobile is browser-installed PWA. Coltivio is RN/Expo native.
- **Multi-seat collaboration.** Coltivio's seat-based model is built around multiple users with roles. Smartfarm's per-farm flat rate doesn't model employees/helpers as first-class users.
- **Commerce / direct sales.** Not in Smartfarm. Coltivio has it.

### Where Coltivio is missing
- **IP-SUISSE distribution muscle.** Smartfarm is sold to IP-SUISSE members at half price. ~20,000+ IP-SUISSE farms get a marketing nudge directly from their label. Coltivio cannot match this through advertising — only through partnership.
- **Nutrient-balance / Suisse-Bilanz tightness.** Smartfarm's *"Journal Düngemitteleinsatz"* is wired to Suisse-Bilanz. Coltivio's nutrient story is currently weaker.
- **Cantonal exports (Gelan + LAWIS + Wallis confirmed).** As noted for Barto. Smartfarm has three exports day-one because Agrosolution AG already had them; Coltivio starts from zero.
- **6-month free trial vs. Coltivio's 60-day trial.** Smartfarm's 6 months is 3× longer. A farmer who tries it during one growing cycle (spring → autumn) gets the full value before paying. Coltivio's 60-day window doesn't span a season.
- **PCI-DSS certification.** Coltivio uses Stripe (which is PCI-compliant at the provider level), but doesn't market a security badge. Smartfarm does.
- **"Von Bauern, für Bauern" brand positioning.** Smartfarm uses this slogan — peer credibility that Coltivio needs to build separately.

### What Coltivio should do
1. **Extend the trial.** 60 days does not span a Swiss growing season. Options: (a) extend to 90 or 120 days, (b) offer a "Pilotsaison" SKU at CHF 0 for the first growing season (Mar–Oct) with payment kicking in only at harvest closing. The "Spotify Premium for 3 months" pattern works here too.
2. **Match the Suisse-Bilanz UX exactly.** When Smartfarm wins side-by-side comparisons, this is the field where it wins. Coltivio's `field_calendar` permission needs to ship a Suisse-Bilanz-equivalent within the same UI flow as fertiliser logging — not as a separate "report."
3. **Lead with multilingual + multi-feature on the public site.** Smartfarm cannot match these without years of work.
4. **Get one *non-IP-SUISSE* producer label onboard.** Bio Suisse, KAGfreiland, ProSpecieRara, or Demeter. Match the IP-SUISSE distribution lever with an analogous one — for the segment Smartfarm doesn't optimise for.
5. **Add a "switch from Smartfarm" import** within 12 months. CSV ingest of field history + journals so a 2024–25 Smartfarm trial user can carry their data to Coltivio without retyping.

---

## 4. Crop / agronomy: Agroplus

### Snapshot
**Agroplus Software SA**. ~2,200 Swiss users. Native iOS + Android + web (Agroplus Technik). **DE / FR / IT trilingual** — the only Swiss field tool besides Coltivio with this coverage. Suisse-Bilanz N/P₂O₅ controls and ÖLN reporting tightly integrated. Multi-farm + multi-device sync. Pricing not public.

### Positioning against Coltivio
Agroplus is the **language-coverage twin**. Where Smartfarm out-distributes Coltivio in DE, Agroplus already serves the FR/IT segment Coltivio plans to enter. Less marketing noise than Barto/Smartfarm, but a real, sticky 2,200-user base that already trusts the brand.

### Where Coltivio wins
- **Open source / self-host.** Agroplus is closed SaaS.
- **Mobile-first depth.** Agroplus has native mobile, but it's a field-calendar app. Coltivio's mobile is full-feature for animals + commerce too.
- **Livestock + commerce + tasks.** Agroplus is field-focused; livestock is at best a thin journal. Commerce/sponsorships absent.
- **Public, transparent pricing.** Agroplus pricing isn't on the site.
- **Modern stack / UX velocity.** Agroplus's UI is functional but visually dated; Coltivio's shadcn/ui + React 19 stack is a generation ahead.

### Where Coltivio is missing
- **Trilingual maturity.** Agroplus shipped DE/FR/IT years ago. Coltivio claims it but FR/IT polish (locale-specific terminology, FR/IT-region cantonal exports, FR/IT-language support staff) lags. Concretely: Agroplus's *Bilan de fumure* in FR uses the right Romandie phrasing; Coltivio's auto-translations probably don't.
- **2,200-user trust base.** Long-tail "I've used it for 7 years, why switch" inertia.
- **Multi-farm / multi-smartphone sync.** Agroplus markets it explicitly: one user → many farms, one farm → many smartphones. Coltivio supports this conceptually via memberships but doesn't market it.
- **ÖLN reporting depth.** Tight, mature reports. Coltivio's ÖLN story is largely unbuilt today.
- **Suisse-Bilanz computation in the same UI as logging.** Same gap as Smartfarm — Agroplus shows remaining N/P quota *while you're entering the fertiliser application*. Powerful UX.

### What Coltivio should do
1. **Audit FR/IT translations with native Swiss speakers.** Hire one Romand and one Ticino farmer-consultant for a translation review. Auto-translated agricultural terminology is a tell. Coltivio's claim of trilingual support is only true if a Vaudois farmer recognises every term.
2. **Add region-specific cantonal export to Wallis / Ticino early.** Owning the FR/IT cantonal-export space before Agroplus extends would be a moat.
3. **Market multi-farm support explicitly.** A meaningful number of Swiss farmers run more than one operation (alp + main farm, or two family farms). Make it a feature page.
4. **Treat Agroplus, not Smartfarm, as the FR/IT champion to beat.** Different competitor for different language regions.

---

## 5. Livestock: Agrosoft Kuhtime

### Snapshot
Part of the Agrosoft Swiss / Farmsolution suite (§1). Specifically dairy + suckler-cow management. Core functions per Agrosoft:

- Animal data master record (Tiere)
- Feeding planning (Fütterungsplanung)
- Breeding/pairing planning (Zuchtplanung)
- Mixed-feed / ration calculation (Mischfutter)
- Heat detection support (Brunsterkennung) via CattleData integration — animal location, movement analysis, recognition at milking stand / robot / selection gate
- Fertility / reproductive performance (Zwischenkalbezeit, Besamungsindex)
- Direct sync to Zuchtdaten of breeding associations
- TVD online

Sold sales-led; pricing not public.

### Positioning against Coltivio
Kuhtime is the **Swiss-native dairy benchmark**. Where Helm and dsp-Agrosoft are German-market products bolted onto Switzerland with HIT-Tier mappings, Kuhtime is built around TVD + Swiss breeding associations natively. For a dairy farm with >30 cows, this is the default option for serious herd management.

### Where Coltivio wins
- **Open-source, AGPL, transparent data handling.** Kuhtime is closed.
- **Mobile-first.** Kuhtime is module-on-desktop-with-mobile-companion. Modern dairy operators living in the milking parlour want mobile-primary.
- **Multilingual (DE/FR/IT/EN).** Kuhtime is DE-only.
- **Integrated with crops + commerce in the same app.** A mixed dairy farm using Kuhtime needs Feldmanager + Faktura too — Coltivio is one tool for the same.
- **Modern data-platform.** Postgres + RLS + Drizzle is more extensible than Kuhtime's classic architecture for future integrations.
- **Treatment-journal UX with withdrawal-period enforcement.** Coltivio's treatment-journal flow is purpose-designed for mobile field capture. Kuhtime's heritage is forms.

### Where Coltivio is missing
This is the segment where Coltivio's gaps are **largest**:

- **Heat detection / fertility cycle.** Kuhtime + CattleData integration recognises heat from movement and milking-stand data. Coltivio has no sensor-derived insights.
- **Mixed-feed ration calculation (TMR formulator).** Recipe engine for total mixed ration. Not in Coltivio.
- **Reproductive performance metrics.** Calving interval, insemination index, days-open by cow and herd. Coltivio tracks calvings/inseminations but doesn't compute these standard KPIs.
- **Milk performance test (MLP) import.** Swiss dairy farms get monthly milk records from LBE-Suisse / Suisseag. Auto-importable in Kuhtime; not in Coltivio.
- **Breeding association sync.** Swissherdbook, Braunvieh Schweiz, Holstein Switzerland send/receive structured data. Coltivio is not yet on these lists.
- **Suckler-cow / fattening planner (Rima-equivalent).** Cohort-level beef analytics.
- **Insemination/vet billing (Agrosem-equivalent).** Niche but real for farms that double as small insemination centres.
- **Veterinarian-portal access.** Vets log into Kuhtime to enter treatments directly. Coltivio's role model doesn't yet expose a "vet collaborator" pattern.

### What Coltivio should do
1. **MLP import first.** Monthly milk-performance test data import is the *single* feature that, if missing, eliminates Coltivio from dairy farms over 20 cows. It's structured data — solvable in 1–2 sprints.
2. **Breeding-association sync next.** Swissherdbook + Braunvieh Schweiz first. Coltivio's animal model already supports the right fields; this is an integration project, not a data-model project.
3. **Compute the dairy KPIs.** Zwischenkalbezeit (calving interval), Besamungsindex (services per conception), Days Open, Milking Days. Pure data-derivation work over the existing journal data.
4. **Add a vet-collaborator role.** Permission model needs a "vet user" who can log treatments but doesn't see commerce. Re-use the existing membership/permission table.
5. **Ration calculator (TMR planner) as a Pro add-on.** This is the highest-perceived-value feature for dairy. Even a basic version closes the obvious gap.
6. **Sensor-integration story.** Without inline heat detection, Coltivio is a record-keeper, not a herd manager. At least ship a CSV import for the major Swiss sensor brands (DeLaval, Lely, GEA) so manual data fits the same KPIs.
7. **Don't try to beat Agrosoft on suckler-cow analytics in v1.** Pick dairy first — bigger TAM, sharper need.

---

## 6. Livestock: Helm-Software (MultiRind / Myfarm24)

### Snapshot
German vendor (helm-software.de). Three product lines documented on their homepage:

- **Ackerchef** — crop documentation (Schlagkartei)
- **Myfarm24** — full-farm documentation/planning/evaluation (their farm-management product)
- **ISODESK** — ISOBUS / application maps / GIS desktop extension

The livestock product **MultiRind** lives on a sub-page. Per earlier search data: hybrid program retrieving cattle inventory from **HIT-Database** (the German equivalent of TVD), companion **Smartrind WebApp** for cloud-based animal info / appointments / work processes, evaluations covering fertility analysis, performance comparisons, and analytics for young stock, fattening, and breeding cows. Mobile app **Farmface**. **MultiRind ~€790** (one-time licence pricing).

Swiss localisation is **limited** — bound to HIT-Tier, not TVD-native.

### Positioning against Coltivio
Helm represents the *"good enough" German import* — feature-rich, mature, but with a Swiss-localisation friction tax. Most Swiss dairy farms that buy Helm are doing so because their German neighbours or advisors recommended it, despite the HIT-Tier/TVD impedance mismatch. The product is genuinely deep on herd analytics in a way Kuhtime arguably isn't, but it asks the Swiss farmer to live in a DE-context UI.

### Where Coltivio wins
- **TVD-native vs. HIT-Tier-bound.** Coltivio reads/writes Swiss TVD directly. Helm requires either manual mapping or a Swiss bridge.
- **Swiss cantonal exports.** Helm doesn't do them; Coltivio will (once it ships them).
- **Modern open-source stack.** Helm is closed Windows-heritage software.
- **Multilingual.** Helm DE-only.
- **Mobile-first.** Helm has Farmface as a companion; Coltivio's RN app is the primary interface.
- **Integrated crops + livestock + commerce in *one* tool.** Helm sells Ackerchef + MultiRind + Myfarm24 as separate products.
- **Treatment-journal with withdrawal-period enforcement tied to Swiss regulation** — Coltivio's specific Swiss compliance flow vs. Helm's German-default semantics.

### Where Coltivio is missing
- **Deep dairy analytics** (same gap as for Kuhtime — MLP, fertility KPIs, performance trend analysis). Helm has *more* of this than Kuhtime, arguably.
- **Sensor / milking-robot integrations.** Helm connects to several major dairy hardware lines (per industry knowledge, though specific list is on sub-pages not fetched). Coltivio has no hardware integrations.
- **ISOBUS / application-maps capability.** Helm's ISODESK product. For precision-ag arable customers, this matters; Coltivio plot-mapping is geometry + journals, no application-map export.
- **One-time pricing model.** ~€790 once vs. CHF 15/seat/month subscription. Over 5 years Coltivio is more expensive for a solo operator; over 10 years for a multi-seat farm it's similar. Some Swiss farmers structurally prefer one-time over subscription. (Counter-argument: ongoing cloud updates and Swiss data hosting are easier to justify under subscription.)
- **Years of Schlagkartei reviews and Swiss-press coverage** (Ackerchef has won press shootouts vs. Barto in Schweizer Bauer coverage we saw earlier — Coltivio has zero press footprint).

### What Coltivio should do
1. **The Helm-specific work overlaps almost entirely with the Kuhtime list** (MLP import, fertility KPIs, breeding-association sync, sensor CSV import, vet role). Don't double-count.
2. **TVD-as-superpower messaging.** Helm's main weakness in Switzerland is its HIT-Tier heritage. Coltivio should publicly demo TVD round-trip — animal birth in app → TVD reporting → confirmation back. Make it a 60-second video.
3. **Hardware-import path.** ISOBUS task files (ISOXML) and the major Swiss-relevant sensor exports (DeLaval DelPro, Lely T4C, GEA DairyPlan). Even read-only CSV imports remove Helm's hardware moat for the small-mid farm segment that doesn't have full hardware integration but needs the data in.
4. **Subscription-friendly framing.** Lead the dairy page with "CHF 15/month covers cloud, updates, Swiss data hosting, and includes future modules" — versus Helm's "€790 + paid major-version upgrades."
5. **Get into Schweizer Bauer / BauernZeitung for a livestock-tool head-to-head test.** *die grüne* did a Barto vs. Agroplus shootout; commission a livestock equivalent. Earned media at the right outlet beats months of ads.

---

## 7. Cross-cutting summary

### Where Coltivio is unambiguously ahead
- Mobile-first architecture
- Open source + AGPL + verifiable data ownership
- Multilingual (DE/FR/IT/EN) — only Agroplus matches and Coltivio adds EN
- Integrated commerce / direct-sales / sponsorships (no major competitor has this)
- Transparent pricing
- Modern stack and iteration velocity

### Where Coltivio is **structurally behind** (must fix to be competitive)
- **Suisse-Bilanz computation** — Barto, Smartfarm, Agroplus all have it; not optional
- **Kontrolldossier auto-compilation** — Barto's CHF 49 module is widely used
- **Cantonal Datenaustausch** — at least Gelan + LAWIS + Acorda + Wallis
- **MLP import + breeding-association sync** for dairy
- **Fertility/dairy KPIs** (Zwischenkalbezeit, Besamungsindex, Days Open)
- **Ration calculator (TMR)** for serious dairy
- **Vet-collaborator role** in the permission model
- **FR/IT translation polish** verified by native Swiss farmers (not just auto-translated)

### Where Coltivio is **strategically behind** (distribution, not features)
- No producer-label partnership (vs. Barto/LANDIs, Smartfarm/IP-SUISSE)
- No physical presence at OLMA / Tier & Technik / AgriEMOTION
- No Schweizer-Bauer / BauernZeitung / die grüne press coverage
- No advisor channel (vs. fenaco-LANDOR/UFA/AGROLINE pushing into Barto)
- New, untrusted brand among >50-year-old farmers

### Where Coltivio should **not** compete
- Accounting / Buchhaltung — Pinus + Averio (AgroOffice/Agro-Twin) own it. Integrate via CSV/QR-Bill export.
- ISOBUS task-file generation / precision-arable mapping — FarmOffice/NEXT Farming territory; needs different customer.
- Hardware/sensor deep integration — leave that to Helm/Kuhtime for now; ship CSV imports instead.

---

## 8. Prioritised action list (next 12 months)

Compiled and ranked across all six competitor analyses. Each item is tied to specific competitors it neutralises.

| Priority | Action | Neutralises | Effort |
|---|---|---|---|
| **P0** | Ship **Suisse-Bilanz** computation inline with fertiliser logging | Barto, Smartfarm, Agroplus | M |
| **P0** | Ship **MLP import** + breeding-association sync (Swissherdbook, Braunvieh) | Kuhtime, Helm | M |
| **P0** | Ship **Kontrolldossier** auto-compilation (zipped PDFs) | Barto | S |
| **P0** | Ship **3 cantonal Datenaustausch formats**: Gelan, LAWIS, Acorda | Barto, Smartfarm | L |
| **P0** | **FR/IT translation audit** with native Swiss farmer-consultants | Agroplus, Smartfarm | S |
| **P1** | **Extend trial** to 90+ days or offer first-growing-season free | Smartfarm | S |
| **P1** | Compute and surface **dairy KPIs** (Zwischenkalbezeit, Besamungsindex, Days Open) | Kuhtime, Helm | M |
| **P1** | Add **vet-collaborator role** to permission model | Kuhtime, Helm | S |
| **P1** | Partner with **one non-fenaco producer label** (Bio Suisse, KAGfreiland, Demeter) | Barto, Smartfarm | M (BD work, not eng) |
| **P1** | **Wallis + Ticino cantonal exports** to own the FR/IT space | Agroplus | M |
| **P2** | **Ration calculator (TMR)** as Pro-tier feature | Kuhtime, Helm | L |
| **P2** | **Sensor/hardware CSV imports** (DeLaval, Lely, GEA) | Kuhtime, Helm | M |
| **P2** | **Switch-from-Smartfarm CSV import** | Smartfarm | S |
| **P2** | **Press strategy**: get into Schweizer Bauer / BauernZeitung / die grüne for a livestock head-to-head | Helm, Kuhtime | M (BD) |
| **P3** | Beef fattening cohort view (Rima-equivalent) | Agrosoft Rima | M |
| **P3** | Counter-narrative blog content on Barto data policy | Barto | S |

Effort scale: S = ≤2 weeks, M = 1–2 months, L = 2–4 months.

If only **three things** ship in the next 6 months, ship **Suisse-Bilanz**, **MLP import**, and **Gelan cantonal export**. Without those three, Coltivio is not a serious head-to-head alternative to Barto + Smartfarm in DE-CH or to Kuhtime/Helm for dairy. With them, the multilingual + open-source + commerce story has a foundation strong enough to stand on.
