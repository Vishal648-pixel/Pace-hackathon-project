
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)
![Tests](https://img.shields.io/badge/tests-13%20passing-success)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

**Live demo:** https://cosmic-money-planner.vercel.app/ — no account needed, opens straight to onboarding.

> **Problem statement:** a modern, interactive personal-finance experience for Gen Z that helps users manage a limited **₹10,000 budget over 30 days** and make informed decisions — connecting income, balance, spending, commitments, savings goals, subscriptions, unexpected expenses, financial risk and financial health, with **decision simulation before committing**.

## Table of contents

1. [Problem → feature mapping](#problem--feature-mapping)
2. [Features](#features)
3. [How a day works](#how-a-day-works)
4. [Innovation](#innovation)
5. [Architecture](#architecture)
6. [Data model](#data-model)
7. [Formulas](#formulas)
8. [Getting started](#getting-started)
9. [Testing](#testing)
10. [Quality standards](#quality-standards)
11. [Deployment](#deployment)
12. [Contributing](#contributing) · [License](#license)

## Problem → feature mapping

| Requirement | Where it is implemented |
| --- | --- |
| ₹10,000 budget over 30 days | Every persona starts with ₹10,000 (`src/engine/seed.ts`); day 1–30 loop in `advanceDay.ts`; header badge "Gen Z Budget: ₹10,000 / 30 Days" |
| Income | Scheduled income/stipends/invoices, toggleable on `/plan` |
| Balance & spending | Live balance, manual spending log on `/` and `/activity` |
| Commitments | Bills with due days; pay, skip or delay on `/plan` and `/simulate`; late fees |
| Subscriptions | Auto-renewals; cancel or add on `/plan` and `/simulate` |
| Savings goals | Targets, contributions and ETA (`goals.ts`) on `/plan` |
| Unexpected expenses | Seeded daily shock events with pay / use goal / borrow choices (`events.ts`, `EventDialog`) |
| Financial risk | 0–100 risk score with reasons (`risk.ts`) on `/` and `/insights` |
| Financial health | 0–100 health score with breakdown and suggestions (`health.ts`) |
| Simulate before deciding | "Can I afford it?" slider on `/` and full `/simulate` page: before/after for balance, daily allowance, goal ETA, day-30 forecast, risk and health |
| Interconnected consequences | One state engine: every action updates all metrics; decisions logged and shown on `/report` |
| End of month | Day-30 celebration modal with letter grade A–D (A ≥ 75, B ≥ 55, C ≥ 35, D below — or any negative closing balance), then `/report` |

## Features

| Page | Path | What it does |
| --- | --- | --- |
| Onboarding | `/onboarding` | Pick a persona (Student, Intern, Freelancer) and name |
| Home | `/` | Safe-to-spend, daily allowance, runway strip, health ring, "Can I afford it?", advance day |
| Simulate | `/simulate` | What-if scenarios (purchase, subscriptions, skip/delay bill, extra income, goal contribution, habits) with before/after diff; save up to 3 |
| Plan | `/plan` | Bills, subscriptions, income and goals with ETA and shortfall warnings |
| Activity | `/activity` | Transaction history; add or delete entries |
| Insights | `/insights` | Health breakdown, risk reasons, suggestions |
| Report | `/report` | End-of-month report card with grade, exportable as an image |

## How a day works

```text
Advance day ─► income arrives ─► bills due (paid, or ₹100 late fee + retry)
            ─► subscriptions renew ─► goal contributions ─► streak & history
            ─► next day ─► maybe a seeded shock event (pay / use goal / borrow)
            ─► every metric (safe-to-spend, forecast, risk, health, goal ETA) recomputes
```

## Innovation

- **Decision simulation on a cloned state** — any what-if runs through the real engine on a copy, so previews are exactly what would happen.
- **Deterministic month** — a seeded RNG means the same seed replays the same month (fair, testable, shareable).
- **Undo stack** (15 steps) so users can experiment safely.
- **Runway strip** visualises the projected balance day by day to day 30.
- **Shock events with trade-offs** — borrowing creates a repayment bill 7 days later; dipping into goals delays their ETA.
- **Grade + exportable report card** gamifies the month for a Gen Z audience.

## Architecture

```text
            ┌──────────── routes/ (pages, head() SEO) ────────────┐
            │  onboarding · index · simulate · plan · activity ·  │
            │  insights · report                                  │
            └───────────────▲─────────────────────┬───────────────┘
                            │ metrics / state     │ dispatch(action)
            ┌───────────────┴──────────┐  ┌───────▼───────────────┐
            │ components/ (pure UI)    │  │ state/PaceProvider     │
            │ AppShell, HealthRing,... │  │ Context + useReducer   │
            └──────────────────────────┘  │ localStorage "pace:v1" │
                                          └───────┬───────────────┘
                                                  │ pure calls
                                   ┌──────────────▼──────────────┐
                                   │ engine/ — pure TS, no React │
                                   │ unit-tested money logic     │
                                   └─────────────────────────────┘
```

```text
src/
  engine/       Pure, unit-tested financial logic (no React, no I/O)
  state/        PaceProvider, reducer, validated localStorage persistence
  components/   Presentational UI
  routes/       TanStack Start file-based routes (one file per page)
  hooks/, lib/  Small shared helpers
```

Key rules:

- **UI never computes money.** All math lives in `src/engine`.
- **Single source of truth.** One reducer; components only dispatch.
- **Validated persistence.** Corrupted storage falls back to a fresh seed.
- **No account needed.** Everything is saved on the device.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for module details.

### Engine modules

| Module | Responsibility |
| --- | --- |
| `safeToSpend.ts` | Safe-to-spend and daily allowance after reserved bills, goals and buffer |
| `forecast.ts` | Blended burn rate and day-30 forecast series |
| `risk.ts` / `health.ts` | Risk score (Low/Medium/High) and 0–100 health score with suggestions |
| `goals.ts` | Goal ETA at current pace |
| `advanceDay.ts` | Next-day processing and shock-event resolution |
| `events.ts` | Shock event catalogue |
| `simulate.ts` | Applies a scenario to a copy of state and compares metrics |
| `actions.ts` | Transactions, goal transfers, decision log |
| `seed.ts` / `rng.ts` | Persona starting states and seeded randomness |
| `report.ts` / `metrics.ts` | Report aggregates, letter grade, dashboard metrics |

## Data model

Stored in `localStorage["pace:v1"]` (see `src/engine/types.ts`):

```ts
interface PaceState {
  version: 1;
  started: boolean;
  profile: { persona; seed; day; openingBalance; bufferFloor; name; baselineDaily };
  balance: number;
  incomes: Income[];             // day, amount, enabled, received
  commitments: Commitment[];     // dueDay, status: pending | paid | late | skipped
  subscriptions: Subscription[]; // renewDay, active, charged
  goals: Goal[];                 // target, saved, plannedThisMonth, contributionDay
  transactions: Transaction[];   // signed amount, category, need | want, source
  eventLog: EventLogEntry[];
  pendingEvent: ShockEvent | null;
  balanceHistory: number[];
  streak: number;
  monthFinished: boolean;
  decisions: Decision[];         // moneyImpact, healthImpact
  savedScenarios: SavedScenario[];
  undoStack: MonthState[];       // last 15
}
```

## Formulas

| Metric | Definition |
| --- | --- |
| Safe-to-spend | balance − upcoming bills − remaining subscriptions − planned goal contributions − buffer floor |
| Daily allowance | safe-to-spend ÷ days left |
| Burn rate | blend of recent average manual spend and the start-of-month baseline |
| Day-30 forecast | balance − burn × days left − upcoming bills/subscriptions + expected income |
| Risk (0–100) | weighted from forecast below buffer, late bills, low runway, borrowing |
| Health (0–100) | sum of components (buffer, bills on time, goals, wants share, streak) |
| Grade | A ≥ 75, B ≥ 55, C ≥ 35, else D; negative balance is always D |

## Getting started

Requires Node.js 22+ (or Bun).

```sh
npm install
npm run dev        # http://localhost:8080
npm test           # unit tests
npm run lint       # ESLint (0 errors)
npm run format     # Prettier
npm run build      # production build
```

| Env variable | Used by |
| --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser (build time) |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | Server rendering |

All values are publishable; never commit secret keys.

## Testing

| File | Covers |
| --- | --- |
| `src/engine/engine.test.ts` | Safe-to-spend, determinism, simulation isolation, subscription cancel, 30-day run without NaN |
| `src/engine/engine.extra.test.ts` | Grades, input validation, add/delete round trip, goal caps, ETA, score bounds |
| `src/test/app-routing.test.tsx` | App routing smoke test |

## Quality standards

- **Code quality:** strict TypeScript, zero ESLint errors, small focused components, Prettier.
- **Security:** inputs trimmed, validated and length-limited; no raw HTML injection; vulnerable transitive packages pinned via `overrides`.
- **Performance:** SSR, code-split routes, lazy-loaded report export, fixed image dimensions (no layout shift).
- **Accessibility:** semantic landmarks and headings, labelled icon buttons, Radix dialogs with focus management, keyboard-operable controls, reduced-motion support, light/dark themes.
- **Responsive:** mobile-first layouts tested at 375px, tablet and desktop.

  ##Screenshots

<img width="1870" height="893" alt="Screenshot 2026-10-11 162805" src="https://github.com/user-attachments/assets/54c37b3d-9900-408c-96bb-452a6c6c56d7" />![Uploading Screenshot 2026-10-11 162724.png…]()
<img width="1890" height="901" alt="Screenshot 2026-10-11 162920" src="https://github.com/user-attachments/assets/25ce06c6-bf5d-4b64-bf29-d642e3216a12" />
<img width="1874" height="896" alt="Screenshot 2026-10-11 162905" src="https://github.com/user-attachments/assets/57e2023f-c49a-439c-93e6-7182a589ec45" />
<img width="1868" height="879" alt="Screenshot 2026-10-11 162848" src="https://github.com/user-attachments/assets/3bbfdcad-1db8-4d38-8bd4-1821d087b770" />
<img width="1888" height="903" alt="Screenshot 2026-10-11 162838" src="https://github.com/user-attachments/assets/59694d64-f084-4273-a52a-4e2c41846902" />
<img width="1856" height="878" alt="Screenshot 2026-10-11 162827" src="https://github.com/user-attachments/assets/94675d24-abb9-4a3a-a8fd-837386f0371a" />
<img width="1880" height="901" alt="Screenshot 2026-10-11 162815" src="https://github.com/user-attachments/assets/1024a54b-db01-4aad-beb4-f7b20a5222c9" />




## Deployment
--Deployed on vercel for quick deployment - https://cosmic-money-planner.vercel.app/

See [CONTRIBUTING.md](CONTRIBUTING.md). Architecture decisions live in `AGENTS.md`.

## License

[MIT](LICENSE)
