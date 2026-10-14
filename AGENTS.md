# Ironbound (working name)

A front-end mock of a gacha platform for real, physical arms and armor. A user pays a fixed price to open a chest and receives one random real item (sword, dagger, polearm, helmet, shield, armor piece). Items are vaulted; the user can keep, ship, or sell back instantly. Same model as the tokenized Pokémon card gacha machines (Collector Crypt, Courtyard, Phygitals), with steel instead of cards.

Scope: onboarding, visuals, animation and the chest-opening experience. Mock data only. No smart contracts, no real payments, no backend.

## Commands
- `pnpm dev` (port 5183), `pnpm build`, `pnpm typecheck`, `pnpm test`
- Never `npx tsc` on this machine. Use `pnpm typecheck`.

## Stack
Vite + React 19 + TypeScript (strict, noUncheckedIndexedAccess) + Tailwind v4 (`@theme` in CSS) + three.js via @react-three/fiber, drei and postprocessing + GSAP for timelines + motion for UI transitions.

## Assets
- Item photos: The Metropolitan Museum of Art Open Access (CC0), cut out with `scripts/assets/cutout.py` (ISNet via onnxruntime). Pipeline scripts live in `scripts/assets/`; raw downloads live in `assets-src/` (git-ignored).
- 3D chest: Poly Haven "Treasure Chest" by Rico Cilliers (CC0), optimized to `public/models/chest.glb`. Nodes: `treasure_chest_bottom`, `treasure_chest_lid` (pivot at the hinge), `treasure_chest_lock`, two handles.
- Credit both sources in the footer.

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
- "The armory at night": a candle and forge lit vault of real steel. Warm iron-black surfaces, parchment text, brass and gold as the accent, ember orange for heat. Museum-grade object photography floating on dark, lit by rarity light.
- Type: Grenze Gotisch for the wordmark and rarity stamps only, Cormorant Garamond for display and item names, Instrument Sans for UI and numbers (tabular figures).
- Rarity scale is metallurgy-inspired and also named, never color alone: Common (pewter), Uncommon (verdigris), Rare (blued steel), Epic (royal purple), Legendary (gold), Relic (crimson).
- References: Pokémon TCG Pocket (tactile opening), Genshin wishes (rarity told by light color), EA FC pack walkouts (staged information reveal), Hearthstone (face-down rarity glow), Diablo loot beams, CS2 case reel (tension), Christie's and Sotheby's catalogs (provenance typography), Elden Ring item descriptions (flavor text tone).
- Anti-references: generic crypto dashboards (purple to blue gradients, neon cyan, glassmorphism), casino slot kitsch, cartoon fantasy, Renaissance-fair parchment clichés, default MUI or shadcn looks.
- Dark only. No pure black or pure white. Neutrals are tinted warm.

### Design Principles
1. The object is the hero. Real items, large and beautifully lit. UI recedes around them.
2. Ritual over click. Every opening is a short ritual (commit, tell, reveal) with real interaction, scaled by rarity, and always skippable.
3. Honest numbers, in plain sight. Odds, expected value, buyback value and profit or loss are visible at a glance.
4. Value first, sign-up later. A new visitor opens a free chest before any account wall.
5. Light means rarity. Glow and color carry meaning (rarity, value, primary action), never decoration.

### Accessibility
- WCAG 2.2 AA contrast for text. Rarity is always named, never conveyed by color alone.
- `prefers-reduced-motion`: crossfades and instant reveals, no camera shake or flashes.
- No more than 3 flashes per second. Keyboard operable (hold Space to open). Visible focus.
- Sound starts muted until the first user gesture; a mute toggle is always visible.

## Writing rules
No em dashes in UI copy. Short sentences. Avoid filler words (see the banned list in the user's global writing standards).
