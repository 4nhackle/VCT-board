# PR 2: Data rules: year-only contract end, `caption` field, source warnings

Design reference: `docs/개선-설계-2026-11.md` sections 1.1, 1.3–1.5. Follow `CLAUDE.md`.

This PR must be merged BEFORE the scheduled-task prompts change (`docs/instructions/schedule-*.md`). The site must accept the new values first, or GitHub Actions validation fails and deploys stop.

## Goal

1. `contractUntil` accepts a sheet serial number (as today) OR a 4-digit year string `"2027"`.
2. Rows may carry a `caption` string: a one-sentence current summary. The site shows it instead of the long `note` history.
3. `validate.mjs` warns about weak source URLs.

Without new data, the rendered site must not change. Prove this with the HTML diff and style snapshot.

## Branch

`feature/data-rules` from latest `origin/main` (after PR 1 is merged, because both edit `js/model.js`). Do not merge. Open the PR and report.

## Changes

### Contract year (`js/model.js`, `scripts/validate.mjs`, `js/views/person.js`, i18n)

- `contractState(until, today)`: if `until` is a string matching `^\d{4}$`, return `{ kind: "year", label: t("contract.year", { y }), year: y }`. If `y` is earlier than the current KST year, return the existing `expired` result. Keep the numeric behavior unchanged.
- `validate.mjs` (two places: row check about line 106, people check about line 115): allow `typeof v === "number" || /^\d{4}$/.test(v)`. Update the error text to "시트 일련번호(숫자) 또는 yyyy".
- `person.js` `contractText(n)` and the `typeof … === "number"` checks around lines 60–128: treat a year string as present. Show `contractState(...).label` only for year strings (no ISO date).
- Dictionary: add `contract.year` (ko `"{y}년까지"`, en `"through {y}"`).
- `scripts/gaps.mjs`: a year string counts as filled.

### Caption (`js/model.js`, `js/components/row.js`, `scripts/validate.mjs`, i18n targets)

- `toItem`: add `caption: r.caption` for player, coach and transfer kinds.
- `rowHTML`: if `cleanName(it.caption)` is non-empty, use it as the detail body instead of `sp.body`. Keep the source line (`srcsHTML`) and the stamp exactly as today. If there is no caption, the output must be byte-identical to today.
- Person detail page: keep showing the full `note` history. Do not use `caption` there.
- `validate.mjs`: error if `caption` exists and is not a string; warning if it is longer than 120 characters.
- `scripts/i18n-targets.mjs`: include `caption` text as a translation target, the same way `note` is handled. EN view without a translation shows the Korean original with the KR mark (existing `textHTML` behavior).

### Source warnings (`scripts/validate.mjs`)

For each entry in `sources.json` (`[name, url]`), add warnings, not errors:
- the URL does not start with `https://`;
- the URL path is empty or `/` (homepage);
- the same URL appears under two or more source ids.

Print the counts in the summary block. The total warning count may increase; mention the new number in the PR body.

## Tests (`scripts/test.mjs`)

- `contractState("2027", T)` gives kind `year`. `contractState("2025", T)` gives `expired`. Numeric cases stay unchanged.
- A `validate.mjs` run against a temp fixture: number OK, `"2027"` OK, `"2027-05"` error, `caption: 5` error.
- `rowHTML` with caption shows the caption and keeps the source link. Without caption, it equals the current output (snapshot string from a fixture item).
- Source warning helper: homepage URL, http URL, duplicate URL.

## Verify

```bash
node scripts/test.mjs
node scripts/validate.mjs
node scripts/build.mjs _site
node scripts/style-snapshot.mjs before.json   # on origin/main
node scripts/style-snapshot.mjs after.json --compare before.json   # on the branch
```

- Diff the `_site` HTML against an origin/main build. Expect 0 differences except copied `js/` files.

## Out of scope

`data/`, the sheet, the scheduled tasks, list-row contract display (PR 5), CSS.

## Done when

Tests pass, validate has 0 errors, no visible change with current data, PR is open, and the session log is written. The PR body lists the exact new rules for the web-publish task (they are also in `docs/instructions/schedule-web-publish.md`).
