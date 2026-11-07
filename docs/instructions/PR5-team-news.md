# PR 5: Team news section + contract hint on list rows

Design reference: `docs/개선-설계-2026-11.md` sections 1.3 (display part) and 1.8. Follow `CLAUDE.md`.

Precondition: PR 2 is merged (year-only `contractUntil`). Contract data can still be sparse. Everything here must render nothing extra when the data is empty.

## Goal

1. The team detail page gets a "팀 소식" (Team news) block: team-level watch events plus roster contract expiries.
2. List rows show the contract end in the meta line when known.

## Branch

`feature/team-news` from latest `origin/main`. Do not merge. Open the PR and report.

## Changes

### `teamNews(id, IDX, today)` in `js/model.js` (pure, exported)

Return `{ events, expiring }`:
- `events`: watch entries in `IDX.byTeam[id]` whose `watchMeta(item.note).kind` is `withdraw`, `dropped`, `expiring` or `joining`. Sort newest first by `newestFirst`. Watch rows have no date, so keep the input order.
- `expiring`: people in `teamMoves(id, IDX, today).roster` whose `contractUntil`:
  - is a number with `until - today <= 90` (this includes expired values), or
  - is a year string equal to the current KST year or earlier.
  
  Each entry is `{ person, state: contractState(until, today) }`. Sort with the soonest first; year strings go after dated ones.

### `js/views/team.js`

- Render the block above the existing news list only when `events.length + expiring.length > 0`.
- Reuse `rowHTML` for events (watch mode). Show expiring people as simple links to `p/<id>/` with the contract label.
- Dictionary keys: `team.news`, `team.expiring` (ko and en).

### List-row contract hint (`js/components/row.js`)

- Find the until value: the row's `contractUntil`, or else `IDX.people[pid].contractUntil`. To avoid passing IDX, attach `contract` to items in `buildTabs` through the existing `fillRow` path.
- If an until value exists, append `t("row.contract", { x })` to `meta`. Use the year (`2027`) or the ISO date. Example: "계약 ~2027".
- If no row has contract data, the HTML stays identical.

## Tests

- `teamNews` with fixtures: a withdraw watch row; a roster person expiring in 30 days (included); one in 200 days (excluded); a year string for this year (included); an empty team (both arrays empty).
- `rowHTML` with and without a contract.

## Verify

```bash
node scripts/test.mjs
node scripts/validate.mjs
node scripts/build.mjs _site
node scripts/dev-server.mjs 8080
```

- Use the fixture site (`node scripts/fixture-site.mjs`, see the PROGRESS.md section "샘플 사이트로 시험하는 법") to see a filled team news block. On real data, check `t/furia/` shows the withdraw event.

## Out of scope

Roster tab, filters, `data/`, CSS beyond reusing existing classes.

## Done when

Tests pass, PR is open, and the session log is written.
