# Ironbound

Open a chest. Keep the steel. A front-end mock of a gacha platform for real arms and armor: pay a fixed price, open a chest and get one real piece, either an antique from a museum collection or new work from a named maker. Keep it in the vault, ship it home, or sell it back in one tap.

This is a demo. Every item, price, odds table and payout is simulated. There are no contracts, payments or accounts.

**Live demo:** https://oniani1.github.io/ironbound/

## Run it

```
pnpm install
pnpm dev        # http://localhost:5183
pnpm test       # odds, expected value, rolls and reveal facts
pnpm build
```

Demo controls sit in the corner of every page: force the rarity of the next pull, add credit, or reset.

## The opening

Hold to break the seal. The lock falls and stays on the altar, the lid breathes twice and opens by itself, and the camera studies the piece up close while its facts arrive one at a time: where it is from, what it is, antique or new, its year or maker, its weight. The camera pulls back, and only then is the rarity named, with its light. About ten seconds from seal to rarity. Skip and Fast are always available, and reduced motion gets crossfades.

## Builds

- **GitHub Pages:** `.github/workflows/pages.yml` builds with relative paths and hash routes on every push to `master`.
- **claude.ai Artifact:** artifact hosts serve no .glb and block blob: URLs and WebAssembly, so the script decodes the chest model at build time into a base64 module with separate .webp textures:

```
VITE_BASE=./ VITE_HASH_ROUTER=1 VITE_INLINE_MODEL=1 VITE_NO_THUMBS=1 node node_modules/vite/bin/vite.js build --outDir dist-artifact
VITE_NO_THUMBS=1 node scripts/artifact-page.mjs dist-artifact   # writes ironbound.html, repackages the chest, lists publish batches
```

## What is inside

| Area | Where |
|---|---|
| Opening ritual (3D chest, royal hall, camera, reveal) | `src/components/chest3d`, `src/components/opening` |
| Chests, odds and expected value | `src/config/chests.ts`, `src/lib/gacha.ts` |
| Catalog: 175 antiques and 65 pieces of new work | `src/data/items.json` (`scripts/assets/catalog.py`), `src/data/modern.json` (`scripts/assets/modern.py`) |
| Item pages and replays of any pull | `src/pages/Item.tsx` |
| Onboarding | `src/components/onboarding` |
| Vault, sell-back and shipping | `src/pages/Vault.tsx`, `src/components/vault` |
| Research and design reviews | `research/` |

## Credits

- Antique photographs: The Metropolitan Museum of Art, Open Access (CC0), cut out locally.
- New work: maker names and prices are researched for the demo, with no affiliation. Photos come from Wikimedia Commons, Flickr, The Cleveland Museum of Art and the Kunsthistorisches Museum under the license credited on each piece; many show an example of the type.
- 3D chest: "Treasure Chest" by Rico Cilliers, Poly Haven (CC0).
- Fonts: Cormorant Garamond, Instrument Sans and Grenze Gotisch (SIL Open Font License).
