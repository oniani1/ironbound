# SPEC: Ironbound front-end mock

## Goal
A polished, mobile-first web mock of a physical arms and armor gacha. Best-in-class onboarding, transitions and chest opening. It must look and feel better than Courtyard, Collector Crypt, Phygitals and GameStop Power Packs.

## In scope
1. **Landing** (`/`): live 3D chest hero, real item showcase, how it works, chest tiers, trust (vault, odds, buyback, shipping), big pulls feed, FAQ, footer with image credits.
2. **Onboarding** (first visit): "Open a free chest" opens the trial chest on the first click, with a guided hold-to-open and a sample Rare result. After the reveal: raise a banner (name and heraldic sigil), then a mock sign-in (email, Google, Solana wallet) that grants demo credit. Both steps can be skipped.
3. **Armory** (`/chests`): chest tiers at $50, $100, $250 (limited event), $1,000 and $5,000. Each shows price, expected value, odds bar, top items, buyback rate and limited stock.
4. **Chest detail** (`/chests/:id`): rotatable 3D chest, odds table with value bands, full item pool by rarity, recent pulls, open x1, x3 or x5, fast mode toggle, fairness note.
5. **Opening ritual**: hold to break the seal, rarity tell by light color with possible upgrades, lid burst, loot beam, item rise from silhouette to full light, reveal card with value count-up and multiplier versus price. Rarity scales length and intensity. Skip and fast mode. Multi-open reveals face-down cards that flip.
6. **Decision**: keep in vault, sell back instantly at the chest's buyback rate, or ship. Open again.
7. **Vault** (`/vault`): collection with total value and profit or loss, filters, item detail with specs, provenance and certificate, sell back flow, ship flow (address, insured courier, timeline).
8. **Global**: live pulls ticker, balance with animated changes, sound design with mute, reduced-motion support, persistence in localStorage.

## Data
Mock catalog of about 60 to 80 items from The Met Open Access (CC0) photos, cut out to transparent WebP. Each item has name, category, era, origin, materials, length and weight where known, rarity, value in USD and an image credit. Each chest has a weighted pool with expected value at 85 to 95 percent of price. Rolls happen client-side with `crypto.getRandomValues`.

## Dependencies
react, react-dom, react-router-dom, three, @react-three/fiber, @react-three/drei, @react-three/postprocessing, postprocessing, gsap, @gsap/react, motion, tailwindcss v4, Fontsource fonts, vitest. Build-time only: @gltf-transform/cli (via pnpm dlx) and Python with onnxruntime for cutouts.

## Out of scope
Smart contracts, real payments, real authentication, a backend or database, a real marketplace order book, real shipping, real-time multiplayer, legal and compliance copy beyond a short demo disclaimer.

## Verification
- `pnpm typecheck`, `pnpm test` (roll and expected value logic), `pnpm build` all pass.
- Playwright run through the full flow on desktop (1440x900) and phone (390x844): landing, onboarding, free chest, armory, open each rarity, vault, sell back, ship.
- Frame cost of the opening scene measured inside the render loop on desktop.
- Codex (gpt-6.1-sol, max) rates screenshots and the opening sequence each round. Iterate until both reviewers have no must-fix items.

## Round 2: premium pass (2026-10-14)
Founder feedback: the UI reads default, the opening is too fast with too little tease, the inventory needs real modern pieces from working makers with real photos. Direction in `research/critique-premium.md`.

