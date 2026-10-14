You are the design and UX reviewer for Ironbound (a physical arms-and-armor gacha mock). Your round-2 review is in `research/_codex_review7_reply.md` (8.5/10; opening "clear yes"; premium UI and inventory "not yet"). Read `AGENTS.md` first: the design context now records the founder's latest decisions.

Since then:
1. Your must-fixes: exact-proportion odds strips with no minimum widths or gaps; the phone batch sale shows its amount on a second line in 56 px buttons; new work carries one record everywhere (maker, "Example photo" on catalog vitrines and in batch Inspect, "Retail price, new" linked to its source with the research date, resale labeled "our assessment"; the vault shows a retail basis instead of mock comparable sales); phones read "Demo pulls" in the ticker; the makers ledger folds after four rows on phones; the phone receipt drops dimensions, draw id and trial note; values below Epic land at once.
2. The founder then reviewed the build and asked for:
   - No sound at all. Removed: engine, call sites, setting and toggles.
   - No candles ("wizardish"); a castle instead. The 3D scene now sits in a darkened, blurred panorama of a castle cellar (Poly Haven CC0), dimming with the room light (`chest3d/Backdrop.tsx`).
   - Hero fixes: lines in the beam (its streak noise broke at the cylinder's UV seam; streaks are now periodic) and black flicker on fast pointer moves (the quality monitor resized the canvas back and forth; now one-way, MSAA fixed at mount).
   - A new reveal order: "it should not instantly tell you is it rare, is it common... slowly open the chest and then say common and not reveal how it looks... slowly show... first just seeing the handle and then the entire thing... then zoom out and say its metrics and cost." Now: seal; two neutral breaths of torchlight that tell nothing; the player lifts the lid; only then the rarity is named (tiers climb, blackout before Legendary and Relic); the piece rises into a close shot that travels along it end to end (hilt first for tall pieces, left to right for wide ones) while the light comes up; pull back; name; receipt (`chest3d/timeline.ts`, `CameraRig.tsx`).
   - The length scale on the receipt "doesn't make any sense": removed.
   - Click any piece in the latest pulls or in what you can win to see its specs, and spectate: every piece in the ticker, the wall, the showcase and chest pools opens `/item/:id` (record, value with source, every chest that holds it with the odds of that exact piece), and any pull can be watched as a replay that charges nothing and records nothing, ending on "Open this chest" (`pages/Item.tsx`, `OpeningProvider.tsx` spectate mode).

The attached sheets: desktop (1440x900) and phone (390x844) A to E as before (B is the trial, C the opening beats where 16 is now mid-travel), F-legendary and F-common the opening frame by frame, G the item page and a spectated reveal.

Use `C:\Users\nikao\.claude\skills\critique\SKILL.md` and `C:\Users\nikao\.claude\skills\frontend-design\SKILL.md` as your rubric if you can read them, plus your judgment on game feel and premium retail design. Check the founder's requests above one by one against what you see.

Reply in Markdown, under 800 words:
1. Scores 1 to 10, one line each: premium UI chrome, visual identity, the castle setting, chest opening (suspense, reveal, payoff), the travelling close shot, motion, inventory credibility, trust and honesty, spectating and item pages, mobile, overall.
2. Founder requests: one line each, done or not, with the evidence.
3. Must-fix list (max 6), ordered by impact, with the exact change and the screen label. Only what still blocks a clear win.
4. Nice-to-have (max 4).
5. Verdict, one line each: premium UI, opening experience, inventory, spectating. "clear yes" or "not yet"; for any "not yet" name the single change that flips it.
Do not edit any files.
