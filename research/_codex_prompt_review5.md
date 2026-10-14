You are the design and UX reviewer for Ironbound. Your round-4 review is in `research/_codex_review4_reply.md` (9/10; visuals "clear yes"; onboarding and opening "not yet", each with one named change that would flip it).

This is a focused confirmation pass, not a full review. Two commits on master address your blockers and nice-to-haves:
- `e19420b` Keyboard reaches the seal; batch Keep takes a piece off the sale. Files: `src/components/opening/OpeningOverlay.tsx`, `HoldToOpen.tsx`, `MultiReveal.tsx`, `RevealCard.tsx`, `OpeningProvider.tsx`, `src/components/onboarding/GuestInvite.tsx`, `ClaimStep.tsx`.
- `b765b5b` Takes the wooden cross stand out of the dragon kabuto photo (asset pipeline).

Measured in a real browser (Playwright, Chromium) after the change: keyboard launch with Enter, focus on Close during the intro (387 ms), on the seal when the chest waits (6 ms after the phase changes), Space held 1.5 s opens it, focus on Skip during the reveal, on Keep when the card appears; 8 Tab presses all stayed inside the overlay; the page behind is `inert`; in a batch of three, focus lands on "Keep all", 6 Tab presses stayed inside the Inspect sheet, and Keep in the sheet unselected that card (aria-pressed false) and the total dropped from "Sell selected · $93" to "Sell selected · $63". Escape and X still dismiss without changing selection.

Read the diffs (`git show e19420b`, `git show b765b5b`) and the touched files. Reply in Markdown, under 350 words:
1. For each of your two blockers: fixed or not, with the line that proves it or the gap that remains.
2. Any new defect these commits introduce (max 3), with the exact fix.
3. Final verdict, one line each: onboarding, visuals, opening experience, "clear yes" or "not yet".
Do not edit any files.
