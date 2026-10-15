# SPEC: The reveal camera travels a polearm from point to butt in one move

Source: request from Nika on 2026-10-15: "the camera movement on spears is really bad. It needs to go from top to bottom in one go, not stop in the middle of the spear or so on."
Status: approved
Approval: "Lets do it" on 2026-10-15.

## Goal

In the close-up study, a spear, a yari, a halberd or any other tall piece is read from its top end to its bottom end in one continuous move, the way a sword already is. Today a polearm is a special case (`anim.headed`): the camera studies only its head and the top of its haft (18% of its height) and leaves the rest for the pull back, which reads as the camera stopping in the middle. The tall-piece path itself also stops short of the low end (at 22% from the bottom on desktop and 45% on phones).

## Success criteria

- [ ] `anim.headed` is gone from `animState.ts`, `ItemRise.tsx` and `CameraRig.tsx`; polearms take the tall-piece path.
- [ ] For a tall piece the close-up's look point runs from the top edge of the piece to its bottom edge, allowing for the share of the height the frame shows, so the last frame of the travel has the bottom end in view and the first frame the top end. The move is a single `sine.inOut` tween of `anim.along` (unchanged in `timeline.ts`).
- [ ] Filmed with the Lab page (`/lab?item=<id>` in dev) for a yari, a halberd and a longsword: frames at 0%, 25%, 50%, 75% and 100% of the travel show the look point descending the whole piece with no pause; the sword's study still reads hilt to point.
- [ ] `pnpm typecheck`, `pnpm test`, `pnpm build` exit 0.

## Out of scope

- The study paths for wide pieces (left to right) and compact pieces (the half turn).
- The travel's duration, the fact beats and the pull back.
- Inspect mode's zoom and look along the piece.
- Any interface change (see the register SPEC).

## Constraints

- `CameraRig.tsx` keeps its structure: one `useFrame` that blends chest, reveal, macro and zoom framings. The change is to the tall-piece branch of the macro block only.
- Dependencies allowed: none.

## Verification plan

- `pnpm typecheck`
- `pnpm test`
- manual: `pnpm dev`, open `/lab?item=su-yari-<id>` (a yari from `src/data/cleveland.json`), press a rarity and Run; watch the study: the camera starts at the point and ends at the butt without stopping. Repeat for a halberd and a sword. Filmed with a Playwright script into `scratchpad` for the PR.

## Open questions

- None.

## Touch points

- `src/components/chest3d/CameraRig.tsx`: the tall-piece look point runs the full height, allowing for the frame's share; the `headed` branch is removed.
- `src/components/chest3d/ItemRise.tsx`: stops setting `anim.headed`.
- `src/components/chest3d/animState.ts`: drops the `headed` field.
- `AGENTS.md`: the design-principles line about the camera notes that polearms travel their whole length.
