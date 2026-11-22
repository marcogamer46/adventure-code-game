# Adventure — learn the six src/student components

An interactive, playable walkthrough of the six Python components in a school project's `src/student/` folder (`character.py`, `artifact.py`, `enemy.py`, `terrain_generator.py`, `level_generator.py`, `controller.py`). Framed as a team explainer: each file is owned by a team member, and the page teaches how the pieces fit together — not just what they do.

**What you can do**

- **Play** — move the agent on maps produced by the terrain/level generators, collect artifacts, dodge patrols, engage enemies, and reach the exit.
- **Watch AI** — runs a JavaScript port of `controller.py`'s Dijkstra planner. While planning it shows the states it explores, the planned vs actual path, and the engage-vs-detour cost reasoning. Patrol ghost trails show the next several turns' positions.
- **Explain it back** — per-file, grader-style questions with model answers and the relevant source lines highlighted; tracks which files you've covered.
- **Data flow** — clickable diagram: seed → terrain_generator → level_generator → level → controller → actions → score.
- **Edge cases** — honest team review notes (straight/bent empty-range bug, heapq tie-break fragility, Manhattan-vs-route distance, O(n²) `_degree_one`, 1-wide-corridor patrol deadlock), each tagged observed-in-code / reproduced.
- **Reference** — printable one-page sheet per file: purpose, inputs, outputs, invariants, dependencies, owner.
- **Read code** — every file, line-numbered and annotated block by block.

**Fidelity / what was actually verified**

- The seven baked levels are genuine output of the real Python generators.
- The JS port of the controller was verified against the real Python `AgentController` on the straight-path level (seed 123): identical action sequences across the full 24-turn solve.
- The **Random** button uses a JavaScript PRNG (`mulberry32`). It reproduces each algorithm's behavior but **not** Python's exact `random.Random` sequences. Only the seven baked levels are authentic generator output.

Single self-contained HTML file — no build step, no external libraries, no network calls. Open `index.html` in any browser, or play at the GitHub Pages URL.
