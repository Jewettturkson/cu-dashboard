# CU Dashboard — Strategic Research Brief

*Last updated: July 2026. Sources linked at the bottom of each section.*

---

## 1. Market & Impact

### Market size

Ghana's formal credit union sector, supervised by the Ghana Co-operative Credit Unions Association (CUA) on behalf of the Bank of Ghana, counts roughly **490 credit unions with ~984,000 members**, GH₵2.68B in total assets, GH₵2.2B in member deposits, and GH₵1.15B in loans outstanding. That is the *formal*, CUA-affiliated layer only.

Beneath it sits the informal susu layer: the Ghana Co-operative Susu Collectors Association (GCSCA) has ~850 registered susu collectors, with hundreds more unregistered, plus an estimated 1,500+ ROSCAs (rotating savings groups), of which only about a third are registered with any regulator. Each collector or group is effectively a one-person credit union with the same fraud and reconciliation problems.

### Addressable market at $2,500/year

- **Formal credit unions (Ghana):** 490 × $2,500 = **~$1.2M ARR ceiling** in Ghana alone. Realistic 5-year capture of 10–20% = $120k–$245k ARR.
- **Susu enterprises & collectives:** thousands of entities, but lower willingness to pay — a lighter $500–$1,000/year tier could serve them.
- **West Africa:** WOCCU-affiliated credit union movements exist in Côte d'Ivoire, Senegal, Burkina Faso, Togo (strong francophone networks under RCPB/FUCEC-style federations), and Nigeria's cooperative societies number in the tens of thousands. The regional ceiling is 10–50x Ghana's.

The honest read: Ghana-only, flat-fee SaaS caps out near $1M ARR. The expansion paths that break the ceiling are (a) per-member or transaction-linked pricing as unions grow, (b) the loan-management module as a premium tier, (c) West Africa, and (d) eventually payments margin on MoMo flows.

### Competitive landscape

Nobody owns the "operating system for credit unions" position in Ghana:

- **Zeepay** ($31M Series B, 2024) — remittance-to-wallet rails; partners with BezoMoney on BezoSusu. Infrastructure, not credit-union software. Potential *partner* (settlement rails), not competitor.
- **Fido** ($30M Series B, 2024; ~800k borrowers) — direct-to-consumer digital lending. Competes for the *end saver's* attention, not for credit union back offices.
- **BezoMoney** — digital susu for individuals and groups, consumer-facing wallet. Closest in spirit, but it *replaces* the susu structure rather than digitizing existing institutions.
- **MFS Africa / Onafriq** — pan-African payment interoperability; a rails provider you'd integrate with later, not a rival.
- **Jisort (Kenya)** and similar core-banking SaaS exist in East Africa but have little Ghana presence and dated UX.

Your wedge is real: white-label back-office software that *keeps the credit union as the institution* rather than disintermediating it. Credit unions don't want to be replaced by an app; they want their existing trust network to work better.

### Regulatory environment

- Credit unions are **exempt from Act 930** (Banks and Specialised Deposit-Taking Institutions Act 2016); they fall under the **Non-Bank Financial Institutions Act 2008 (Act 774)** with day-to-day supervision delegated to **CUA**. Large unions (assets ≥ GH₵60M sustained for a year) can graduate to direct BoG licensing.
- Bank of Ghana finalized a **new tiered microfinance framework**; existing institutions must transition into new categories by **31 December 2026** — expect churn and compliance anxiety among unions, which is a selling opportunity (the software that produces clean records makes compliance easy).
- **Critically: CU Dashboard as pure record-keeping software is not a regulated activity.** You are a technology vendor to a regulated institution. The moment you *hold, move, or instruct movement of funds* (MoMo integration), you enter Payment Systems and Services Act 2019 (Act 987) territory — either obtain a PSP license (slow, capital requirements) or ride on a licensed partner (MTN MoMo API for Business directly, or an aggregator like Hubtel). Plan on the partner route.
- **Data:** Ghana's Data Protection Act 2012 (Act 843) requires registering as a **data controller with the Data Protection Commission** (renewed every 2 years), consent-based collection, purpose limitation, and security safeguards. Cross-border data transfer requires the destination to offer "adequate protection" — Supabase's EU/US hosting is workable with safeguards, but in-country hosting becomes a real conversation at scale (Cybersecurity Act pressure + procurement optics with unions). Budget for DPC registration before onboarding credit union #2.

