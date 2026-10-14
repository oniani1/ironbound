# SPEC: Vault, onboarding and lower landing premium pass

Source: Nika's scoped request on 2026-10-15.
Status: done
Approval: The user authorized implementation and two or three local commits on `codex/vault-onboarding`.

## Goal
Use the Round 2 design system to make the collection feel like an armory catalog. Quiet controls, precise object labels and short motion support inspection and decisions.

## Success criteria
- Category and status filters use scrollable caps text with a brass active hairline on phones and desktop.
- Sort uses a custom listbox with arrow keys, Home, End, type search, Enter, Space, Escape and Tab. Escape and selection return focus to its button.
- Vault figures retain the existing formulas. Owned value uses the display serif. Positive and negative results include a sign and a word.
- The collection uses two columns at 390px, three at tablet widths and four on desktop. Objects use the shared rarity vitrine with a 4px hover lift and reveal once on scroll.
- Inspection retains pointer, pinch, wheel and keyboard controls. Floating icon controls retain their names and the help hint fades after use.
- Banner choices use quiet pattern tiles and named heraldic tinctures. The optional credit flow and all test ids remain available.
- Lower landing sections retain their editorial structure and calculations with the shared type, labels and Phosphor icons.
- Reduced motion uses fades without object movement. Browser checks at 1440x900 and 390x844 find no overflow or page errors.

## Out of scope
- Shared globals, existing shared buttons and tags, layout, hero, chest pages, opening and chest scenes.
- Catalog, store, valuation formulas, real accounts, money, shipments and remote publishing.

## Constraints
- Touch the requested page and component groups only, plus new files.
- Dependencies allowed: none.
- Preserve test ids, aria labels and working focus paths. Use existing system classes and Phosphor light icons.

## Verification plan
- `pnpm typecheck`, `pnpm test`, `pnpm build`.
- Serve the production build on port 5190. Run live Chrome checks of filters, the sort listbox, inspection gestures, sale and shipping, onboarding credit and skips, landing odds and FAQ at both sizes.
- `node scripts/verify-premium.mjs` runs those browser checks with the installed Chrome and Playwright runtime. Override `PLAYWRIGHT_MODULE` when that runtime is elsewhere.
- Inspect screenshots of the vault, item detail, banner, claim step and lower landing sections. Check reduced motion and long values.
- Review the final diff in the main session. Make three scoped commits with the requested co-author trailer.

## Open questions
None.

## Touch points
- `src/pages/Vault.tsx` and `src/components/vault/*`: ledger, filters, object wall, inspection and quiet detail surfaces.
- `src/components/onboarding/{Onboarding,ArmsStep,ClaimStep,GuestInvite}.tsx`: setup presentation and the invitation strip.
- `src/components/landing/*`: type, section rows, labels and icon controls.
- New `src/components/ui/QuietSelect.tsx` and its CSS: accessible sort menu.
- This spec and local verification artifacts document scope and evidence.

## Verified on 2026-10-15
- Main-session review completed. `pnpm typecheck`, `pnpm test` and `pnpm build` exited 0. Vitest passed 22 tests.
- `node scripts/verify-premium.mjs` exited 0. Chrome passed 37 live checks at 1440x900 and 390x844 with no page errors. This includes the actual free chest, Space hold, Keep, optional setup, skips and immediate Escape.
- Keyboard coverage includes sort arrows, Home, End, type search, Enter, Space, Tab in both directions and focus return. Inspection coverage includes wheel, pointer drag, keyboard and real touch pinch.
- Sixteen CSS text-contrast snapshots measured 970 samples. Normal text had a minimum ratio of 5.16:1. Large text had a minimum ratio of 12.70:1. These measurements cover computed text colors and backgrounds, including opaque button gradient stops.
- The desktop banner action ends at 882.58px in a 900px view. Phone item actions end at 779px, above the navigation at 780px. Both layouts were measured in Chrome.
- The report and 24 screenshots are in `node_modules/.tmp/premium-qa/`. Screenshots of the collection, inspection, banner, claim and lower landing sections were checked in the main session.
