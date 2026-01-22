# GitHub Copilot / AI Agent Instructions for "Mëso Programimin"

Overview
- Small static website (single-page `index.html`) intended as an Albanian-language learning platform.
- No build system, no tests, no package manager present.
- Key folders: `css/` (styles), `imgs/` (assets). Some paths in `index.html` point to a non-existent `Dizajni i ri/` folder.

High-level goals for the agent
- Preserve site language (`lang="sq"`) and UTF-8 encoding when editing text.
- Keep changes minimal and explicit: prefer small PRs that include screenshots for any visual change.
- Avoid changing content text without explicit instruction from maintainers (site is user-facing localized content).

Project layout & important files
- `index.html` — single main page: header (`.topbar`), hero section (`.hero`), lessons grid (`.lessons-grid`), steps (`.steps-grid`), and footer.
- `css/style.css` — stylesheet (currently empty in repo) — add or update rules here.
- `imgs/` — image assets (filenames may include spaces, e.g., `icon platformes.jpg`).
- `lessons/` — referenced by `index.html` (e.g., `lessons/hyrje.html`) but currently missing; create lesson pages here when adding content.

Concrete, actionable patterns (use these when making edits)
- Fix asset links to match the repository layout:
  - Example: change
    ```html
    <link rel="stylesheet" href="Dizajni i ri/style.css">
    ```
    to
    ```html
    <link rel="stylesheet" href="css/style.css">
    ```
  - Example: change
    ```html
    <img src="Dizajni i ri/icon platformes.jpg" alt="Logo">
    ```
    to
    ```html
    <img src="imgs/icon platformes.jpg" alt="Logo">
    ```
- When adding lesson pages, put them under `lessons/` and link with relative paths (e.g., `lessons/hyrje.html`).
- Keep JavaScript minimal and colocated near the bottom of `index.html` for now (current pattern uses a small inline script that toggles `body.openNav`). Consider creating a `js/` folder only when there are multiple scripts to manage.
- Respect existing HTML structure patterns: the project uses `.btn > a.btn-a` (anchor inside button) and `div.lesson-item` cards. If you change patterns, be consistent across the page.

Common pitfalls to watch for
- Path mismatches: `index.html` references `Dizajni i ri/` but actual assets are in `css/` and `imgs/`. Search for `Dizajni i ri/` and update references.
- Filenames with spaces (e.g., `icon platformes.jpg`) can cause issues; prefer replacing spaces with `-` when adding new files (but do not rename existing files without notifying maintainers).
- Missing pages (`lessons/`) — if you add pages, update navigation links and add a simple test by opening in a browser or running a local server.

Recommended local workflow (quick checks)
- Preview changes: use Live Server VS Code extension or run a local static server from the repo root:
  - `python -m http.server 8000` (then open `http://localhost:8000`)
- Check header script: test the mobile menu by clicking the element with `id="menuToggle"` (it toggles `body.openNav`).
- When modifying styling, add screenshots to the PR to show before/after visual changes.

PR Guidance & Safety
- Keep PRs small and focused (one visual/functional change per PR).
- Include a short description of why a change is needed and steps to manually test the change (e.g., "Open `index.html`, click menu, verify menu opens").
- Avoid changing user-facing Albanian text without an explicit request.

Examples for the agent to follow
- Fixing broken links and assets (small, concrete commits).
- Adding a new lesson: create `lessons/hyrje.html`, add content in Albanian, and link from the CTA buttons in `index.html`.

Questions for maintainers (leave as TODOs in PRs if unclear)
- Should filenames be normalized (remove spaces) or left as-is?
- Preferred PR title/description format and if screenshots are required.

If anything in this file is unclear or you'd like more examples (e.g., a sample PR description or change list), tell me what to expand and I'll iterate. ✅
