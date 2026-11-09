# PR 25 — Split `js/model.js` by concern

Base: `origin/main` after PR 24 is merged. Branch from `origin/main`.
Merge order: PR 24 → PR 25 → PR 26.

## Goal

`js/model.js` (526 lines) holds five unrelated jobs: labels, IDs, status reading, note tails, list tabs, and per-person/per-team data. Split it into files by job. Behavior does not change. All functions stay pure (no DOM, no `state`), as the file's first comment says.

## Rules

- **`js/model.js` stays as the public entry point.** It becomes a barrel that only re-exports (`export * from "./model/….js";`). The 18 importers (`js/state.js`, `js/main.js`, `js/views/*`, `js/components/*`, `js/i18n/*`, `scripts/validate.mjs`, `scripts/build.mjs`, `scripts/gaps.mjs`, `scripts/i18n-targets.mjs`, `scripts/test/*`, `dev/styleguide.js`) do not change.
- The barrel exports exactly the same names as today. No new public names. No removed ones.
- Move code; do not rewrite it. Keep every comment with its function.
- No import cycles. Dependencies go one way only, top to bottom in the table below.
- `build.mjs` already copies all of `js/` (`scripts/build.mjs:99`), so new files are deployed with no build change.

## Layout

| File | Functions (exported and private) | May import from |
|---|---|---|
| `js/model/labels.js` | `REGIONS`, `regionName`, `regionShort`, `TIERS`, `tierName` | `../i18n.js` |
| `js/model/ids.js` | `ID_RE`, `slugOf`, `cleanName`, `toIdOf`, `idsOf`, `own`, `dayOf` | — |
| `js/model/status.js` | `REPORTED_RE`, `joinStage`, `pillOf`, `cls`, `pillText`, `noteOf`, `routeOf`, `WATCH_KINDS`, `watchMeta` | `labels`, `ids` |
| `js/model/notes.js` | `noteSegments`, `sharedTails`, `hasTail`, `ownPart`, `ownItem` | `ids` |
| `js/model/tabs.js` | `toItem`, `mergeMoves`, `buildTabs`, `matches` | all above, `../format.js` |
| `js/model/people.js` | `buildIndex`, `ageOf`, `contractOK`, `contractState`, `careerOf`, `newestFirst`, `teamNameOf`, `arrives`, `arrivalsOf`, `latestMove`, `teamMoves`, `NEWS_KINDS`, `teamNews`, `rosterCards` | all above, `../format.js` |

- `own` and `dayOf` are private today but are used by both `tabs.js` and `people.js`. Export them from `ids.js`. Do **not** re-export them from the barrel.
- If a function turns out to need a file lower in the table than the one listed, move the function down. Do not add an upward import.
- Each new file starts with a one-line comment that says what it holds.
- The first comment of `js/model.js` stays. Add one line: the code now lives in `js/model/`, and this file only re-exports.

## Check before PR

1. Before you change anything, run `node scripts/build.mjs /tmp/site-before`. After the split, run `node scripts/build.mjs /tmp/site-after`.
2. `diff -r -x js /tmp/site-before /tmp/site-after` shows no difference. The static person and team pages are built from these functions, so they must be byte-identical.
3. Compare export lists. Run `node -e 'import("./js/model.js").then(m=>console.log(Object.keys(m).sort().join("\n")))'` before and after. The two lists must be identical.
4. Check for cycles: `grep -n "^import" js/model/*.js`. Every import points to a file higher in the table, or outside `js/model/`.
5. `node scripts/test.mjs` (169 pass), `node scripts/validate.mjs`, and `node scripts/css-check.mjs` pass.
6. Run `node scripts/dev-server.mjs` locally. Open each tab, one person page, and one team page, in Korean and in English. The browser console shows no errors (a missing export only fails in the browser).
7. Write the session log and a PROGRESS.md section. Add a row to the `docs/instructions/README.md` index.
