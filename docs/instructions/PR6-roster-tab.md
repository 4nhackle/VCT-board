# PR 6: Roster tab

Design reference: `docs/개선-설계-2026-11.md` section 1.9. Follow `CLAUDE.md`.

Preconditions:
- PR 1 is merged.
- The one-off roster backfill (`docs/instructions/roster-backfill-once.md`) has finished, and a web-publish run has exported it.
- `tier` in teams.json is the 2027 season: 32 partners + 2 China guests stored as `ascended` = 34 top-tier teams.

Before starting, run the coverage check below. If more than half of the 34 top-tier teams (17 or more) have fewer than 5 roster people, stop. Report the numbers to the user and ask whether to continue. On 2026-11-08 the result was 0 of 41 (old 2026 tiers).

```bash
node -e 'import("./js/model.js").then(m=>{const r=f=>JSON.parse(require("fs").readFileSync("data/"+f));const D={players:r("players.json"),coaches:r("coaches.json"),transfers:r("transfers.json"),watch:r("watch.json"),people:r("people.json"),teams:r("teams.json"),sources:r("sources.json")};const I=m.buildIndex(D);const top=D.teams.filter(t=>t.tier==="partner"||t.tier==="ascended");top.forEach(t=>console.log(t.id,m.teamMoves(t.id,I).roster.length))})'
```

## Goal

A tab `roster` (`#roster`) shows, for every partner/ascended team, the current roster and this off-season's in/out counts.

## Branch

`feature/roster-tab` from latest `origin/main`. Do not merge. Open the PR and report.

## Changes

- `js/model.js`:
  - Export `rosterCards(IDX, today)`. It returns `[{ team, roster, inCount, outCount, partial }]` for teams with tier `partner` or `ascended`. It reuses `teamMoves(id, IDX, today)`. Set `partial = roster.length < 5`. Sort by `REGIONS` order, then team name.
  - In `buildTabs`, add `{ id: "roster", label: t("tab.roster"), mode: "roster", size: <team count>, hint: t("hint.roster") }` before `watch`. `buildTabs` has no IDX, so `main.js` passes the cards in. Alternatively, build the cards in `main.js` after `buildIndex`; choose the smaller change.
- New `js/views/roster.js` with `rosterHTML(cards, state)`:
  - Region filter applies; status filter and order chips are hidden.
  - One card per team: team link `t/<id>/`, players first and then coaches. Use person links `p/<id>/` with role. Show "+N / −N" counts.
  - Show a "로스터 정보 일부" note when `partial`.
- `js/main.js`: one `tab.mode === "roster"` branch in `renderView`. In `renderChrome`, hide `#summary` and the order chips for this mode.
- Dictionary keys: `tab.roster`, `hint.roster`, `roster.partial`, `roster.inout` (ko and en).
- CSS: reuse existing card/list classes. If a new rule is unavoidable, use existing tokens only and pass `node scripts/css-check.mjs`. Layout polish belongs to the design session.

## Tests

- `rosterCards` with fixtures: top-tier filter, region order, the `partial` flag, a closed team (`active:false`) with an empty roster, coach-after-player order.

## Verify

```bash
node scripts/test.mjs
node scripts/validate.mjs
node scripts/css-check.mjs
node scripts/build.mjs _site
node scripts/dev-server.mjs 8080
```

- In the browser (KR and EN, widths 390 and 1280): open the roster tab, use the region filter, follow links to team and person pages, and use back navigation.

## Out of scope

`data/`, filters from PR 4, the static build of roster pages.

## Done when

Tests pass, PR is open, coverage numbers are in the PR body, and the session log is written.
