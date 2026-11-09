# PR 24 — Split `scripts/test.mjs` into per-module files

Base: `origin/main` @ `4c9ecec` (PR 23 merged). Branch from `origin/main`.
Merge order: PR 24 → PR 25 → PR 26. All three touch the tests. Open and merge them one at a time.

## Goal

`scripts/test.mjs` is one 1719-line file with 169 tests. Tests for different modules are mixed (for example, `ageOf` is next to `buildTabs`). Split it by the module under test. Behavior does not change. Every test survives, word for word.

## Rules

- No test is added, removed, or rewritten in this PR. Move only. The only edits allowed are import lines and moving shared helpers.
- The entry point stays `node scripts/test.mjs`. CI (`.github/workflows/pages.yml:25`), README, and the scheduled jobs call it. Do not change those callers.
- Keep `node:assert` only. No test framework, no new dependency.
- The final line stays `단위 시험 N개 통과`, with N = 169.

## Layout

```
scripts/test.mjs              runner: imports each file in a fixed order, prints the total
scripts/test/helpers.mjs      t(), the counter, T, and fixtures shared by 2+ files
scripts/test/format.test.mjs  js/format.js, js/note.js
scripts/test/model.test.mjs   js/model.js
scripts/test/state.test.mjs   js/state.js
scripts/test/views.test.mjs   js/views/*, js/components/*
scripts/test/i18n.test.mjs    js/i18n.js, js/i18n/*, scripts/i18n-*.mjs
scripts/test/tools.test.mjs   validate.mjs, build.mjs, out-dir.mjs, inline-script.mjs, css-check.mjs, gaps.mjs, fixtures
```

- `helpers.mjs` exports `t(name, fn)` and a `count()` getter. `t` keeps today's behavior: run `fn`, add one, print `ok <name>`. A thrown error still ends the process with exit code 1.
- `scripts/test.mjs` imports the six files in the order above, then prints the total from `count()`.
- Place each test by the function it mainly checks (the first function its asserts call). If a test checks two modules, put it with the higher layer (views over model, model over format).
- A fixture used by one file only (for example `RT`, `SR`, `mvRow`, `rosterOf`, `fakeEl`) moves into that file. A fixture used by two or more files goes into `helpers.mjs`. `T = 46326` goes into `helpers.mjs`.
- `VALIDATE_PATH`, `VALIDATE_JS`, and `VALIDATE` (`test.mjs:414`, `:519`, `:867`) point to the same file. Keep one constant, `VALIDATE`, in `tools.test.mjs`. This is the only rename allowed.
- Paths built with `new URL("./…", import.meta.url)` now resolve from `scripts/test/`. Fix each one to `../…`. Check `FIX` (fixtures folder) in particular.
- Remove the duplicate imports at the top (`regionName, tierName` and `tabName` are imported on separate lines today). Each file imports only what it uses.

## Check before PR

1. Before you change anything, run `node scripts/test.mjs > /tmp/before.txt`. After the split, run it again into `/tmp/after.txt`.
2. `sort /tmp/before.txt` and `sort /tmp/after.txt` are identical. The order can differ. The set of `ok …` lines and the 169 total must not.
3. Break one assert on purpose in each new file. Check that the run fails with exit code 1. Then undo it.
4. `node scripts/validate.mjs` and `node scripts/build.mjs _site` pass.
5. Write the session log and a PROGRESS.md section. Add a row to the `docs/instructions/README.md` index. In README.md, mention where tests live now.
