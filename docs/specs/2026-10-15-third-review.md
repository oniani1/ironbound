# SPEC: Third founder review (hall, opening, catalog)

Source: the founder's third review, 2026-10-15.
Status: done on branch `third-review`, not merged.

## 1. The hall

Founder: the torches look "halfway stuck in the walls and these pillars", the fire animation is "not that good looking", and the crown on the banner looks "unpolished... not really well symmetrically structured... it does not really look like a crown". "If the fire is just too much... we can drop the fire as well and just have maybe the sunlight coming from the window of this castle."

Decisions:
- No fire anywhere. The hall is lit by late sunlight through tall lancet windows high in one side wall: warm shafts of light with dust in them, light pools on the floor broken by the window tracery, long column shadows, deep shadow elsewhere. Window light stays neutral warm (light means rarity, so never colored).
- Real CC0 PBR textures (Poly Haven) on floor, walls and columns instead of canvas noise. Columns get proper bases and capitals.
- Banners keep crimson and gold, with a properly drawn, symmetric heraldic crown.
- The light dims for the blackout and takes the rarity color once the rarity is named.
- Performance: at most one shadow-casting light, a fixed draw-call budget, cheaper settings on phones. No black frames: shaders clamp their inputs, the bloom guard stays.

## 2. The opening

Founder: open the lid once, not two or three times. The camera sits low enough that the empty inside never shows. The close-up zoom and the travel along the piece are too fast. Each fact stays at least 2.5 s. The ending (the floating piece, the light) is liked, but it should be slower, with bigger text and a more structured layout and motion.

New beat sheet:
1. Arrival (about 2.7 s), ending on a low camera.
2. Hold to break the seal (unchanged).
3. The lock is knocked off and stays on the altar, then about 1.2 s of rising tension with the lid shut: the seam light swells, the chest strains.
4. The lid opens once, heavy (about 1.5 s). Light pours up. The camera is below the rim line, so the inside is never in view, and the opening is filled with light.
5. The camera tilts up into the light and moves straight in to the close-up (about 0.8 s); the piece rises into the shot through the last of the push-in, in under half a second. Measured on all five chests: the piece is in view 1.84 to 1.93 s after the lid starts to open (it was about 3.7 s). If the photograph has not loaded, the piece waits for it; if it fails, or is not in after 12 s, the study is skipped and the receipt says the photograph did not load. Revised after the founder tried the build: the first version spent a second and more on empty light ("for a second I'm looking just at the air").
6. The camera travels slowly along the piece by shape while the facts arrive every 2.8 s: origin, type, antique or newly forged, year or maker, weight. Tall pieces top to bottom and wide ones left to right, following the metal band by band; round and compact pieces circled half a turn, from about half of the piece in view to most of it (revised: the first version held a sixth of a sword guard and barely moved).
7. A slow pull back (about 1.6 s) to the whole piece, still in plain light.
8. The rarity: Legendary and Relic black out first. The rarity floods the hall and its name is set very large, held about 2.4 s.
9. The title sequence: the rarity shrinks to a label, the name arrives large, then origin and era, then the value; about 3.5 s.
10. The receipt card.

Skip, Fast, reduced motion, spectating and multi-open keep working.

## 3. Catalog and odds

Founder: "majority of the swords or the weaponry... should be something that we can just get. So mainly the new work stuff." Keep some antiques. "The word new work is really bad." "We're always getting the common": uncommon and better should come up often, each at a lower value, so you feel you can unbox a Rare or a Legendary.

