# Coltivio pricing plan — Demo / Trial / Pro

## Side-by-side overview

| | **Demo** (free) | **Trial** (60 days) | **Pro** (paid) |
|---|---|---|---|
| Price | CHF 0 | CHF 0 | CHF 15 / seat / month · CHF 150 / seat / year |
| Card required | No | No | Yes (Stripe, web only) |
| Duration | Indefinite | 60 days, one-time | Recurring monthly or annual |
| Entry path | Default on signup | Opt-in from Demo via CTA | Stripe checkout on `app.coltivio.ch` |
| Exit / expiry | None | Auto-downgrade to Demo | Cancel anytime, drops to Demo |
| Seats | 1 (owner only) | Unlimited (just bumps eventual seat count) | Per-seat billing, owner = seat 1 |

---

## Plan 1 — Demo (free preview)

**Purpose:** let prospects evaluate the product without commitment; provide a soft post-trial landing.

### Caps (hard limits)

| Resource | Cap |
|---|---|
| Plots | 3 |
| Animals | 5 |
| Journal entries (treatments, fertilizer, crop protection combined) | 20 total, lifetime |
| Crop rotation plans | 1 |
| Members on farm | 1 (owner only, no invites) |
| History view | Last 30 days only |

### Hard locks (feature-level, regardless of caps)

- No exports — PDF, Excel, print-ready reports all unavailable
- No reports — field-calendar, outdoor-journal, treatment reports locked
- No commerce — contacts, orders, invoices, products, sponsorships hidden
- No tasks
- No crop rotation **draft plans**
- No plot journal (already gated)
- No federal plot layer overlay (Geoadmin)
- No map measurement tools

### What works fully

- Plot map view with own plots
- Animal records (within cap)
- Treatment & journal entry (within cap)
- TVD import preview (but not committing → would exceed cap)
- All UI navigation visible — locked features show a tasteful "Pro" indicator

### Pros
- Zero-friction install + signup
- App Store-friendly: app is genuinely useful without payment
- Post-trial users have a soft landing (not locked out)
- Caps create a clear "I need more" moment for real farms

### Cons
- Some users will settle on Demo and never convert (acquisition cost without revenue)
- Engineering effort to enforce caps cleanly across all client paths
- More complex pricing page than trial-only

### Tradeoff
You give away product evaluation in exchange for a more open top-of-funnel and a softer trial-end UX. Acceptable as long as the caps are tight enough that no real farm can run on Demo.

---

## Plan 2 — Trial (60-day full Pro)

**Purpose:** let qualified Demo users experience the full product and convert.

### Activation
- **Opt-in**, not automatic on signup
- User taps "Start your 60-day free trial" CTA — surfaced on cap-hit moments (6th animal, attempted export, attempted commerce)
- No card collected, no payment intent — just a server-side flag flip
- One trial per farm, lifetime

### Access
- Identical to Pro: all caps removed, all features unlocked, all exports work
- Can invite members during trial — they don't pay (yet), but the seat count is tracked for the eventual subscription

### Expiry
- Day 61: trial flag drops, membership becomes inactive
- Farm auto-downgrades to Demo
- Data is preserved (not deleted) — only visibility and add-quotas are capped going forward
- If at expiry the farm has >5 animals, those animals stay but they can't add a 6th

### Communication cadence (drives conversion)
- T+0 (start): welcome with feature highlights
- T+30 (mid-trial): "Here's what you've logged so far" — value summary
- T-7: pricing + Stripe checkout link (email)
- T-1: in-app banner ("Trial ends tomorrow") — no CTA on mobile, link on web
- T+1 (expired): "Resubscribe to keep full features" email

### Pros
- 60 days covers at least one seasonal event (harvest, treatment cycle, invoice run) — long enough to demonstrate value
- No card up-front means no signup-funnel drop-off
- Opt-in trial means triggered users are pre-qualified — they already felt the friction of Demo caps
- Higher conversion rate than auto-trial because users opt in with intent

### Cons
- Some users may run a full trial and silently drop back to Demo without converting
- 60 days is a long window of zero revenue per user
- Without a card, conversion at expiry is harder than card-on-file SaaS norms

### Tradeoff
You optimize for funnel volume (no card friction) at the cost of expiry-moment conversion. Email + post-trial Demo state must do the heavy lifting that auto-renewal would do in a card-on-file model.

---

## Plan 3 — Pro (paid subscription)

**Purpose:** revenue. The intended long-term home for any real farm using Coltivio.

### Pricing
- **CHF 15 / seat / month**, or **CHF 150 / seat / year** (≈17% annual discount)
- Owner counts as seat 1
- Pure per-seat — no base fee, no included seats
- Stripe subscription with `quantity` reflecting current member count
- Solo farmer: CHF 15/mo or CHF 150/yr; 4-person farm: CHF 60/mo or CHF 600/yr

### Access
- Everything: all features, no caps, all exports, all reports, commerce, tasks, draft plans, Geoadmin layer, full history
- Multi-user — invite members; each addition prorates onto the subscription
- Removing a member prorates a credit

