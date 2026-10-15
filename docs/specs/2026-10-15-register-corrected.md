# SPEC: The register, corrected (type sizes, labels, panels, receipt buttons, rarity light)

Source: request from Nika on 2026-10-15, after three rounds of UI directions (artifacts "Ironbound UI Directions", "Ironbound Etched", "Ironbound House Style").
Status: approved
Approval: "Okay, lets do that" on 2026-10-15, with two additions: the rarity word keeps its Gothic face and its colored light wherever rarity is shown, and Sell, Ship and Open another become buttons with a shape.

## Goal

The current design keeps its bones (Instrument Sans for the interface, Cormorant for names, brass as the one accent, square corners, solid dark surfaces) and loses the four habits that read as a template: tracked uppercase labels at 10 to 12 px, interface text under 13 px, the brass head rule and second hairline on every panel, and the twin ruled cells on the receipt. The numbers come from the live sites measured on 2026-10-15 (Sotheby's lot page, Apple, Aston Martin, Audemars Piguet): interface text at 14 to 16 px, labels at 12 to 13 px in sentence case, buttons 48 px tall with 2 px corners in sentence case, primary filled, secondary outlined, tertiary a translucent fill.

## Success criteria

- [ ] No interface text is set in uppercase with tracking: `grep -rn "uppercase" src --include=*.tsx --include=*.css` returns only the wordmark, the rarity stamp face and the `sr-only` helper, or nothing.
- [ ] No Tailwind text size under 12 px remains in `src/components` and `src/pages` (`grep -rno "text-\[1[01]\(\.[0-9]\)\?px\]" src` returns nothing); 12 px is used only for credits and legal lines.
- [ ] `.ib-button` sizes are 40, 48 and 52 px (`sm`, `md`, `lg`), 14 to 15 px semibold, sentence case, 2 px corners. Primary: brass fill. Secondary: 1 px outline. Ghost: translucent bone fill, no border.
- [ ] `.ib-ledger` and the full receipt are solid `ink-900` panels with 4 px corners and no head rule, no second rule and no border.
- [ ] On the receipt: the rarity in the Gothic face with its pips and its light, the kind of piece at 14 px; the name in the serif; a 12 px sentence-case label over the value; the value in Instrument Sans 600 tabular at 28 px (32 px on wider screens); a 14 px line stating the multiple and the price paid; Keep in vault as the primary (52 px, full width); Sell back and Ship to me as two outlined 48 px buttons side by side; one 13 px line of terms under them; Open another as a ghost 48 px button, full width; Inspect, Replay and Share as 14 px text links. No dotted leader.
- [ ] `RarityTag` renders the rarity word in the Gothic face in its color with pips and a soft radial light behind the word (the visual the founder picked); `Tag` (status words) renders 13 px sentence case in its tone color.
- [ ] The opening overlay's top controls (Fast, Skip, Close) are ghost buttons at 40 px with 14 px sentence-case text; the chest epithet above the chest name is gone from the overlay, and on the chest page it sits under the name in the italic serif.
- [ ] Header navigation links are 14 px medium sentence case; the bottom navigation labels are 11 px sentence case without tracking.
- [ ] `pnpm typecheck`, `pnpm test`, `pnpm build` exit 0; `node scripts/verify-premium.mjs` against `vite preview --port 5190` exits 0.
- [ ] Filmed on the production build with `scratchpad/capture-hall` style Playwright runs: the receipt on desktop (1440×900) and phone (390×844), the chest page, the chest list and the vault.

## Out of scope

- The chest page hero in the Aston Martin pattern (photograph as the page, name bottom left). Future work.
- The landing page's sections, the FAQ and the trust list beyond what the shared classes change.
- The share card image, the batch panel's layout and the item page's layout beyond the shared classes.
- The vault's filters, sort and action bar.
- Any change to the 3D scene, the reveal timing or the camera (the polearm camera has its own SPEC).
- A dark-glass or rounded (pill) treatment: square corners stay, per the founder's choice.

## Constraints

- Follow `AGENTS.md`: no em dashes in copy, short sentences, no sound, rarity always named.
- Keep the existing class names (`.eyebrow`, `.caps`, `.ib-kicker`, `.ib-ledger`, `.ib-receipt`, `receipt-*`) and change their styles, so the sweep stays small and the tests keep their test ids.
- Keep `.ib-money` (serif money) where it is used outside the receipt: chest prices, the batch total, the vault total. Only the receipt's value moves to the sans.
- Dependencies allowed: none.

## Verification plan

- `pnpm typecheck`
- `pnpm test` (existing 43 tests; `src/lib/store.test.ts`, `src/lib/facts.test.ts` and the chests tests must keep passing)
- `pnpm build`, then `pnpm exec vite preview --port 5190` and `node scripts/verify-premium.mjs` (37 browser checks, including text contrast)
- manual: open `/chests/knight`, open the chest, wait for the receipt; check the receipt matches the criteria on desktop and at 390 px; check the vault and `/chests`; press Tab through the receipt and confirm focus order Keep, Sell back, Ship to me, Open another, Inspect, Replay, Share.

## Open questions

- None. The founder chose square corners over Duna's pills and asked for the Gothic rarity with light and for Sell, Ship and Open another as shaped buttons.

## Touch points

- `src/styles/globals.css`: label classes to sentence case at 13 px; `.ib-button` sizes and faces; `.ib-switch`, `.ib-quantity-option`, `.ib-icon-button` sizes; `.ib-ledger` and `.ib-receipt` to plain panels; the receipt classes (value, commands as buttons, terms, tools); the rarity light class.
- `src/components/ui/Button.tsx`: size map to 40, 48, 52 px and 14 to 15 px text.
- `src/components/ui/RarityTag.tsx`: Gothic word with light; `Tag` to 13 px sentence case.
- `src/components/opening/RevealCard.tsx`: receipt structure and copy.
- `src/components/opening/OpeningOverlay.tsx`: top controls, epithet removed, fact labels.
- `src/components/opening/MultiReveal.tsx`, `src/components/social/ShareSheet.tsx`: label sizes.
- `src/components/layout/Header.tsx`, `src/components/layout/BottomNav.tsx`: navigation text.
- `src/components/ui/Vitrine.tsx`, `src/components/ui/Switch.tsx`, `src/components/ui/Segmented.tsx`, `src/components/chest/OddsBar.tsx`: sizes and cases.
- `src/components/vault/experience.css`: `.ib-kicker`, `.ib-signin-divider`, `.ib-action-link`.
- `src/pages/ChestDetail.tsx`, `src/pages/Chests.tsx`, `src/pages/Item.tsx`: labels and the epithet line.
- `AGENTS.md`: the interface language paragraph records the new rules.