1. **Design system.** One button language (gilt primary, hairline secondary, text, icon), labels instead of pills, vitrine presentation instead of bordered cards, a quiet header and a single ledger-line ticker, radii 2/6/10 px, a fixed type scale, one icon set, smooth inertial scroll and reveal-on-scroll. Applied to landing, armory, chest detail, reveal card, vault, onboarding.
2. **Opening v2.** Arrival (candles ignite, the chest lands), seal (hold, with heartbeat and heat), tease (the lid breathes and spills light in beats that climb through rarities, light rays through the gap, dust in the beam, the room darkens for high tiers), lift (the player drags or holds to throw the lid open), rise (silhouette, then lit from the top, macro for Rare and up), reveal. About 9 s for a Common and up to about 16 s for a Relic. Skip, Fast and reduced motion keep their current behavior. Recorded foley where licensed audio is available, procedural sound otherwise.
3. **Inventory v2.** Add real modern pieces from real makers alongside the antiques: about 70 to 90 items from $40 to $40,000 across swords, daggers, polearms, axes, helmets, shields, armour and crossbows, with maker profiles and resale notes. Photos only under free licenses (public domain, CC0, CC BY, CC BY-SA), credited per item. Chest pools rebalanced so commons are display-worthy pieces, keeping expected value at 85 to 95 percent of price. Makers are named for illustration; the demo states it has no affiliation with them.
4. **Light social.** A share card for a pull and a wall of notable recent pulls. No accounts, feeds or chat.

New dependencies: `lenis` (smooth scroll), `@phosphor-icons/react` (icons). Audio files only under CC0 or similar licenses, bundled locally.

Verification adds: the opening's phase timings measured per rarity, every new image's license recorded in `items.json`, expected value tests updated for the new pools, Codex reviews until no must-fix items remain.

Amendment (2026-10-15): the founder stopped the search for exact product photos ("enough; mock is fine for the rest"). New work uses the 73 researched products in `research/modern-makers.json` (13 real makers, real retail prices and sources) with the freely licensed photos picked there: 14 show the exact model, the rest are examples of the type and are labeled "Example photo". `scripts/assets/modern.py` builds `src/data/modern.json` from that file. The 12 invented-maker pieces from round 1 are gone; the trial chest gives the Regenyei Standard Feder; crossbows are their own category.

Amendment (2026-10-15, founder review of the opening and hero): no sound anywhere, sound engine and toggles removed. Candles removed; the scene sits in a darkened, blurred castle cellar panorama (Poly Haven, CC0). The opening reorders around suspense: neutral light until the player lifts the lid, the rarity named only after it opens, a close shot that travels along the piece before the pull back, then name, details and price; the receipt's length scale is gone. Hero fixes: the beam's UV seam (a line through its center) and the quality monitor that resized the canvas back and forth (black frames on fast pointer moves). Every piece is clickable to a public spec page (`/item/:id`) with odds per chest, and any pull can be watched as a replay that charges nothing and records nothing.

Amendment (2026-10-15, second founder review): the flicker was reproduced and measured with a frame-by-frame screencast while the pointer swept the hero and through a whole opening. Two causes: (1) the loot beam's shader took `pow()` of a value that interpolation can push a hair below zero at the beam's rim, which is NaN on D3D; the bloom's blur spread that one pixel over the whole canvas, a black frame; (2) the opening overlay's Suspense fallback was an instant opaque cover, after which the overlay faded in from transparent and showed the page again. Fixes: clamped `pow()` bases, a guard that zeroes non-finite pixels before the bloom, and a backdrop that fades in while the overlay loads. Measured on production builds with the same script: the last commit showed 11 black frames in 2,914; the fixed build 0 in 2,905. The grain's `mix-blend-mode` and the `backdrop-filter` panels are also gone, and the canvas keeps its drawing buffer. The castle panorama is replaced by a procedural royal hall (no download, no credit needed). The lock now lands and stays on the altar. The lift step is removed: after two breaths the lid opens by itself. The reveal is reordered so the rarity comes last: an extreme close-up that never shows the whole piece first, a camera move chosen by shape, plain light, facts one at a time (origin, type, antique or new, year or maker, weight), the pull back, then the rarity and its light. About ten seconds from seal to rarity. The catalog generator now reads the weight's own metric figure and checks it against pounds and ounces (three Met records had mistyped units).
