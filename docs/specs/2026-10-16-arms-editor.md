# SPEC: Edit your arms and name; a bigger pattern book with charges

Source: request from Nika on 2026-10-16. Issue #7.
Status: approved
Approval: the request itself ("user should be able to modify their profile picture and name. Additionally, I would appreciate some more combinations of patterns and colors or maybe even some symbols like lion, crown and so on.").

## Goal

The profile picture is the heraldic shield chosen at onboarding; today it is set once and never changed, from 7 tinctures and 8 ordinaries with no charge. After this, a signed-in user can open "Edit arms and name" from the vault header (and from the shield in the site header, which leads to the vault) and change the name, the field, the ordinary and its color, and a charge in its own color, from a pattern book of 11 tinctures, 17 ordinaries and partitions, and 16 charges. Onboarding uses the same pattern book.

## Success criteria

- [ ] `Arms` gains `symbol` (a charge or `none`) and `symbolColor` (a tincture). Old saves load with `symbol: 'none'` and a contrasting `symbolColor`; a bad symbol or color in a save falls back the same way (`src/lib/store.test.ts` covers both).
- [ ] Tinctures: or, argent, gules, azure, vert, sable, purpure, tenné, murrey, bleu celeste, cendrée. Ordinaries and partitions: chevron, saltire, cross, bend, pale, fess, chief, quarterly, bordure, pile, per pale, per fess, paly, barry, chequy, gyronny, plain. Charges: lion, crown, eagle, stag, boar, wolf, bear, griffin, unicorn, horse, raven, castle, fleur-de-lis, crossed swords, rose, sun. Every combination renders (`src/components/ui/Heraldry.test.tsx` renders each ordinary and each charge to markup).
- [ ] The vault header has an "Edit arms and name" button that opens a sheet with the live shield, the name field and the pattern book; Save writes the profile, Cancel and Escape close without saving, focus stays in the sheet and returns to the button.
- [ ] The shield in the site header is a link to the vault.
- [ ] Onboarding's arms step uses the shared `ArmsEditor`; its controls keep their class names and labels (`.ib-tincture-name`, `Field: Blue (Azure)`), so `scripts/verify-premium.mjs` still passes.
- [ ] The footer credits the charges (game-icons.net, CC BY 3.0, Lorc, Delapouite, Caro Asercion); `AGENTS.md` records the pattern book and the credit.
- [ ] `pnpm typecheck`, `pnpm test`, `pnpm build` exit 0; `BASE_URL=http://localhost:5190 node scripts/verify-premium.mjs` exits 0.
- [ ] Filmed on the production build: the vault header with the button, the sheet open on desktop and phone, and a shield with a charge in the header, the vault and the receipt.

## Out of scope

- Uploading a photograph as the profile picture. The shield is the picture.
- Furs (ermine, vair), supporters, mottoes, helms and mantling.
- Any change to the share card's layout beyond the shield it already shows.
- Changing the onboarding order or copy.
- Syncing the profile anywhere; it stays in this browser's save.

## Constraints

- `AGENTS.md` writing rules; labels in sentence case; no em dashes.
- The charge paths are data (`src/components/ui/charges.ts`), generated from the set's SVGs; do not hand-edit path strings.
- Dependencies allowed: none.

## Verification plan

- `pnpm typecheck`, `pnpm test` (new: `src/components/ui/Heraldry.test.tsx`, new cases in `src/lib/store.test.ts`), `pnpm build`
- `pnpm exec vite preview --port 5190` and `BASE_URL=http://localhost:5190 node scripts/verify-premium.mjs`
- manual: sign in (demo), open `/vault`, press Edit arms and name, change the name, pick Chequy, a lion in or, Save; the header shield, the vault header and the next receipt show the new arms and name. Reload: they persist.

## Open questions

- None.

## Touch points

- `src/types/index.ts`: `Tincture`, `Ordinary`, `Charge`, `Arms`.
- `src/lib/store.ts`: id lists, `readArms` defaults.
- `src/components/ui/Heraldry.tsx`: tinctures, ordinaries and partitions, charge drawing, `contrasting()`.
- `src/components/ui/charges.ts`: new, the charge paths and credits.
- `src/components/onboarding/ArmsEditor.tsx`: new, the shared pattern book controls; `ArmsStep.tsx` uses it.
- `src/components/vault/ProfileSheet.tsx`: new, the edit sheet; `src/pages/Vault.tsx` opens it.
- `src/components/layout/Header.tsx`: the shield links to the vault.
- `src/components/landing/Footer.tsx`, `AGENTS.md`: credits and the record.
- `src/lib/store.test.ts`, `src/components/ui/Heraldry.test.tsx`: tests.
