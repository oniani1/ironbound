# SPEC: Fourth founder review (instant seal, complete pieces, our own UI, the hall)

Source: the founder's fourth review, 2026-10-15, after trying the third-review build.
Status: done on branch `third-review`, not merged.

## 1. Open straight away

Founder: "when I click on open a new chest or open again, I should be able to open straight away. There is like a second or two that I have to wait before chest is ready or camera is ready."

Cause: the seal only appeared after the arrival (2.7 s) and its own 0.6 s fade, and Open another remounted the whole overlay, so every chest after the first rebuilt the WebGL scene (context, shaders, hall textures) before the arrival even began.

Decisions:
- The seal is on screen and can be held from the first frame of every opening. The arrival under it is short (about 1.2 s: the light comes up, the camera settles from a little higher, the chest drops and lands). A hold during the arrival speeds it up four times, so the chest is down before the seal gives.
- Open another hands the open overlay the next session. The scene stays: nothing is rebuilt. The last pull's state is put away before the next frame is drawn, and the hall comes back out of the dark (0.55 s) with the next chest dropping onto the altar, seal ready.
- A seal broken before the chest model is in the scene (a cold first opening on a slow connection) waits for it, at most 4 s, so the reveal never plays to an empty room.
- Keyboard: the seal takes focus at once (hold Space); Close takes it only when the chest opens by itself (Fast, spectating).
- Only the receipt that is up can buy the next chest: a receipt or batch panel fading out after Open another is inert, and a second click finds the next opening already under way (found by Codex in review; a double click now buys one chest).

Measured on a production build, all five chests, 1440x900: the seal is on screen 31 to 113 ms after Open on a chest page and 15 to 20 ms after Open another; pressing it at once strikes the lock 1.18 to 1.21 s later, which is the hold itself. Before: about 3.3 s before the seal could be held, plus the scene rebuild on every Open another.

## 2. Complete pieces only

Founder: get rid of the sword guards and "random circle stuff"; "Lets have swords, spears, bows, crossbow, shields, helmets and so on." And: "some axes are just the heads of the axes without handle... Maybe same of spears or spikes. Check it."

Checked: all 25 small fittings (tsuba, spurs, arrowheads, bits, a stirrup, a kozuka) were photographs of loose parts; five axes (two Met antiques, three newly forged pieces whose example photos were excavated heads) showed only the head; and every polearm, the seven Met antiques and the three newly forged ones, was photographed as a head on a short stub of shaft. The Met has no full-length views of those polearms.

Decisions:
- The catalog holds whole pieces only. 40 pieces left, each archived in `src/data/retired.json` so saved vaults still show it: the 25 fittings, the 2 Met axe heads and the 7 Met polearm heads, and 6 newly forged pieces whose example photos were heads (three Viking axes, the boar spear, the Italian bill, the Burgundian poleaxe).
- 34 whole pieces joined (36 were added; Codex then flagged two whose example photos were bare blades with the tang showing, an iaito and a commissioned katana, and they left too). Eight antiques from The Cleveland Museum of Art (CC0), photographed at full length: a Swiss halberd, an Italian glaive, two Edo yari (Kagi and Su), an Edo yumi, a Scandinavian battle axe, a Sindhi battle axe and a seven-flanged mace (`scripts/assets/cleveland.py`, `src/data/cleveland.json`). Values are auction comparables researched with Codex; the glaive and both axes are estimates without close comparables. 26 newly forged pieces from the saved research batch and new research: shields, a tomahawk, daggers, iaito, longswords, a katana, helmets, armor, a crossbow, and the first bows (a Hungarian horse bow and an osage longbow). Photos with hands, labels, stands, rulers, glass reflections or a second object in frame were dropped, not used.
- A new category, bow. The reveal names each piece's kind from its name where the category is broad (a mace, a halberd, a spear, a pair of gauntlets), and the camera studies a polearm at its head before the pull back shows its full length.
- 131 pieces: 85 newly forged from 17 makers, 46 antiques (38 from the Met, 8 from Cleveland). Swords 44, helmets 21, daggers 18, armor 16, shields 12, axes and maces 7, crossbows 6, polearms 4, bows 3.

Prices. Without the $22 to $72 fittings the cheapest whole piece is $45, so a chest kept at an expected value of 88 to 92% of its price cannot cost much under $100. The chests become, in price order:

| Chest | Price | Was | Expected value |
|---|---|---|---|
| Squire's Coffer | $100 | $50 | $90.8 (90.8%) |
| Knight's Chest | $250 | $100 | $224.6 (89.9%) |
| Warlord's Hoard | $1,000 | $1,000 | $901.1 (90.1%) |
| Shōgun's Lacquer Box | $2,500 | $500 | $2,249.1 (90.0%) |
| King's Reliquary | $5,000 | $5,000 | $4,486.2 (89.7%) |