Decisions:
- "New work" becomes "Newly forged" everywhere in the UI.
- Cut the museum antiques to the obtainable ones (arrowheads, spurs, tsuba, field daggers) plus a short list of grails for the top tiers. Done: 175 to 72, including three retired because their photographs cut off the blade.
- The plan was to add 60 to 70 more researched pieces from real makers. Superseded by the founder the same day: "we are good with the current amount", so the 65 newly forged pieces stay as they are and nothing was added. Newly forged pieces are now 65 of the 137 in the catalog, 65 of the 112 weapons and armor (the rest of the antiques are small fittings), and 29 of the 39 swords. Per pull the share depends on the chest, because each chest draws from its own value bands.
- Pulls of retired pieces stay in saved vaults from a short archived record (`src/data/retired.json`), with their recorded value, sell-back and shipping.
- Odds shape per chest, roughly: Common 50%, Uncommon 30%, Rare 13%, Epic 5%, Legendary 1.6%, Relic 0.05 to 0.4% depending on the chest. Bands are set by value so expected value stays 85 to 95% of price. Tests keep enforcing EV and band coverage and add a ceiling on the Common share.

## Verification
- `pnpm typecheck`, `pnpm test`, `pnpm build`.
- Openings filmed on desktop (1440x900) and phone (390x844) for a tall, a round and a wide piece and for a Common and a Legendary: phase timings, the lid opens once, the inside never shows, every fact holds at least 2.5 s.
- Frame cost measured in the render loop; the flicker A/B run on production builds.
- Codex reviews each topic until two consecutive earned GO verdicts.

## The founder's notes after trying the build

- "There is a light flickering on the stand" (the Shōgun chest; "check all the chests"). The lacquer stand's gilt edge was a slab whose top shared a plane with the lacquer top, so the two fought for the same pixels. The edge is now a belt 3 mm under the top. Measured at device pixel ratio 2 while the chest waits: 1.19% of the base's pixels flipped between captures, now 0.08%, in line with the other four chests (0.01 to 0.1%); the whole frame of every chest now flips 0.11 to 0.22%, all of it moving edges and dust.
- The camera looked at empty light before the piece appeared: step 5 above.
- Round and odd-shaped pieces "show just part of it": step 6 above. Seven tsuba also kept the photo's grey backdrop inside their openings, which the close-up blew up into white shapes; `scripts/assets/openings.py` cuts them out from seed points, and the rarity beam now dims where it passes behind a piece, so an opening shows the hall, not a white fill.

## Hardening from review

Codex reviewed each topic in rounds (`codex-loop/2026-10-15-ironbound-third-review`). Beyond the founder's three topics, these came out of it:
- A saved state is read field by field (`parseSave` in `src/lib/store.ts`); a damaged save can no longer stop the app.
- Sell-back offers are whole dollars everywhere (`buybackOffer`), and pulls of retired pieces stay in the vault from `src/data/retired.json`.
- The receipt never runs off the screen: on short screens it docks below the top controls, scrolls inside itself and brings the focused Keep into view.
- While an opening covers the landing hero or a chest page, that page's 3D scene pauses.
- Licensed photos carry their author, linked license and "Cut out from the original photo" on the item page, vault, receipt, batch Inspect sheet and share card; stand-in photos say "Example photo" on the vault wall, batch cards and the share card.
- The hold to break the seal counts real time, so a slow phone or the first frames of a cold opening still break it after the full hold.
- In close-ups the cutout's soft edge takes its colour from inside the piece and the lit rim stays a hairline, so dark pieces no longer show a pale outline.
- Accessibility (round 7): the fact caption keeps its dark plate above the scene (it had dropped behind the canvas once the caption settled); a dark floor sits under the title stage on wide screens; the share and inspect sheets scroll on short screens; the share text box appears only when the line must be copied by hand; focus follows a flipped batch card to its face; the main receipt action is announced with the piece's rarity, name and value. Measured against their real backgrounds (worst case over bright metal and Legendary floods): fact labels 6.69:1 or better, the desktop title stage's small lines 6.2:1 or better, the hold instructions 5.18:1 or better (6.2:1 over the stone altar, 5.18:1 over the plain fallback altar).

## Out of scope
Sound, candles, any backend. The vault and onboarding change only for the rename, the archived records of retired pieces and whole-dollar sell-back offers.
