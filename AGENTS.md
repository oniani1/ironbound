# Ironbound (working name)

A front-end mock of a gacha platform for real, physical arms and armor. A user pays a fixed price to open a chest and receives one random real item (sword, dagger, polearm, helmet, shield, armor piece). Each piece is either newly forged by a named maker, which can be bought today (most of the swords are), or an antique a collector could find for sale, plus a few museum grails in the top tiers. Items are vaulted; the user can keep, ship, or sell back instantly. Same model as the tokenized Pokémon card gacha machines (Collector Crypt, Courtyard, Phygitals), with steel instead of cards.

Scope: onboarding, visuals, animation and the chest-opening experience. Mock data only. No smart contracts, no real payments, no backend.

## Commands
- `pnpm dev` (port 5183), `pnpm build`, `pnpm typecheck`, `pnpm test`
- Never `npx tsc` on this machine. Use `pnpm typecheck`.

## Stack
Vite + React 19 + TypeScript (strict, noUncheckedIndexedAccess) + Tailwind v4 (`@theme` in CSS) + three.js via @react-three/fiber, drei and postprocessing + GSAP for timelines + motion for UI transitions.

## Assets
- The catalog holds whole pieces only: swords, daggers, spears and polearms on their full hafts, axes and maces with their handles, bows, crossbows, shields, helmets and armor. No loose fittings, sword guards, spurs, arrowheads or heads without a haft (fourth review, 2026-10-15). One exception: a Japanese blade may be shown bare with its tang, antique or newly forged, because that is the whole blade as it is sold (in a plain wood shirasaya) and collected; its handle is a separate mount.
- Antique photos: The Metropolitan Museum of Art Open Access (CC0), built into `src/data/items.json` by `scripts/assets/catalog.py`, and The Cleveland Museum of Art Open Access (CC0), whose full-length photographs show polearms, axes and bows whole, built into `src/data/cleveland.json` by `scripts/assets/cleveland.py`. Both cut out with `scripts/assets/cutout.py` (ISNet via onnxruntime). A piece dropped from the catalog keeps a short record in `src/data/retired.json`, so saved vaults still show it. `scripts/assets/openings.py` cut the backdrop out of sword guards' openings; it is unused since the guards left.
- Newly forged pieces: real makers and retail prices researched for the demo, built into `src/data/modern.json` by `scripts/assets/modern.py` (`--only id,...` adds or rebuilds single pieces from cached photos). Photos come from Wikimedia Commons, Flickr, The Cleveland Museum of Art and the Kunsthistorisches Museum under the license credited on each piece. `photoExact: false` marks an example of the type, and every surface that presents the piece says so: vitrines, the vault, receipts, batch cards and their Inspect sheet, the share card and the item page. Small list thumbnails link to those.
- Pipeline scripts live in `scripts/assets/`; raw downloads live in `assets-src/` (git-ignored).
- 3D chest: Poly Haven "Treasure Chest" by Rico Cilliers (CC0), optimized to `public/models/chest.glb`. Nodes: `treasure_chest_bottom`, `treasure_chest_lid` (pivot at the hinge), `treasure_chest_lock`, two handles.
- Hall textures: Poly Haven stone, floor and velvet sets (CC0) in `public/textures/hall/`.
- Credit every source in the footer.

## Design Context

### Users
- Primary: 20 to 40 year old pack openers who already rip Pokémon and sports cards on Courtyard, Collector Crypt, Phygitals or GameStop Power Packs, or open CS2 cases. Mostly on phones, often late at night, 5 to 20 minute sessions, several chests in a row. Some use crypto wallets, many do not.
- Secondary: history buffs, HEMA fencers, cosplay and LARP players, and people who want a real sword or helmet on the wall. Gift buyers.
- Job: feel a high-variance pull with a real shot at a valuable, displayable piece of history, then act on it in one tap: keep it, ship it, or sell it back.

### Brand Personality
- Forged, theatrical, trustworthy.
- Voice: confident and terse, a little mythic, never cheesy. Every number is honest. Lines read like an armorer's ledger, not a casino.
- Emotional goals: anticipation before the reveal, awe at the reveal, pride in the vault, trust in the odds and the value.

