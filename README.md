# Ironbound

Open a chest. Keep the steel. A front-end mock of a gacha platform for real arms and armor: swords, daggers, polearms, helmets, shields and armor, vaulted and redeemable.

This is a demo. Every item, price, odds table and payout is simulated. There are no contracts, payments or accounts.

## Run it

```
pnpm install
pnpm dev        # http://localhost:5183
pnpm test       # odds, expected value and roll checks
pnpm build
```

Demo controls sit in the corner of every page: force the rarity of the next pull, add credit, or reset.

## Build the shareable page

A host-agnostic build (relative paths, hash routes, inlined fonts) for static hosts and claude.ai Artifacts. Artifact hosts serve no .glb and block blob: URLs and WebAssembly, so the script decodes the chest model at build time into a base64 module with separate .webp textures:

```
VITE_BASE=./ VITE_HASH_ROUTER=1 VITE_INLINE_MODEL=1 node node_modules/vite/bin/vite.js build --outDir dist-artifact
node scripts/artifact-page.mjs dist-artifact   # writes ironbound.html, repackages the chest, lists publish batches
```

## What is inside

| Area | Where |
|---|---|
| Opening ritual (3D chest, rarity tells, beam, reveal) | `src/components/chest3d`, `src/components/opening` |
| Chests, odds and expected value | `src/config/chests.ts`, `src/lib/gacha.ts` |
| Catalog of 187 items | `src/data/items.json`, built by `scripts/assets/catalog.py` |
| Onboarding | `src/components/onboarding` |
| Vault, sell-back and shipping | `src/pages/Vault.tsx`, `src/components/vault` |
| Sound (procedural WebAudio) | `src/lib/audio.ts` |
| Research | `research/RESEARCH.md`, `research/codex-research.md` |

## Credits

- Item photographs: The Metropolitan Museum of Art, Open Access (CC0), cut out locally.
- 3D chest: "Treasure Chest" by Rico Cilliers, Poly Haven (CC0).
- Fonts: Cormorant Garamond, Instrument Sans and Grenze Gotisch (SIL Open Font License).
