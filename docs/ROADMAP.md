# CU Dashboard — Product Roadmap

*Companion to [RESEARCH.md](./RESEARCH.md). Last updated: July 2026.*

---

## Phase 1 — Pilot (0 → 1): mom's credit union runs 30 days unassisted

**Goal:** the union operates daily on CU Dashboard with paper as backup only, and nothing surprises anyone.

**Product**
- [x] Vercel deployment, auth, core pages (done)
- [x] Add Client modal (done)
- [ ] **Roles + RLS** — admin vs banker; bankers see only the collect screen; database-level enforcement, not just UI
- [ ] **Audit log** — append-only record of every action (who, what, when); admin feed view
- [ ] **Withdrawal flow** — banker/admin records request, admin approves, balance decremented only on approval
- [ ] **Client detail / balance history** — tap a client → full transaction timeline
- [ ] **Search** — clients by name/account; transaction filters (date, banker, method)
- [ ] **Daily reconciliation view** — per-banker totals for today, expected cash on hand, printable
- [ ] Client CSV import (their existing book)
- [ ] Transaction idempotency keys + no-delete policy (corrections = reversal entries)

**Infrastructure**
- [ ] **Supabase Pro** before daily real use (free tier auto-pauses — already happened once; unacceptable once real records live here)
- [ ] Nightly backup verification ritual; document the "laptop dies" recovery story

**Operational**
- [ ] Create banker logins (employee-ID scheme: `bnk-001@<union>.app`)
- [ ] One week parallel run (paper + app); compare end-of-day totals daily
- [ ] Laminated banker cheat-sheet; WhatsApp support line

**Exit criteria:** 30 consecutive days, zero data loss, end-of-day totals match, mom stops keeping the paper book, bankers log without calling for help.

---

## Phase 2 — Launch (1 → 10 credit unions)

**Goal:** a stranger's credit union can be onboarded in a day and trusts the system with its money records.

**Product**
- [ ] **Multi-tenancy** — `organizations` table, `org_id` on every row, RLS scoping, org-level branding (name/logo on login + reports)
- [ ] **SMS receipts to clients** (Arkesel/Hubtel) — the fraud-killer feature and first paid add-on
- [ ] **Withdrawal consent verification** — client photos on profiles (capture at onboarding); SMS OTP to the *client's* phone to authorize withdrawal requests (rides the same SMS rails as receipts); post-approval SMS ("expect payment from <banker>"); client PIN only as an offline fallback later (hashed, rate-limited — weaker here because PINs are typed on the banker's device)
- [ ] Monthly statement generation (PDF) per client + union summary
- [ ] Admin user management UI (create bankers, reset passwords — no more Supabase dashboard)
- [ ] Onboarding wizard: union profile → import clients CSV → create bankers → go live
- [ ] **Data migration playbook** — migrate master data + opening balances, never transaction history: opening-balance import (tagged transaction type, audit-visible as "migration"), printable post-import reconciliation statement for treasurer sign-off ("total imported = total on your books"), Excel cleanup as white-glove onboarding, per-vendor importers for legacy software as encountered
- [ ] **PWA + offline-first collect** (pulled forward from Phase 3 — launch requirement for Ghana connectivity): manifest/icons/service-worker shell caching; offline deposit queue in IndexedDB with client-generated idempotency UUIDs; explicit sync states (amber "waiting to sync" vs green "recorded"); balances labeled "as of last sync"; approvals remain online-only (admin is in the office). The append-only ledger is what makes this tractable — offline queues of inserts merge without conflicts

**Business**
- [ ] Register with Data Protection Commission as data controller
- [ ] Standard contract + SLA; pricing sheet ($2,500/yr base, SMS bundles)
- [ ] Reference demo environment with realistic seeded data
- [ ] Cluster sales within driving distance of the pilot (Kumasi/Accra peri-urban)

**Exit criteria:** 3+ unions onboarded without code changes; onboarding ≤ 1 day; support load < 2 hrs/week/union.

---

## Phase 3 — Scale (10 → 100)

**Goal:** the platform earns more per union and runs itself.

**Product**
- [ ] **MTN MoMo API integration** — Request-to-Pay deposits + disbursement withdrawals, webhook confirmation, `momo_ref` on every digital transaction; each union onboards its own MTN merchant account (keeps us outside PSP licensing)
- [ ] **Loan management module** (premium tier): products, approval workflow, schedules, repayments via collect flow, arrears + PAR dashboard
- [ ] Offline-first hardening — background sync API, conflict telemetry, multi-day offline stress testing (core offline queue ships in Phase 2)
- [ ] USSD balance check (shared NCA shortcode across unions)
- [ ] Reporting suite: CUA/BoG-aligned prudential returns, board packs
- [ ] Owner analytics: cross-union health metrics (churn risk, activity)

**Infrastructure**
- [ ] Supabase compute upgrades, read replica for reporting
- [ ] Per-table RLS integration tests in CI; staging environment
- [ ] Status page + incident process

**Business**
- [ ] Loan module pricing (+$1,000–1,500/yr); MoMo per-transaction fee on digital flows
- [ ] 1–2 support/onboarding hires or agent model
- [ ] CUA relationship: pursue endorsement/listing as approved vendor — CUA supervises all 490 unions and is the single strongest distribution channel in the market

---

## Phase 4 — Expansion (Ghana → West Africa)

**Goal:** the infrastructure layer for informal finance in the region.

- [ ] **Côte d'Ivoire first** (large francophone credit-union federations, MTN MoMo present): French localization, XOF currency, local regulatory mapping (BCEAO/UMOA microfinance rules differ fundamentally from Ghana — budget real legal work)
- [ ] **Nigeria cooperatives** (huge but fragmented; different payment rails — NIBSS/Paystack territory, not MoMo)
- [ ] Multi-currency, multi-language core (design tokens already isolate formatting — extend to i18n)
- [ ] Cross-border remittance-to-savings: diaspora deposits directly into a member's susu account via partners (Zeepay/Onafriq rails) — a differentiated deposit source no local competitor offers
- [ ] Dedicated Postgres / in-country replicas as data-residency requirements harden
- [ ] Series-of-agents support model; partner certification program

**Sequencing rule:** enter a country only with a local anchor partner (federation or apex body equivalent to CUA). The CUA-endorsement playbook from Phase 3 is the repeatable move.

---

## Standing engineering principles

1. **Money records are append-only.** No UPDATE/DELETE on transactions — corrections are reversals.
2. **Every mutation is attributed** (user, role, timestamp, device) in the audit log.
3. **Database-level security first** (RLS); UI hiding is convenience, not security.
4. **One screen, one action** for banker-facing flows.
5. **Design tokens only** — the Toss system is the brand.
6. **Idempotency everywhere** a network retry could double-post money.