### Aesthetic Direction
- "The hall at the end of the day": the chest stands on an altar in a royal hall, built in code (`RoyalHall.tsx`) with CC0 Poly Haven stone: stone columns receding into haze, late sunlight through tall lancet windows in shafts with dust in them, long column shadows, a crimson runner, a crimson silk banner in an arched niche with a crown embroidered in gold thread (three fleurs-de-lis, pearls, a jeweled band, no cross; the thread is metal in the material, the silk matte), everything else in deep shadow. Nothing hangs on the back wall behind the columns: from the reveal's camera a column covers it (fourth review). The sun stays a neutral warm white; color belongs to rarity. Warm iron-black surfaces, parchment text, brass and gold as the accent, ember orange for heat. Museum-grade object photography floating on dark, lit by rarity light. No fire and no candles: the founder found candles "wizardish" and the torches unpolished (third review, 2026-10-15).
- Type: Grenze Gotisch for the wordmark and rarity stamps only (the face's own capital I reads as a D, so a one-letter font, Ironbound Gothic, supplies an I drawn from the face's capital stem: `scripts/assets/wordmark_font.py`, loaded in globals.css for U+0049 only), Cormorant Garamond for display and item names, Instrument Sans for UI and numbers (tabular figures).
- Rarity scale is metallurgy-inspired and also named, never color alone: Common (pewter), Uncommon (verdigris), Rare (blued steel), Epic (royal purple), Legendary (gold), Relic (crimson).
- References: Pokémon TCG Pocket (tactile opening), Genshin wishes (rarity told by light color), EA FC pack walkouts (staged information reveal), Hearthstone (face-down rarity glow), Diablo loot beams, CS2 case reel (tension), Christie's and Sotheby's catalogs (provenance typography), Elden Ring item descriptions (flavor text tone).
- Anti-references: generic crypto dashboards (purple to blue gradients, neon cyan, glassmorphism), casino slot kitsch, cartoon fantasy, Renaissance-fair parchment clichés, default MUI or shadcn looks.
- Dark only. No pure black or pure white. Neutrals are tinted warm.
- Interface language (fourth review, 2026-10-15: the founder found the receipt "too default AI generated"): the armorer's register. Square corners (2 px at most), no gradients, no sheen, no glow on controls, no pills, no status dots. One flat brass plate for the single main action on a view (`.ib-button--primary`), a square hairline for secondary actions, plain words for the rest. Panels that hold a result or a decision are ledger pages (`.ib-ledger`): solid dark iron under a brass head rule with a fine second rule. The receipt reads as a catalog entry: the rarity named with its pips and the kind of piece on one line, the name, the provenance, then the value as a ledger line with a dotted leader in the display serif, the actions (Keep as the brass plate, Sell and Ship as ruled cells with their terms), and Inspect, Replay and Share as words. On and off is a ledger tick with the state in words (`Switch`), a choice between a few values is a row of ruled entries (`Segmented`). Large money figures are set in the display serif with lining figures; tables and small figures stay in Instrument Sans.

### Design Principles
1. The object is the hero. Real items, large and beautifully lit. UI recedes around them.
2. Ritual over click. Every opening is a ritual with real interaction, scaled by rarity, always skippable, in this order (founder, 2026-10-15, third review; it supersedes the second review's breaths, one-second facts and ten-second total): hold to break the seal, which can be held from the first frame of every opening (fourth review: no waiting for the chest or the camera; a short arrival of about 1.2 s plays under it and a hold hurries it, and Open another keeps the scene and cuts straight to the next sealed chest); the lock falls and stays on the altar; the camera sinks to the rim line and the lid opens once, by itself, so the inside of the chest never shows (the open chest is full of light); the camera tilts up into the light and moves straight in to the close-up, and the piece rises into the shot the moment the camera is there (no waiting on empty light); it is never seen whole first, and the camera travels slowly along it by shape in plain light with no rarity color: tall pieces top to bottom and wide ones left to right, both following the metal however the piece bends, long-hafted ones (spears, halberds) studied at the head before the pull back shows their full length, round and compact ones (shields, helms, maces) circled half a turn as the view opens from about half the piece to most of it; facts arrive one at a time in a large serif, each held at least 2.5 s: origin, type, antique or newly forged, year (maker for newly forged pieces), weight; a slow pull back to the whole piece; the rarity comes last, large and alone, with its light; then the name, provenance and value build beside the piece; then the receipt. About 19 s from seal to rarity (16 s for a piece with no recorded weight, one fact fewer). No length scale on the receipt.
3. Honest numbers, in plain sight. Odds, expected value, buyback value and profit or loss are visible at a glance.
4. Value first, sign-up later. A new visitor opens a free chest before any account wall.
5. Light means rarity. Glow and color carry meaning (rarity, value, primary action), never decoration.

### Accessibility
- WCAG 2.2 AA contrast for text. Rarity is always named, never conveyed by color alone.
- `prefers-reduced-motion`: crossfades and instant reveals, no camera shake or flashes.
- No more than 3 flashes per second. Keyboard operable (hold Space to open). Visible focus.
- No sound anywhere (founder, 2026-10-15). No audio files, no sound toggle.

## Writing rules
No em dashes in UI copy. Short sentences. Avoid filler words (see the banned list in the user's global writing standards).
