**Overall: 9/10, up from 8.5.** The armory identity passes the rubric’s generic-design test. The macro reveal, inspectable steel and optional setup now form a convincing product experience. Two interaction bugs remain.

Reviewed full-size captures and source, with public [Courtyard](https://courtyard.io/), [Collector Crypt](https://gacha.collectorcrypt.com/), [Phygitals](https://www.phygitals.com/claw) and [Power Packs](https://powerpacks.gamestop.com/) pages as references. Motion is provisional because live browser control was unavailable. No files edited.

### 1. Scores

| Area | Score |
|---|---:|
| First impression | 9 |
| Visual identity | 9.5 |
| Typography | 9 |
| Color and light | 9 |
| Layout and hierarchy | 9 |
| Onboarding | 8.5 |
| Chest opening | 9 anticipation / 9.5 reveal / 8 payoff |
| Motion | 8.5, provisional |
| Trust and honesty | 9 |
| Vault and ownership | 9 |
| Mobile | 9 |
| Overall | 9 |

The round-3 findings on aftermath routing, odds proportions and honesty copy are resolved in source. The stationary reduced-motion scene and persistent Close address the previous motion and control objections.

### 2. Must-fix, ordered by impact

1. **Make batch Inspect’s Keep cancel that item’s sale selection. `d-23, m-23`, returning to `d-22, m-22`.** In `MultiReveal.tsx`, Keep calls only `onClose`. A selected piece remains selected after the player explicitly chooses Keep, so **Sell selected can still sell it**. Give Keep its own callback that removes the item’s UID from `selected` before closing. Update the checkmark and sell total immediately. X and Escape should dismiss without changing selection.

2. **Move keyboard focus into the first opening and contain it there. `d-05, m-05`; also `d-21, m-21`.** Focus currently moves only when `RevealCard` mounts. A keyboard launch therefore leaves focus on the hidden launch button. `HoldToOpen.tsx` ignores Space/Enter from that button, so the advertised hold gesture does not reach the seal. Focus Close during intro, then the seal when awaiting input. Make the underlying page inert, contain focus in the active overlay and restore it on exit. Apply the same containment to batch Inspect.

### 3. Nice-to-have

- **`m-14, m-15, m-16`:** Move Skip below the main control row so the chest name remains readable. Its truncation weakens continuity during the most theatrical beats.
- **`m-07, m-17, m-20`:** Add one compact physical-dimensions line above the actions. Length and weight help turn a valuable picture into an object someone imagines owning.
- **`d-09, m-09`; claim-success state after `d-11, m-11`:** Replace “$1,000 demo credit to open any chest” with “$1,000 demo credit toward your next chest.” The King’s Reliquary costs $5,000.

### 4. Verdict

**Onboarding: not yet.** Moving keyboard focus onto the trial seal when it becomes ready would flip it.

**Visuals: clear yes.** The object photography, type and staged light provide a distinct reason to remember Ironbound.

**Opening experience: not yet.** Making batch Inspect’s Keep remove the piece from sale selection would flip the payoff verdict.