# SPEC: A real crown on the King's Reliquary

Source: request from Nika on 2026-10-16: "This crown looks really iffy and poorly made. Make a good one and actually good looking." Issue #5.
Status: approved
Approval: the request itself.

## Goal

The King's Reliquary lid ornament stops being an open cylinder with five cones and glowing red balls. It becomes a crown built in code to the same design as the embroidered crown on the niche banner: a jeweled circlet with beaded rims, cabochon stones in gold bezels (a garnet at the front, sapphires at the sides, pearls between), four fleurs-de-lis cut from the banner's own fleur shape, a pearled point in each gap, and a crimson velvet cap inside. No cross. Stones catch the light instead of glowing.

## Success criteria

- [ ] `buildOrnament` for `ornament: 'crown'` returns the new crown from `src/components/chest3d/crown.ts`; the old cones and spheres are gone.
- [ ] The fleur-de-lis shape is shared: `FLEUR` lives in `src/components/chest3d/fleur.ts` and both the banner and the crown import it.
- [ ] Filmed on the Lab page (`/lab`, King's Reliquary, 1440×900 at 2x): the crown shows a circlet with beaded rims, bezels with stones, four fleurs-de-lis and four pearled points, and a velvet cap; nothing glows; no console errors.
- [ ] `pnpm typecheck`, `pnpm test`, `pnpm build` exit 0.

## Out of scope

- The other lid ornaments (the Shōgun's tassel, the Warlord's spikes).
- The embroidered banner crown.
- The chest model, its materials and the lid animation.
- A crown on any surface other than the King's Reliquary lid.

## Constraints

- Geometry stays procedural (no model file): the chest's other ornaments are built in code and the artifact build cannot serve `.glb`.
- `SVGLoader` from three's examples turns the fleur path into shapes; it is the only new import and three already ships it.
- Dependencies allowed: none.

## Verification plan

- `pnpm typecheck`, `pnpm test`, `pnpm build`
- manual: `pnpm dev`, open `/lab`, press `king`, look at the crown on the lid; film it with a Playwright script into the scratchpad for the PR.

## Open questions

- None.

## Touch points

- `src/components/chest3d/crown.ts`: new; builds the crown.
- `src/components/chest3d/fleur.ts`: new; the fleur-de-lis path moved out of `RoyalHall.tsx`.
- `src/components/chest3d/RoyalHall.tsx`: imports `FLEUR`.
- `src/components/chest3d/ChestModel.tsx`: the crown branch of `buildOrnament` uses `buildCrown`.
