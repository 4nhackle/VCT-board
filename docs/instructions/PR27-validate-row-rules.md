# PR 27 — `validate.mjs`: block text dates, unknown team tiers, nameless rows, missing status

Base: `origin/main` after PR 26 is merged. Branch from `origin/main`.
Source: audit of 2026-11-09, "Should fix" items 1–3.

## Goal

Four kinds of bad data pass `node scripts/validate.mjs` with exit 0 today, and each one breaks the page without a visible error:

| Bad data | What the page does now |
|---|---|
| `"date": "2026-10-25"` (text, not a sheet serial number) | Row shows the raw text, is missing from the 오늘 tab, and is dropped by the day filter. Validate only warns ("날짜 형식"). |
| team `"tier": "legend"` | Team silently disappears from the roster tab (`rosterCards` keeps only `partner`/`ascended`). Validate never reads `tier`. |
| player or coach row with no `name` | Row gets no person ID, so no link. |
| player or coach row with `status` null or missing | Row shows "확인 필요" with no warning. |

Make each of these an error (exit 1), so the deploy stops before a broken page goes out.

## Rules

- Change only `scripts/validate.mjs`, `js/model/labels.js` (one word), and `scripts/test/tools.test.mjs`.
- Do not touch `data/`. The scheduled job owns it.
- Error messages are Korean and tell the sheet editor which cell to fix, like the existing ones.
- Current `data/` and `scripts/fixtures/` already pass all four rules (checked 2026-11-09). If either fails after your change, stop and report. Do not edit the data to make it pass.

## Changes

### 1. Text date is an error

`scripts/validate.mjs:51` now calls `warn(file, "날짜 형식", …)`. Change it to `errors.push(...)` with the same text plus the fix: `시트의 날짜 칸을 날짜 형식으로 바꾸세요`.
The rule stays the same: when the `date` key is present, it must be a number. A row with no `date` key still passes (watch rows have none).

### 2. Team tier must be known

- In `js/model/labels.js:9`, export `TIERS` (`var TIERS` → `export var TIERS`). Re-export it from `js/model.js` next to `tierName`.
- In `validate.mjs`, after `checkDefs("teams", teams, tIds)` (line 96), check each team: `tier` is absent, or one of `TIERS`, or `"other"`.
  - `"other"` is a real value: 5 teams use it for teams that stopped operating (`docs/instructions/roster-backfill-once.md:38`). It is not in `TIERS` because it has no label.
  - 273 teams have no `tier`. That is allowed.
- Error text: `teams <id>: 등급 "<tier>" 을(를) 알 수 없습니다 (partner·ascended·challengers·academy·other 중 하나)`.

### 3. Players and coaches need a name and a status

In the row loop (lines 45–62), for `players` and `coaches` only:
- `nameOk(r.name)` must be true. `nameOk` is defined at line 182; move that one line above the row loop so both places use it. Do not write a second copy.
- `status` must be a string with non-blank text.
- Do not apply these to `transfers.*` (they have no `status`) or `watch` (no `name`; it uses `team`).
- Error texts: `${at}: 이름이 비어 있습니다` and `${at}: 상태가 비어 있습니다. 시트의 상태 칸을 채우세요`.

## Tests — `scripts/test/tools.test.mjs`, use the existing `validateFixture` helper

Add one test per rule. Each asserts `status === 1` and matches the error text in `stderr`:
- `row: { date: "2026-10-25" }`
- `row: { name: "" }`
- `row: { status: null }`
- Tier: `validateFixture` writes `teams.json` as `[]`. Add an optional `teams` argument to it (default `[]`) rather than a new helper. Pass `[{ id: "x", name: "X", tier: "legend" }]` and expect exit 1. Pass the same with `tier: "other"` and with no `tier`, and expect exit 0.

Each `validateFixture` call starts a `node` process. Put the cases for one rule in one `t(...)` block, as the existing tests do. Do not add more than these 7 calls.

## Check before PR

1. `node scripts/test.mjs` passes (173 + 4 tests).
2. `node scripts/validate.mjs` on the real `data/` exits 0, with the same error count (0) as before.
3. `node scripts/validate.mjs scripts/fixtures` exits 0.
4. `node scripts/build.mjs _site` passes.
5. Write the session log and a PROGRESS.md section. Mark the PR 27 row in `docs/instructions/README.md` as done.

## Risk to note in the PR

From this PR on, a text date or blank status in the sheet stops the deploy instead of warning. That is the point, but the sheet owner should know: the CI failure message names the row.
