# PR 31 — Search matches only names and teams

## Problem

The search box (`#q`, placeholder "이름이나 팀 검색") also matches position, status, note and region text. Example: `sen` is meant to find Sentinels, but it also finds every Sentinel-role player and every row whose note says "Sentinels".

Base: PR 30 (`teamWords` in `matches()`). PR 30 is on `feat/search-current-team` c82dd1e, pushed, not merged yet. Start from `main` after PR 30 is merged; if it is not merged, branch from `feat/search-current-team` and say so in the report.

Measured on c82dd1e with real data. "Extra" = matched, but not by person name or team:

| query | tab       | hits | extra |
|-------|-----------|------|-------|
| `sen` | players   | 21   | 10 (alvinboy, Spear, crashies, nAts, Meteor, …) |
| `sen` | transfers | 13   | 4 |
| `pac` | players   | 49   | 49 (all from region "Pacific") |
| `pac` | coaches   | 19   | 19 |
| `kor` | players   | 23   | 23 (from nationality "South Korea" in `sub`) |

Both search paths have the issue:

- `js/model/tabs.js` `matches()`: `hay = [it.name, it.team, it.sub, it.status, it.next, it.note, it.region, regionName(it.region), teamWords(tab, it)]`.
  `sub` holds position and nationality (or the coach role), `status`/`note` are free text, and `region`/`regionName` add "Americas", "Pacific", and so on.
- `js/views/roster.js` `searchCard()`: matches people by `p.role` as well as `p.name`/`p.realName`.

## Rule

Search matches **person names and team names only**:

- person: `it.name` (list tabs); `p.name`, `p.realName` (roster tab);
- team: `it.team` (row team / old team / watch team text), `it.next` (destination display name), `teamWords(tab, it)` (ID, name, `short`, `aliases` from PR 30).

Do not match position, nationality, role, status, note, caption or region. These already have their own controls (position filter, status chips, region chips, Korea tab).

Matching stays substring matching, now case- and accent-insensitive: the query and the haystack both go through `fold()` (in `js/model/ids.js`, added by the PR 30 accent follow-up). `fold()` lowercases, strips combining marks and recomposes with NFC, so Hangul syllables stay whole (`가` must not match `각`). Do not add prefix, word-boundary or fuzzy matching: `sen` must still find "Sentinels" and a player named "Asen". `Sénèque` is found by `seneque`, and `SÉNÈQUE` by `sen`.

## Change

### 1. `js/model/tabs.js` — `matches()`

```js
var hay = fold([it.name, it.team, it.next, teamWords(tab, it)].join(" "));
if (hay.indexOf(fold(state.q)) < 0) return false;
```

Update the comment above `matches()` to say search is name and team only. `regionName` is used only in this line (checked), so remove the import from `js/model/tabs.js`.

### 2. `js/views/roster.js` — `searchCard()`

Drop `has(p.role)`:

```js
var hits = c.roster.filter(function (p) { return has(p.name) || has(p.realName); });
```

Update the comment above `searchCard()` (it says "이름·실명·역할"; make it "이름·실명"). The `has` helper uses `fold()` (already in place from PR 30 follow-up); the query in `rosterHTML()` is folded too.

### 3. Do not touch

- `teamWords`, team-ID rules from PR 30, roster membership, filters, i18n strings (the placeholder already says "이름이나 팀").
- `data/` (owned by the scheduled job).

## Tests

Grep `scripts/test/` for `matches(` and `rosterHTML(` with `q:`. Existing tests use names and teams only and must keep passing; fix any that relied on other fields and say which in the session note.

Add to `scripts/test/model.test.mjs` (next to the PR 30 `matches` tests):

1. `{ name: "Spear", team: "Gen.G", sub: "Sentinel, South Korea", status: "구직 중", note: "Sentinels 관심", region: "Pacific" }` does **not** match `sen`, `kor`, `pac`, `구직`.
2. The same item matches `spear` and `gen.g`.
3. With `teamObj` `{ sentinels: { id: "sentinels", name: "Sentinels", short: "SEN" } }`, an item `{ name: "x", tid: "sentinels", team: "Sentinels" }` matches `sen`.
4. A transfer item `{ name: "y", team: "Cloud9", next: "Sentinels", moved: true }` matches `sentinels` (destination display name).

Add to `scripts/test/views.test.mjs` (next to the roster search tests):

5. `rosterHTML(SR, { region: "all", q: "sentinel" })` does not list Yolo (role Sentinel) unless a team name matches.
6. `q: "kim min"` still finds Zed by real name (already covered; keep it).
7. Accent: `{ name: "Jóhn", team: "Gen.G" }` matches `john` and `JÓHN`; `{ name: "각" }` does not match `가` (already in place from PR 30 follow-up; keep passing).

## Checks to run and report

- `node scripts/test.mjs` — all pass; report the count before and after.
- `node scripts/validate.mjs` — errors 0, warnings same as the base.
- `node scripts/build.mjs _site` — builds.
- Real data, players tab: `sen` lists only people whose name or team (old, new, short, alias) contains "sen". `pac` and `kor` return only name/team hits (likely few or none).
- Session note `docs/sessions/2026-11-10-pr31-search-name-team-only.md`, summary in `docs/PROGRESS.md`, report in Korean.

## Out of scope

- Searching person aliases or real names on list tabs (list items do not carry them; roster tab already does real names).
- Highlighting matches, ranking.
- Merge timing: avoid 30 minutes around scheduled runs (CLAUDE.md).
