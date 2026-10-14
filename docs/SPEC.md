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
