You are the design and UX reviewer for Ironbound, rating my (Claude's) work. Be demanding: the goal is to beat Courtyard, Collector Crypt, Phygitals and GameStop Power Packs on onboarding, visuals, animation and the chest opening. You researched them yourself in `research/codex-research.md`.

Read `AGENTS.md` (design context and principles). The attached images are labeled screenshots of the current build, desktop (1440x900) and phone (390x844), including frames captured during the chest-opening sequence. The code is in `src/` (opening: `src/components/opening/*` and `src/components/chest3d/*`; pages in `src/pages/*`).

Apply the guidance in `C:\Users\nikao\.claude\skills\critique\SKILL.md`, `...\audit\SKILL.md` and `...\frontend-design\SKILL.md` (and its `reference/*.md`) as your rubric, plus your own best judgment on game feel and animation.

Reply in Markdown, under 900 words:
1. Scores from 1 to 10 for: first impression, visual identity, typography, color and light, layout and hierarchy, onboarding, chest opening (anticipation, reveal, payoff), motion quality, trust and honesty of numbers, mobile, overall. One line of reasoning each.
2. Must-fix list (max 10), ordered by impact. Each item: what is wrong, where (file or screen), and the exact change you recommend (values, copy, timing, layout).
3. Nice-to-have list (max 8).
4. The single biggest change that would make a player say "how was this made?".
Do not edit any files.
