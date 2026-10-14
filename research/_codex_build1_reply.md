Committed `4e69895` on `codex/vault-onboarding`. Not pushed.

Created:

- `src/pages/Vault.tsx`
- `src/components/vault/`: `Experience.tsx`, `ImageViewer.tsx`, `ItemArtwork.tsx`, `ItemDetail.tsx`, `ShipFlow.tsx`, `valuation.ts`, `experience.css`, `vault.css`, `SPEC.md`
- `src/components/onboarding/`: `ArmsStep.tsx`, `HowItWorks.tsx`, `ClaimStep.tsx`
- `src/components/landing/`: `HowItWorksSection.tsx`, `ChestTiersSection.tsx`, `TrustSection.tsx`, `FaqSection.tsx`, `Footer.tsx`, `OddsBar.tsx`, `sections.css`

Updated `src/App.tsx` with vault and preview routes. `/lab` remains.

Typecheck and build passed with exit 0. All 47 browser checks passed, including checks at both requested sizes.

The assigned UI is complete. Shared follow-ups:

- Extend `Pull.shipment` to persist street/postal fields and an explicit delivery stage. Currently, the address summary persists and Delivered stays pending.
- Fill empty catalog bands or make `expectedValue` follow the roll fallback. The UI flags the current incomplete-pool estimates.

[Onboarding preview](http://localhost:5190/dev/onboarding) is running on port 5190.