1. **Focus return: fixed.** [OpeningProvider.tsx:105](</C:/Users/nikao/Desktop/Projects/Medieval Gacha/src/components/opening/OpeningProvider.tsx:105>) captures the launcher before `setSession(next)` makes the page inert. [Line 58](</C:/Users/nikao/Desktop/Projects/Medieval Gacha/src/components/opening/OpeningProvider.tsx:58>) restores focus after the closing render removes inert. The overlay’s competing restoration is gone. This matches your reported Chromium measurements for all three exits.

2. **Kabuto image: acceptable.** Viewed against an opaque background and compared with the cached cutout, the wooden stand and stub are gone. Both lower side plates retain their original tips, and the brim remains intact. The central gap follows the stand’s former position.

Onboarding: **clear yes**  
Visuals: **clear yes**  
Opening experience: **clear yes**