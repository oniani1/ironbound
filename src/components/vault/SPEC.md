# Vault, onboarding and landing sections

Status: approved. The user authorized implementation on `codex/vault-onboarding` on 2026-10-14.

## Round 3

Source: the user's Round 3 task on 2026-10-14. Status: approved.

- Show owned value, Estimated gain and Sell-back net. Owned pieces include vaulted, shipping and shipped pulls. Estimated gain is owned value plus sales minus spending. Sell-back net applies each owned pull's chest buyback rate, plus sales minus spending. Missing chest rates make the net unavailable.
- At 390x844, show the first complete item image and name before scrolling. Use one phone summary row and one Filter control. Put detail identity above a 280px image stage and fixed Sell for $N and Ship buttons above the app tab bar, with safe-area clearance.
- Rename the claim headline to Claim demo credit. Display whole dollars with `money(n)`.
- Touch only Vault.tsx, the existing vault files and ClaimStep.tsx. No dependencies. App shell, other review items, store and opening flow are out of scope.
- Verify with `pnpm typecheck`, `pnpm build`, and one browser pass at 1440x900 and 390x844. Check both ledger formulas, shipping ownership, phone filters, fixed detail actions and the rename. Commit locally, do not push, and stop the port 5190 dev server.

Round 3 verification: main-session review completed. `pnpm typecheck` and `pnpm build` both exited 0. Chrome with Playwright passed 14 browser scenarios at the requested sizes, with no page errors. These cover the hammer's +$15,000 estimated gain and +$13,400 sell-back net, mixed statuses and rates, negative totals, missing rates, filters, sale credit, shipment costs, action focus and the claim headline. At 390x844, the first name ends at 697px, the image stage is 280px, and the fixed action bar ends at 779px above the tab bar at 780px.

## Scope
- Build the collection wall and deep-linked inspection at `/vault` and `/vault/:uid`. Calculate owned value, estimated gain and sell-back net as specified in Round 3.
- Filter by category and status, and sort by date, value or rarity. Show honest empty and missing-item states.
- Inspect full-length object photos with pointer, wheel, pinch and keyboard zoom controls. Display specifications, provenance, demo valuation comparisons and a demo certificate.
- Confirm exact sell-back offers before calling the existing store. Collect and review a mock shipping address and insured service cost before saving a shipping request. Keep carrier milestones pending until the stored status changes.
- Build the three presentational onboarding steps with existing profile and sign-in actions. Support timed stories, hold to pause, manual navigation, reduced motion and a single demo credit grant.
- Build the five lower landing sections from shared chest data, with published odds, computed expected value, demo stock and source credits.
- Add preview routing in App.tsx while preserving `/lab`.

## Touch points
Only `src/pages/Vault.tsx`, `src/components/vault/*`, the three requested onboarding components, `src/components/landing/*` and route/preview additions in `src/App.tsx` may change. This scoped spec lives in the owned directory to respect that boundary.

## Out of scope
- Changes to the store, types, item catalog, global tokens, hero, chest scenes or opening flow.
- Real authentication, wallet connections, payments, shipments or marketplace listings.
- New dependencies, remote publishing or pushing the branch.

## Verification
Run `pnpm typecheck` and `pnpm build`. Serve with `node node_modules/vite/bin/vite.js --port 5190`. Inspect the collection, detail, onboarding and lower landing sections at 390x844 and 1440x900. Exercise sale confirmation, shipping review, filtering, image controls, story pausing, sign-in credit guards and reduced motion in the running application.

## Verified on 2026-10-14
- `pnpm typecheck` and `pnpm build`: exit 0. Review performed in the main session.
- Installed Playwright and Chrome ran 30 live flow checks at the requested sizes and 17 edge checks. Exit 0. No page errors. Checked horizontal overflow and inspected screenshots.
- Edge checks cover repeated confirmation clicks, insufficient credit, whitespace addresses, missing chests, actual touch pinch, keyboard pan, held stories, timed advance, the accessible odds tree, email validation, repeat credit protection, reduced motion and long names with million-dollar totals.
- Measured detail text contrast had a minimum of 4.76:1. Input borders measured 4.08:1 after correction.
- Local reports and screenshots are in `node_modules/.tmp/vault-qa/`. Preview routes are `/dev/onboarding` and `/dev/onboarding?view=landing`; `/lab` is preserved.

## Integration notes
- All requested components export defaults. Onboarding callbacks are wired only in the development preview; the production trial opening and coach marks remain with Claude.
- Existing shipment storage retains name, city, country, method, ETA and tracking. Street and postal code are reviewed in the form but are not retained after reload. Full address persistence requires extending the shared shipment shape.
- Existing `shipped` status maps to in transit. Delivered remains pending until an explicit delivery stage is supported.
- The placeholder catalog leaves some bands empty. Tier figures use the requested `expectedValue` function and state that unfilled bands are excluded. Fill all bands or update shared EV logic to follow the roll fallback before using these figures as full-pool EV.
