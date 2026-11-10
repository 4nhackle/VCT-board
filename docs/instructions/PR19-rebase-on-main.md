# PR 19 rework: move the roster redesign onto current main

Source: 2026-11-10. Rebasing `VCT-board-pr19` (`design/roster-tab`, `0130bf6`) onto `origin/main` (`018f3e1`) conflicted in `js/views/roster.js`, `js/main.js`, `docs/PROGRESS.md`. Follow `CLAUDE.md`. Original spec: `PR19-roster-design-move-size.md`.

## Why a plain rebase does not work

PR 22 (search, #55) and PR 23 (transfers, #56) changed `roster.js` first, and main already has most of PR 19 in a different form:

- main `rosterHTML`: region header `.rh`, team header `h3.th`, one `ul.list > li.row.roster` line per person (same row look as the players tab). Includes `searchCard` and `state.q` search. CSS `.row.roster`, `.th`, `.rh + .th` already exist.
- PR 19 `0130bf6`: rebuilt the same structure as a `ul.roster` grid with `.role`, replaced `+i −o` with coloured `.in`/`.out` spans, and enlarged the move column (`.move`).

Replaying PR 19 whole would overwrite main's search and row markup. **Use main's `roster.js` as the base and port only the three items below.**

## Branch

Create `design/roster-tab-v2` from `origin/main`. Keep the old `design/roster-tab` as reference; do not delete it. Do not push or merge until the user says so. Open the PR and report.

```bash
git fetch origin
git switch -c design/roster-tab-v2 origin/main
```

Do not merge within 30 minutes of a scheduled data run (08:50 and 09:35 KST daily; also 14:50, 15:35, 20:50, 21:35 until 11/16).

## Port these (only these)

### 1. Larger move column text (`css/style.css`; missing on main)

Edit main lines ~202–203 as PR 19 did:

- `.move` and `.move .team`: `font-size` from `var(--text-small)` to `var(--text-body)`.
- Add `.move .route { font-size: inherit; }`.
- Do not touch `.dp-route .route` (detail page header) or `.route` outside rows.
- Check: at 1280 wide, a long route (`Team Liquid → Natus Vincere`) does not push the status column. At ≤600px (two-line layout near main line ~413), the move line wraps cleanly.

### 2. Coloured in/out count in the team header (`roster.js`, `css/style.css`, i18n)

- In `roster.js`, replace the `t("roster.inout", ...)` string inside `h3.th > .n` with `<span class="in">+i</span> <span class="out">−o</span>` (same markup as PR 19 `teamHTML`).
- Add CSS: `.th .in { color: var(--status-signed-fg); font-weight: 700; }` and `.th .out { color: var(--status-left-fg); font-weight: 700; }`. Numbers already get `tabular-nums` from `.th .n`.
- If `roster.inout` is no longer used, remove it from both `ko.js` and `en.js` (the key-parity test must still pass). Run `grep -rn "roster.inout" js scripts` first.
- Keep the `+` / `−` signs: colour must not be the only cue.

### 3. Show the tab hint (`js/main.js`, `roster.js`)

PR 19 found that `tab.hint` never showed on the roster tab (the roster branch in `main.js`, now ~lines 38–40, returns before the hint is built). Check whether main still does this. If yes, call `rosterHTML(tab.cards, state, tab.hint)` and emit `<p class="hint">` above the first region. If the hint already shows, skip this item and say "already fixed" in the report.

## Do not port

- The `ul.roster` grid, `.role` class and their CSS. Keep main's `li.row.roster` lines. Reason: the PR 19 principle is "reuse the list-tab look, add no new visual language", and main already does that. If the user wants the grid, it is a separate PR.
- Do not change `searchCard`, `state.q`, or the PR 23 transfer-following behaviour.

## Tests (`scripts/test.mjs`)

- Read main's `rosterHTML` tests. Add asserts that the team header `.n` contains `.in` (`+i`) and `.out` (`−o`). Search and region-filter tests must keep passing unchanged.
- If main has no assert that a region outside `REGIONS` lands under the `region.other` header, add one.
- Move-column font size is CSS only; `css-check` covers it.

## Verify

```bash
node scripts/test.mjs
node scripts/validate.mjs
node scripts/css-check.mjs
node scripts/build.mjs _site
node scripts/dev-server.mjs 8080
```

- `#roster` at 1280 and 375 wide, KR and EN, light and dark OS: `+` green, `−` red, search box and region chips still filter.
- `#players` and `#transfers`: move column visibly larger, no overflow at 1280, 768, 375.
- Team page `/t/<id>/`: roster section unchanged.
- Before/after screenshots in the PR body.

## Out of scope

Grid layout, team logos, roster data, the team page, row layout other than the move column size.

## Report (in Korean)

Branch, PR link, test count before and after, screenshots, items not ported and why, result of item 3. Write the session log `docs/sessions/YYYY-MM-DD-pr19-rebase.md` and update the PR 19 section of `docs/PROGRESS.md` (note it was reworked on top of main).

## Done when

main's search and list rows are intact, the team header +/− are coloured, the move column is body size, tests and css-check pass, the PR is open, and the session log is written.
