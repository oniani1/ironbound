1. **Batch Inspect Keep: fixed.** [`MultiReveal.tsx:288`](<C:/Users/nikao/Desktop/Projects/Medieval Gacha/src/components/opening/MultiReveal.tsx:288>) deletes the UID from `selected` before closing. X and Escape use the separate dismiss callback. This matches your measured $93 to $63 change.

2. **Keyboard blocker: not fully fixed.** [`HoldToOpen.tsx:43`](<C:/Users/nikao/Desktop/Projects/Medieval Gacha/src/components/opening/HoldToOpen.tsx:43>) focuses the seal. Phase focus and containment address the entry problem. **Return focus still fails:** Chromium left focus on `BODY` after Escape, with both cold and warm launches, including with StrictMode replay disabled. [`OpeningOverlay.tsx:179`](<C:/Users/nikao/Desktop/Projects/Medieval Gacha/src/components/opening/OpeningOverlay.tsx:179>) captures the opener after the provider has made the background inert. **Exact fix:** capture the launcher synchronously in `OpeningProvider.open()`, then restore focus from the provider after the closing render removes `inert`.

**New defect**

- **The kabuto crop clips actual metal.** [`catalog.py:384`](<C:/Users/nikao/Desktop/Projects/Medieval Gacha/scripts/assets/catalog.py:384>) clears every pixel below one horizontal boundary. Comparing the exported image with the cached cutout shows truncated lower side plates and a remaining wooden stub beneath the brim. **Exact fix:** replace the horizontal cut with an item-specific alpha mask for the exposed stand, preserve the metal silhouette, and regenerate the image, thumbnail and aspect. This is a localized visual defect; the overall visual verdict holds.

Onboarding: **not yet**  
Visuals: **clear yes**  
Opening experience: **clear yes**

No files edited.