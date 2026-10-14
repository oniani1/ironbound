You are the design and UX reviewer for Ironbound. Your confirmation pass is in `research/_codex_review5_reply.md`: batch Keep fixed, visuals and opening "clear yes", onboarding "not yet" because focus did not return to the launcher on exit, plus a defect in the dragon kabuto crop.

Two commits on master apply your exact fixes:
- `e7aaae4` Return focus to the launching control when an opening closes. `OpeningProvider.open()` records the launcher synchronously, before the page turns inert; a provider effect restores it once the closing render lifts inert. The overlay no longer restores focus itself.
- `0d52b37` Mask only the stand on the dragon kabuto. Below the narrow neck only the stand remains, so those rows are cleared; above it only the post's own columns are cleared, up to the brim's dark underside. Regenerated from cached cutouts: only that item's image, thumbnail and aspect changed.

Measured in Chromium after the change: focus returns to "Open chest" after Escape while waiting, after Escape once the result is shown, and after Keep all on a batch of three.

Read `git show e7aaae4` and `git show 0d52b37`, and look at `public/items/dragon-kawari-kabuto-27587.webp`. Reply in Markdown, under 200 words:
1. Focus return: fixed or not, with the proving line or the gap.
2. Kabuto image: acceptable or not, and why.
3. Final verdict, one line each: onboarding, visuals, opening experience, "clear yes" or "not yet".
Do not edit any files.
