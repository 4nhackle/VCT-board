# PR 30 — Team search finds players who moved to the team

## Problem

Typing a team in the search box (`#q`) on list tabs (players, today, coaches, korea, transfers) only finds people whose **old** team matches. Players who transferred **into** the team are missing.

Reproduced on `main` e8ce115 with real data, players tab:

| query    | result |
|----------|--------|
| `c9`     | Jackk, OXY, v1c, Zellsis (all left or leaving Cloud9) |
| `cloud9` | the four above **plus** GLYPH, nightz, alym, Derrek (moved to Cloud9) |

## Root cause

`matches()` in `js/model/tabs.js` searches a text haystack:

```js
var hay = [it.name, it.team, it.sub, it.status, it.next, it.note, it.region, regionName(it.region)].join(" ").toLowerCase();
```

- `it.team` is the row's old team name. `it.next` is the destination's **display name** only ("Cloud9").
- Team short names and aliases (`teams.json` `short`, `aliases`) are never searched.
- `c9` matched the old players only by accident: their `note` text says "C9".

So a team is matched by free text, not by team identity. The item already carries team IDs (`it.tid`, and `it.tidTo` when `it.moved`), and the tab already has the team table (`tab.teamObj`, set in `buildTabs`).

## Change

### 1. `js/model/tabs.js` — `matches()`

Add the names of the item's teams to the haystack, looked up by ID: name, `short`, every `aliases` entry, and the ID itself. Use `it.tid` always, and `it.tidTo` only when `it.moved` (same rule as `krTeam` in `buildTabs`).

Sketch (keep the surrounding style, `var` and `function`):

```js
function teamWords(tab, it) {
  return [it.tid, it.moved ? it.tidTo : ""].map(function (id) {
    var tm = id && tab.teamObj ? tab.teamObj[id] : null;
    return tm ? [tm.id, tm.name, tm.short].concat(tm.aliases || []).join(" ") : "";
  }).join(" ");
}
```

and in `matches()`:

```js
var hay = [it.name, it.team, it.sub, it.status, it.next, it.note, it.region, regionName(it.region), teamWords(tab, it)].join(" ").toLowerCase();
```

- Do not drop the old team. Searching a team must still list people who left it (the transfers tab shows both sides; keep that for every tab).
- `tab.teamObj` exists only for `mode === "entry"` tabs. The watch tab has none; the helper must return "" there (the sketch does).
- Do not build a new index. `TEAM_OBJ` is already built once per `buildTabs`.

### 2. `js/views/roster.js` — `searchCard()`

It checks `tm.name`, `tm.short`, `tm.id` but not `tm.aliases`. Add `aliases` so both search paths use the same team words. Smallest form: `[tm.name, tm.short, tm.id].concat(tm.aliases || []).some(has)`.

Do not change roster membership. Roster already follows transfers (PR 23, `teamMoves`).

### 3. Data gap (not code — tell the user)

`cloud9` in `data/teams.json` has no `short` and no `aliases`. After the code change `cloud9` works, but `c9` still finds only the old players (via note text). 39 partner/ascended/challengers teams have no `short`.

- Do **not** edit `data/teams.json` by hand. The scheduled job owns `data/` (CLAUDE.md).
- In the report, ask the user to add `short` (e.g. `C9`) on the Google Sheet teams tab, or to add it to the scheduled-job instructions. List the teams that lack `short`.

## Tests (`scripts/test/`, same file that holds the existing `matches` tests)

Add small fixtures with a `teamObj`:

1. A merged item `{ tid: "envy", tidTo: "cloud9", moved: true, team: "ENVY", next: "Cloud9" }` matches `q: "c9"` when `cloud9` has `short: "C9"`.
2. Same item matches an alias (`aliases: ["Cloud 9"]`, `q: "cloud 9"`).
3. An item that left (`tid: "cloud9"`, `moved: true`, `tidTo: "sentinels"`) still matches `q: "c9"`.
4. An item with `tidTo: "cloud9"` but `moved` false does not match by `tidTo` (only its own text).
5. Watch tab (no `teamObj`) still filters as before.
6. `rosterHTML` / `searchCard`: a team matched by an alias returns the whole card.

## Checks to run and report

- `node scripts/test.mjs` — all pass, count goes up by the new tests.
- `node scripts/validate.mjs` — errors 0, warnings same as `main`.
- `node scripts/build.mjs _site` — builds.
- Browser, real data, players tab: `cloud9` lists GLYPH, nightz, alym, Derrek and the old Cloud9 players. `sentinels` lists OXY and Zellsis. A team with `short` (e.g. `FNC`) lists people who moved to Fnatic.
- Session note in `docs/sessions/`, summary in `docs/PROGRESS.md`, report in Korean.

## Out of scope

- Matching team names in other languages, fuzzy matching, ranking.
- Changing `teams.json` or the sheet.
- Merging timing: avoid 30 minutes around scheduled runs (CLAUDE.md).