Odds keep their shape (about 50/30/13/5/1.6, Relic 0.05 to 0.4%). The Shōgun box draws only pieces made in Japan, and without the sword guards the cheapest are an Edo yumi ($400), an iaito ($453) and a yari ($650); with three more under $3,000 it is honest at $2,500. Japanese blades shown bare stay, antique and newly forged alike (the Met's katana, tachi, tantō and horimono blades, and three Akamatsu katana sold in a plain wood shirasaya): a Japanese blade with its tang is the whole blade as it is sold and collected, its handle a separate mount, unlike an axe head without its haft. Codex disagreed on the three Akamatsu photos; a blade-in-shirasaya photo was tried and read as a plain wooden stick. Recorded in AGENTS.md. A $50 chest would need whole pieces under about $25: throwing knives or practice blades, if the founder wants one.

## 3. Our own UI

Founder, on the result receipt: "This box and some elements of it here maybe look like too default AI generated UI so using some different styles or elements would be good to have our unique and high end, professional UI. This applies not only to this but maybe some other parts of UI."

What read as generic: a rounded dark glass card with a hairline and a top glow, a rounded gold gradient pill with a sheen, twin outlined boxes for Sell and Ship, three bare icons top right, a bold sans "hero number" with a colored "x4.8" stat, a green status dot, an iOS switch, a segmented pill control, rounded cards and toasts.

Decisions (worked out with Codex, which proposed "the armorer's register"; recorded in AGENTS.md as the interface language):
- The receipt is a ledger entry: solid dark iron under a brass head rule and a fine second rule; square corners; the rarity named with its pips and the kind of piece on one line; the name; the provenance; the value as a ledger line, label, dotted leader and the figure in the display serif, with what it means against the chest in words; then Keep as a flat brass plate, Sell and Ship as ruled cells with their terms, Open another, and Inspect, Replay and Share as words. No glow, no eyebrow over the title, no status dot.
- One button language across the product: flat brass for the main action (no gradient, no sheen), a square hairline for secondary actions, plain words for the rest; square icon controls; the Fast switch is a ledger tick with the state in words; the x1/x3/x5 choice is a row of ruled entries; the featured chest, the share sheet and the batch panels are ledger pages; toasts are square with a diamond mark; the live marks are static diamonds.
- Large money figures (receipt, item page, batch total) are set in the display serif, as the vault already did.
- The phone receipt is a sheet over the lower 62% of the screen at most and scrolls inside itself, so the piece keeps the top.
- The live ticker no longer lays a new name over the previous one while the row slides.

## 4. The thing stuck in the wall

Founder (top left of the reveal): "looks its clipped or stuck in the wall or at least wrongly positioned and weird."

Cause: the two small banners on the back wall hung directly behind the column nearest the wall as seen from the reveal's camera. The column hid the cloth, leaving the two ends of a brass rod and a strip of gold border sticking out on either side.

Decision: the side banners are gone. The camera moves too much (approach, travel, half turns, Inspect) for any spot on the back wall behind the column rows to stay clear, and the niche banner carries the hall.

## 5. The crown

Founder: "This crown still looks a bit iffy. I think we can do so much better. Also get rid of the cross."

Decision: a new crown, embroidered in gold thread on silk damask: a jeweled circlet that curves like a ring, three fleurs-de-lis (the side ones narrower, turned with the ring), a pearled point in each gap, a garnet and two sapphires in gold collets, pearls and beaded edges. Satin-stitch texture, couched cord outlines and a soft shadow under the raised work. No cross, no orb. The banner is painted twice, in color and as a material mask, so the thread is metal and catches the niche light while the silk stays matte.

## 6. The logo

Founder: "'I' in the logo looks like 'D'." Then, of a first drawn I: "It looks thinner than other letters."

Grenze Gotisch's capital I is a heavy stem and a hairline joined at top and bottom, nearly the same shape as its D. A first fix drew an I as a separate SVG shape: its stem was thinner than the face's (110 against 137 units) and Chrome draws shapes lighter than text, so it looked thin. The I now lives in a one-letter font, Ironbound Gothic (720 bytes, `src/assets/fonts/ironbound-gothic-i.woff2`, built by `scripts/assets/wordmark_font.py`): the face's own capital stem from its H (137 units, its flag and foot) with a matching serif on the other side of each end. CSS loads it for U+0049 alone and every other letter falls through to Grenze Gotisch, so the I is rendered as text at the face's weight. The derived font keeps the face's copyright and the SIL Open Font License (`src/assets/fonts/OFL.txt`; the face reserves no font name). The rarity stamps are untouched: none of their words has a capital I.

## 7. UI audit

Founder: "do the UI audit and see if we can improve overall, and make less default AI visuals and all."

Method: the Impeccable critique, with two independent reviewers, a design-director review of the live app on desktop and phone and a deterministic detector run in the browser on four pages. The design review scored Nielsen's ten heuristics at 27/40 and named what still read as a template; the detector found 429 findings, mostly text under 11 px, plus eyebrows over headings, a confirmed bug and keyboard-focus failures.

Fixed:
- The template on the landing: the eyebrow over every section heading, the italic second line on every heading (the hero keeps its brand line), numbering with no meaning ("Chest 01", "01 · Vault & insurance"). The ritual's three steps keep their order in roman numerals in the serif, as the chest page does. Tier and ledger labels in sentence case.
- The diamond means rarity only: status labels are words ("In vault", "Low resale"), and the live marks, toast marks and hero bullets lost their diamonds. The ticker reads "Recent pulls · Simulated".
- Money set large is in the display serif everywhere (`.ib-money`): chest prices, the chest page's figures, the share card, the batch total, the item page.
- The batch summary states its net ("+$98 against $750 paid") and is entered like the receipt.
- A sale from the receipt can be taken back for six seconds (Undo takes focus; the purse and the vault return exactly). Keep ends with a line saying where the piece went.
- On phones the vault's action bar steps aside while a sale or a shipment is confirmed, so it never covers the amount or the Confirm button; focus returns to the action that opened it.
- Bug: on /chests a click on a chest card's ODDS opened the chest page; the toggle now sits above the card's link.
- Keyboard: a skip link; the ticker's links and the landing's drifting river are out of the tab order (they repeated and drifted off screen); the vault's filter tabs draw their focus ring inside; the wax seal keeps a round focus ring.
- Touch: hover styles only on devices that hover; the logo link, the purse and the demo toggle are 44 px; the seal's hint drops "or hold Space" on touch screens; labels under 11 px raised.
- The batch's face-down cards carry the wax seal of the ritual and the tier in pips, so their rarity is not told by color alone. The trust section's "IB" box is the house emblem. The vault reads "Estimated result" and "At sell-back rates" instead of "Estimated gain · Gain" and "Sell-back net", with sentence-case spec labels.

Left for a later pass: one always-open "Conditions of the house" page in place of the trust list and the FAQ accordion, the sign-in step as "Sign the register", and hiding the demo panel behind a presenter flag.

## Verification

- `pnpm typecheck`, `pnpm test` (43 tests, including the store's sell and undo, the reveal's kinds, and the chests' expected value, band coverage and no fittings), `pnpm build`.
- `scripts/verify-premium.mjs` on a production build: 37 browser checks, no page errors. Its contrast check now reads text against the nearest painted surface, so a flat brass button inside a footer that fades to dark is read against the brass (it had been read against the dark fade, a false failure).
- On a production build, every chest: the seal on screen 29 to 40 ms after Open and 11 to 18 ms after Open another; a press at once strikes the lock 1.18 to 1.20 s later; a double click on Open another buys one chest; a press at once after a batch charges the seal; the keyboard path (hold Space, Enter on Open another, hold Space again) with and without reduced motion; sell then Undo restores the purse and the vault, and the Undo leaves after six seconds.
- Filmed: openings of the Su Yari, Swiss Halberd, Edo Yumi, Attila horse bow and Seven-Flanged Mace (the halberd held on its head through the facts, "A halberd", "A spear"); the hall from the waiting and receipt cameras, desktop and phone (no rods in the wall, the new crown); the receipt, the chest page, the chest list, the vault, a vault piece, the item page, a batch and the share sheet, desktop and phone; the wordmark at 1x and 2x.
- Codex reviewed the opening, the UI and the hall (round 1: three findings, all fixed) and then the whole change (round 2: five findings, all fixed: a sale could be paid twice from a batch sheet that was closing, so a sale now counts only for a piece in the vault and the closing sheet takes no clicks; the Undo window restarted on re-renders and Replays, so it now runs to a deadline fixed at the sale; focus after Undo and when the window ends; two example photos that were bare blades; and a skip link that changed the route in hash-router builds). Checked in a browser after the fixes: Undo returns focus to Keep, after six seconds Undo is gone and focus is on Open another, Replay and Skip do not bring it back, and the skip link keeps the route.