### Billing flow
- Checkout happens **only on web** (`app.coltivio.ch`)
- Stripe webhook → updates `membership` row → all clients see `isActive: true && isPaidMember: true`
- Member adds/removes call Stripe `subscriptions.update({ quantity })` — wrapped in transaction with the local DB update
- Stripe is source of truth for billing; `farm_members` is source of truth for permissions; reconciled on webhook

### Pros
- Predictable per-seat unit economics
- Naturally scales with farm size — small farms pay little, larger farms pay more
- Single price point easy to communicate
- Annual plan provides cashflow + reduces churn

### Cons
- Solo farmers pay full freight (CHF 180/yr) — possibly steep for ag SaaS in CH
- Adds engineering complexity: seat tracking, Stripe quantity updates on member lifecycle, proration handling
- Per-seat billing requires UI confirmation flows ("adding this member will cost CHF X today, prorated")

### Tradeoff
Per-seat is the cleanest scalable model but adds real engineering work and may price out the smallest farms. If post-launch data shows solo-farmer churn is the dominant pattern, a discounted solo-tier (CHF 10/mo) or annual-only solo pricing is easy to layer on later without restructuring.

---

## What this means for the App Store / Spotify model

The free-Demo + opt-in-trial + web-only-Pro model is **the most App-Store-friendly shape** of the options considered. Concretely:

### Apple — Multiplatform Services (3.1.3(b))

| Question | Answer |
|---|---|
| Is the app usable without payment? | Yes — Demo tier is fully functional within caps |
| Is there a substantial web app offering the same service? | Yes — `app.coltivio.ch`, feature-parity |
| Does the app collect payment in-app? | No — Stripe is web-only |
| Does the app link to or promote external payment? | No — anti-steering compliant |
| Does the app require an external account that can only be created elsewhere? | No — signup works in-app |

This is the canonical Spotify / Notion / Linear shape. Apple has explicitly carved out a path for it.

### Google Play

Same posture as Apple. Slightly more permissive post-Epic-v-Google but the conservative Spotify approach satisfies both.

### What the mobile apps **can** show

- Sign up / sign in (free)
- "Start your 60-day free trial" CTA (no payment, allowed)
- Cap-hit messaging: "You've reached the 5-animal Demo limit" — informational only, no CTA
- Trial countdown banners — informational only on mobile, no CTA
- Account screen with generic "Manage account on the web" link (no payment mention)
- "Trial ended. You're now on Demo." — informational

### What the mobile apps **cannot** show

- Any "Subscribe" / "Upgrade" / "Buy Pro" button anywhere
- Any pricing inside the app
- Any URL pointing to Stripe checkout or the pricing page
- Webviews to the web app's billing pages
- Any copy steering users toward external payment ("Get Pro at coltivio.ch", "Cheaper on web", etc.)

### Where users learn about Pro

- **App Store listing page** — fully allowed. Describe pricing, mention web subscription, point at coltivio.ch.
- **Landing page** (`coltivio.ch`) — pricing page lives here.
- **Web app** — anywhere a logged-in free user visits, "Upgrade to Pro" buttons are fine.
- **Email** — five touchpoints during trial, anti-steering rules don't apply.

### Conversion funnel summary

```
App Store install  →  in-app signup (free Demo)  →  hit cap  →  opt-in 60-day trial
                                                                    │
                                                                    ▼
                            email + web-app surfaces drive user to coltivio.ch
                                                                    │
                                                                    ▼
                                                       Stripe checkout (per-seat)
                                                                    │
                                                                    ▼
                                  mobile app sees `isPaidMember: true` on next API call
                                                                    │
                                                                    ▼
                                                       Pro subscription, all caps lifted
```

Every step except Stripe checkout happens in-app on either platform. The web is just the billing surface — once payment is in place, the user spends ~all their time back in mobile.

---

## Engineering implications (high-level)

| Area | What's needed | Estimated effort |
|---|---|---|
| Cap enforcement | API-side checks in animal/plot/journal create endpoints; client-side warnings on approach to cap | ~3–5 days |
| Demo feature lockouts | Reuse existing `permissionMembershipEndpoint` factories; add Demo-specific gates for exports/reports | ~2–3 days |
| Trial opt-in flow | Endpoint to start trial; trial-state tracking; expiry job (already exists as `membership-expiry-cron.ts`) | ~2 days |
| Stripe per-seat | Pass `quantity` on checkout; update on member lifecycle (`farm-invites.accept`, `farm-permissions.kick`); webhook reconciliation | ~5–7 days |
| Post-trial downgrade UX | Mobile + web banners, email sequence (T-7 / T-1 / T+1) | ~3 days |
| App Store listing copy | Pricing page on coltivio.ch + App Store / Play Store description | ~1 day |

**Total ballpark: 2–3 weeks of focused work.**

---

## The model in one line

A capped Demo tier acquires users, an opt-in 60-day Trial converts qualified ones, a web-only per-seat Pro subscription captures the revenue — and because no payment ever happens inside the iOS or Android app, the entire structure sits cleanly inside Apple's and Google's multiplatform-service rules without compromise.
