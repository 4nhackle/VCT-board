# PR 29 — Small cleanup: one `esc`, private `DAY_VALUES`

Base: `origin/main` after PR 26 is merged. Independent of PR 27 and PR 28.
Source: audit of 2026-11-09, items 6 and 8 (only the parts listed here).

## Changes

1. `scripts/i18n-html.mjs:6` defines its own `esc`. Delete it and add `import { esc } from "../js/format.js";`.
   - `format.js`'s `esc` also turns `null`/`undefined` into `""`; the local copy turns them into `"null"`/`"undefined"`. The new behavior is safer. Confirm the build output is unchanged (step 2 below).
2. `js/state.js:27`: `export var DAY_VALUES` → `var DAY_VALUES`. Before you change it, run `grep -rn DAY_VALUES js scripts` and confirm the only uses are in `state.js`.

## Do not do (decided 2026-11-09)

- **Do not merge the four `read` helpers in `scripts/`.** They differ on purpose: `validate.mjs` throws on a missing file, `build.mjs` and `gaps.mjs` take a fallback, `i18n-report.mjs` returns `null`. One shared reader would need an option for each case and saves about 3 lines.
- **Do not remove the `it._st` cache in `stampOf` (`js/format.js`).** `js/model/notes.js:45` copies an item with a shortened note and keeps `_st` from the original note. Without the cache, the copy would read its report time from the shortened note and could lose it.

## Check before PR

1. `node scripts/test.mjs`, `node scripts/validate.mjs`, `node scripts/css-check.mjs` pass.
2. Build on `main` and on the branch on the same day, into two new folders, and run `diff -r` on them. Expect no difference.
3. Write the session log and a PROGRESS.md section. Mark the PR 29 row in `docs/instructions/README.md` as done.
