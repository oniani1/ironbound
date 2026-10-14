**Overall: 8.5/10, up from 7.5.** The mobile object framing and batch payoff are substantially better. The armory passes the rubric’s generic-design test. The remaining blockers concern state, control and honesty.

Reviewed the full-size captures and source. Motion scores are provisional because live playback was unavailable.

**1. Scores**

| Area | Score |
|---|---:|
| First impression | 8.5 |
| Visual identity | 9 |
| Typography | 8.5 |
| Color and light | 8.5 |
| Layout and hierarchy | 8.5 |
| Onboarding | 8 |
| Chest opening | 8.5: anticipation 8.5, reveal 9, payoff 8 |
| Motion | 7.5* |
| Trust and honesty | 7.5 |
| Vault and ownership | 8.5 |
| Mobile | 8.5 |
| Overall | 8.5 |

**2. Must-fix, ordered by impact**

1. **Make the first-pull aftermath follow the player’s choice. `d/m-07, 09, 10`.** “Keep in vault” should open the vault, with optional banner and credit invitations. After selling, show **“Fencing Feder sold. $414 demo credit added.”** The current close callback always opens setup, and the continuity line claims the sold piece is still in the vault. After a guest has used the trial, replace **“Open a free chest”** with **“Claim demo credit”** wherever that button now opens setup. The first click delivers; the exit still mishandles intent.

2. **Make the odds graphic mathematically honest. `d/m-11, 12`.** The armory/detail `OddsBar` assigns every rarity a minimum weight of 1.8% before normalization. Warlord’s **0.01% Relic chance receives approximately 1.72% of the strip’s assigned width**. Remove that floor and show actual proportions. Put the tiny tiers in a named, expandable **“Rarity odds”** legend at 12px minimum. Rename **“Item value” → “Expected item value”** and **“As cash” → “Expected sell-back”**. These are averages, not the next reward. [Collector Crypt already labels expected value explicitly.](https://gacha.collectorcrypt.com/)

3. **Finish the honesty pass outside the result card. `d/m-12`, below the captured viewport.** Chest detail still claims verifiable randomness, insured inventory and recent auction valuations, with a valuation date generated from today’s date. Replace those statements with **“Demo draws use browser randomness. No on-chain proof.”**, **“Inventory and insurance are simulated.”**, and **“Sample valuations · 14 Oct 2026. No live appraisal.”** The vault already handles this distinction better.

4. **Apply reduced motion to the entire 3D experience. `d/m-05, 06, 08, 17, 19`.** The result fade is fixed, but entry still drops and shakes the chest; charging still rattles it and moves the camera. Camera drift and item rotation continue after reveal. In reduced motion, place the chest immediately, use stationary charge feedback, set the final camera directly, and disable float, rotation and drift. Entry, Replay and Inspect should use **200ms opacity-only transitions**.

5. **Allow control from the first frame. `d/m-05, 06, 13`.** Close appears only after reveal, and Escape works only then. Provide a **44px Close throughout**. Before the hold, Close should return directly to the originating screen. Preserve already awarded items during paid openings. Make Fast reveal immediately when enabled during the waiting phase. Restrict the global Space/Enter handler so it cannot intercept keyboard activation of Fast, sound or Close.

**3. Nice-to-have**

- **`m-01`:** Reduce the hero explanation to two lines and fit the complete chest above navigation.
- **`m-05`:** Raise the waiting chest approximately 60px and place the seal control nearer its lock. The large empty upper area weakens the first interactive moment.
- **`d/m-08, 17`:** Add pinch/scroll zoom to Inspect using the vault viewer’s controls. The material now deserves closer examination.
- **`d/m-11`:** Rename the card’s **“Open”** action to **“View chest”** while it navigates to detail.
- **`d/m-11, 12`:** Give chest tiers different construction silhouettes. Recoloring one chest remains the weakest part of the visual system.

**4. Verdict**

**Onboarding: not yet.** A state-aware post-trial exit that follows Keep or Sell would flip it.

**Visuals: clear yes.** The photography, typography and composed reveal lighting give Ironbound a distinct identity.

**Opening experience: not yet.** An instant, stationary result mode available from the first frame would flip it; normal-mode game feel still needs live playback verification.