Sources: [CUA overview](https://cua.org.gh/credit-union/overview/), [CUA role in Ghana](https://www.cuagh.com/about-us/role-in-ghana/), [GCSCA](https://ghanasusu.com/), [Susu collectors — Wikipedia](https://en.wikipedia.org/wiki/Susu_collectors), [Global Legal Insights — Ghana banking](https://www.globallegalinsights.com/practice-areas/banking-and-finance-laws-and-regulations/ghana/), [BoG new MFI framework](https://www.mondaq.com/financial-services/1766082/bank-of-ghana-introduces-new-framework-for-microfinance-institutions), [Fido Series B — TechCrunch](https://techcrunch.com/2024/09/03/ghanas-digital-lender-fido-30m-series-b-round/), [Top fintechs Ghana](https://accrastreetjournal.com/2025/08/31/top-10-fintech-startups-in-ghana-powering-africas-digital-economy/), [BezoMoney](https://www.techinafrica.com/bezomoney-empowering-ghanas-savings-culture-with-digital-solutions-and-financial-innovation/), [Data Protection Act 843](https://nita.gov.gh/wp-content/uploads/2017/12/Data-Protection-Act-2012-Act-843.pdf), [DPC compliance](https://dataprotection.org.gh/compliance/), [DLA Piper — Ghana](https://www.dlapiperdataprotection.com/index.html?t=law&c=GH)

---

## 2. Product Evolution

### MVP gate before pitching credit union #2

The second credit union is a stranger — the product must survive without you in the room. Gate list:

1. **Roles** (admin vs banker) — no union will accept every employee seeing everything.
2. **Audit log** — this *is* the product's fraud pitch; must exist before any sales conversation.
3. **Withdrawals with admin approval** — half of daily operations.
4. **Multi-tenancy** — org_id isolation so union #2's data never touches union #1's.
5. **Onboarding path** — CSV/manual import of existing client books; a union arrives with hundreds of existing savers in paper ledgers.
6. **Daily reconciliation report** — the end-of-day cash count vs system total, printable. This replaces their current ritual, so it must exist.
7. **Backups + uptime story** — "what happens if your laptop dies" has a rehearsed answer.

SMS balance alerts are the strongest *demo* feature but are not strictly gate — they're the first paid add-on.

### Banker mobile experience

**PWA, emphatically.** Native apps fail here: app-store updates are friction, bankers often use low-end Android phones with limited storage, and you need instant iteration during the pilot. The current mobile-first web app installed to the home screen (manifest + service worker) looks and feels native, costs nothing extra, and enables offline caching later.

Design for low digital literacy means: one screen, one action. The banker flow should be: open app → big list of *their* assigned clients → tap client → type amount → confirm → giant green checkmark. No navigation, no dashboard, no settings. Numbers displayed huge (GH₵ in tabular-nums). Every action confirmed with color + icon, not text alone. The `/collect` screen should be usable by someone who has never used anything but WhatsApp and MoMo.

### Client-facing features (the savers)

- **SMS receipts (Phase 2, highest trust ROI):** the moment a deposit is logged, the *client* gets an SMS: "GH₵50 deposited to ACC-0001. New balance: GH₵430." This single feature kills the core fraud vector — the banker can no longer pocket cash silently, because the client's phone stays quiet. Arkesel (from GH₵0.02/SMS, OTP/USSD APIs) or Hubtel (SMS + payments combined) are the local providers; at ~GH₵0.03/SMS, a 500-client union sending 6,000 receipts/month costs ~GH₵180/month — charge it as an add-on.
- **USSD balance check (Phase 3):** `*XXX#` → enter account number + PIN → balance. Works on every phone including feature phones. Requires an NCA shortcode (Form AP19) via a provider like Arkesel — worth it once 3+ unions are live and can share the shortcode.
- **WhatsApp (later):** statement requests and support, not core flows.

### Loan management module (the revenue feature)

Susu-style lending is relationship lending: loans secured by savings history and group trust. The module needs:

- Loan products per union (rate, term, max multiple of savings balance)
- Application → approval workflow (admin approves, records guarantors)
- Disbursement record + repayment schedule generation
- Repayment collection folded into the same banker collect flow (a repayment is just a categorized deposit)
- Arrears view + portfolio-at-risk on the dashboard
- Interest calculation kept dead simple: flat rate or declining balance, chosen per product

This is a Phase 3 feature and the natural premium tier ($1,000–1,500/yr add-on): unions make their money on lending, so software that manages the loan book justifies more spend than record-keeping does.

Sources: [Arkesel SMS API](https://arkesel.com/developer-api/sms-api/), [Hubtel developers](https://developers.hubtel.com/), [USSD shortcode Ghana](https://arkesel.com/how-to-choose-ussd-shortcode-provider-ghana/)

---

## 3. Scaling Architecture

### Multi-tenancy model

**Row-level security with `org_id`, not schema-per-org.** Reasoning:

- At 10 orgs: schema-per-org is manageable but already annoying (migrations × N).
- At 100: schema-per-org migration fan-out becomes an operational hazard; RLS is one schema, one migration.
- At 1000: either works with discipline, but RLS + partitioning is the standard Postgres SaaS pattern, and Supabase's tooling (auth, PostgREST) is built around RLS.

Concrete shape: `organizations` table; every domain table gains `org_id`; `profiles` carries `org_id` + `role`; every RLS policy scopes to `org_id = (select org_id from profiles where id = auth.uid())`. Postgres composite indexes on `(org_id, ...)`. The dangerous failure mode is a missing policy, so: enable RLS on every table by default, deny-by-default, integration test per table that org A cannot read org B.

Schema-per-org only becomes attractive if a large union demands physical data isolation contractually — cross that bridge with a dedicated instance instead.

### MTN MoMo integration

MTN's **MoMo API for Business** ([momodeveloper.mtn.com](https://momodeveloper.mtn.com/)) is live in Ghana with three products:

- **Collections ("Request to Pay"):** the credit union initiates a charge to the client's wallet; client approves with PIN on their phone. This is the deposit flow — banker (or client) triggers RTP, client confirms, money lands in the union's MoMo merchant wallet.
- **Disbursements:** union pays out to a wallet — the withdrawal flow.
- Sandbox with self-provisioned API keys; production requires an MTN business onboarding step **by each credit union** (the merchant account must belong to the regulated union, not to you — this keeps you outside PSP licensing).

Webhook mechanics: you supply a `providerCallbackHost`; MTN calls back with transaction status. Architecture: a Next.js route handler (or Supabase Edge Function) receives the callback, verifies, and inserts the transaction with `method='momo'` and the MTN transaction ID stored in a `momo_ref` column — giving every MoMo deposit an externally verifiable receipt. Poll as fallback (webhooks in this ecosystem are best-effort). Design table changes now (nullable `momo_ref`, `status` enum with `pending/confirmed/failed`) so the integration slots in without a migration crunch.

### Infrastructure path

| Stage | Setup | Trigger to move |
|---|---|---|
| Pilot (now) | Supabase Free + Vercel Hobby | **Free tier auto-pauses after ~1 week inactivity — already bitten once.** Move before real daily use. |
| 1–10 unions | Supabase Pro (~$25/mo) + Vercel Pro | Point-in-time recovery, no pausing, daily backups. Non-negotiable once real money records exist. |
| 10–100 | Supabase Pro with compute add-ons; read replicas for reporting | Query latency on reports; connection limits. |
| 100+ | Dedicated Postgres (self-hosted Supabase or RDS) + in-country replica conversation | Data-residency pressure, cost crossover, need for custom extensions/partitioning. |

### Offline-first for bankers

Reality: bankers work markets and villages with patchy data. Phased approach:

1. **Now (cheap):** PWA with service worker caching the shell + client list; queue failed transaction posts in IndexedDB and retry on reconnect. Show explicit "pending sync" state — never let a banker believe an unsynced deposit is recorded.
2. **Later (real):** local-first store (e.g. RxDB/Replicache pattern) with server reconciliation and conflict rule "server wins, duplicates flagged for admin review." Idempotency keys on every transaction insert (client-generated UUID) so retries never double-post — worth adding to the schema *now*.

---

## 4. Go-to-Market

### Selling to non-technical admins

Sell the *fear*, then the relief. The pitch is not "digital transformation" — it's "know exactly how much money every banker collected, the moment they collect it." Onboarding must be white-glove for the first 10: you (or an agent) visit, import their client book in an afternoon, create banker logins, and run one week of parallel operation (paper + app). The product's job is to make day 8 — when they drop the paper book — feel safe.

An onboarding kit matters more than features: laminated one-page banker instructions (with pictures), a WhatsApp support line, and preloaded demo data for the admin to play with.

### Pricing model

Hybrid, staged:

- **Base SaaS fee:** $2,500/yr for unions up to ~1,000 members (aligns with your model); a $1,000–1,500/yr tier for small susu enterprises; +$1,000–1,500/yr for the loan module later.
- **SMS pass-through with margin:** billed per message bundle.
- **Avoid transaction-percentage pricing pre-MoMo** — it makes you look like a fee-taker on members' savings, which is politically toxic inside cooperatives. Once MoMo flows through the platform, a small per-transaction fee on *digital* transactions is normal and expected.
- Anchor pricing against their current loss: one banker pocketing GH₵30/day is ~GH₵11k/year (≈ $700–900) *per fraudulent banker* — plus the admin's daily reconciliation hours.

### Urban vs rural first

**Peri-urban first: Kumasi and Accra environs — exactly where you are.** Urban unions have smartphone-carrying bankers, reliable data, MoMo-dense clients, and shorter sales cycles; rural unions have the acuter problem but harder connectivity and digital-literacy constraints that would burn pilot goodwill. Win 5–10 peri-urban references, then take the offline-hardened version rural. Practically: your mom's union defines the beachhead geography — cluster the next unions within driving distance for support.

### The 5-minute demo that closes

1. Phone in hand: log a deposit as a banker (10 seconds).
2. Laptop: the deposit appears on the admin dashboard *instantly*, tagged to banker and client.
3. Show the audit feed: "who logged what, when."
4. Show a client's balance history: "any member can be answered in 5 seconds."
5. Close with the reconciliation report: "your end-of-day count, already done."

The instant phone→dashboard moment is the whole sale. Everything else is supporting evidence.

---

## 5. Security & Trust

### Fraud vectors and technical closures

| Vector | Closure |
|---|---|
| Banker pockets cash, never logs it | SMS receipt to client on log; client notices silence. Client statement via USSD later. Admin sees per-banker daily patterns. |
| Banker logs less than collected | Same SMS closure — the client sees the logged amount. |
| Banker logs, then deletes/edits | **No deletes or edits, ever.** Corrections are reversal transactions. Append-only ledger + audit log. |
| Admin-side manipulation | Audit log includes admins; owner-level export; eventually independent monthly statements to a union board contact. |
| Shared/stolen banker credentials | Per-banker logins, device fingerprint in audit rows, admin can deactivate a banker in one tap (is_active already exists). |
| Fake "MoMo received" claims | MoMo transactions only enter via API callback with `momo_ref` — never hand-keyed as confirmed. |
| Replay/double-submit | Idempotency key per transaction; unique constraint. |

### Dispute handling ("I paid but it's not logged")

Product answer: make the dispute *rare* (SMS receipt at collection moment) and *resolvable* (admin sees banker's route/day activity; client's full history printable). Process answer for unions: a dispute log — client claim recorded with date/amount/banker, resolved by admin with a written outcome, stored against both banker and client records. Pattern-of-disputes per banker becomes a fraud signal on the dashboard. Never let the system silently insert "missing" money — every adjustment is a visible, attributed transaction.

### Data residency & privacy (Ghana)

- Register with the **Data Protection Commission** as data controller (~before union #2); renew biennially.
- Collect the minimum: name, phone, MoMo number, account records. No ID numbers until KYC features demand them.
- Consent language in client onboarding (a line on the paper form the union already uses).
- Cross-border hosting (Supabase) is defensible now with encryption + access controls; revisit in-country replica at scale. Keep an eye on Cybersecurity Act guidance for financial-sector data.
- Practical trust features: per-union data export (they must never feel locked in), and clear "your union's data is isolated" language backed by real RLS.

---

*Companion doc: [ROADMAP.md](./ROADMAP.md)*
