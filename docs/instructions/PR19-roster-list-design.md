# PR 19 — Roster tab uses the list design system

Base: `origin/main` @ `66855fe`. Branch from `origin/main` (`git fetch && git switch -c feat/roster-list-design origin/main`). Do NOT branch from `chore/docs-reorg-and-instructions`; its `js/main.js` is older than main.
Line numbers below refer to `66855fe`.

Merge order: PR 19 → PR 20 → PR 21. All three touch `js/main.js` and `scripts/test.mjs`. Avoid merging within 30 minutes of the scheduled jobs (CLAUDE.md).

## Why

The roster tab (`js/views/roster.js`) renders detail-page blocks (`dp-sec`, `dp-people`, `dp-facts-inline`). Every other list tab uses the list vocabulary: `.rh` region heads, `.th` team heads, and `ul.list > li.row`. As a result, the roster tab looks like plain text. It also gets no sticky region heads and no jump box (`jumpList` only finds `.rh`).

## Goal

The roster tab renders with the same structure and classes as the players tab "by team" view (`js/views/regions.js`):

```
.rh   region head: <h2>short region</h2> <span class="en">full name if different</span> <span class="n">{n} teams</span>
.th   team head:   <a href=teamUrl>Team</a> <span class="n">+i / −o</span>
p.hint            "로스터 정보 일부" (only when card.partial)
ul.list > li.row.roster   one row per person: .main (name link + .meta role) and .state (kind label)
```

## Changes

### 1. `js/views/roster.js` — rewrite `rosterHTML(cards, state)`

- Keep the signature and the region filter (`state.region === "all" || c.team.region === state.region`). Keep the empty message `msg.empty`.
- Group by region the same way `regionsHTML` does: iterate `REGIONS.concat("기타")`. A card whose `team.region` is not in `REGIONS` goes to `"기타"`. `rosterCards` already sorts by region, then name. Keep that order inside each group.
- Region head: copy the `.rh` markup from `regionsHTML` (`js/views/regions.js:21`). Use `regionShort` / `regionName` / `t("region.other")`. The count is the number of team cards in the group. Use a new key `count.teams` (see i18n below).
- Team head: `<h3 class="th"><a href="teamUrl(id)">textHTML(name || id)</a><span class="n">t("roster.inout", …)</span></h3>`. This is the same as the `.th` in `regionsHTML:34`.
- Partial: `<p class="hint">t("roster.partial")</p>` under the team head when `c.partial`.
- People: `<ul class="list">` with one `<li class="row roster">` per `c.roster` entry:
  - `<div class="main"><a class="name" href="personUrl(p.id)">nameHTML(p.name || p.id)</a><span class="meta">esc(role)</span></div>`
    - `role = cleanName(p.role) || ""`. Show the meta span only when `role` is non-empty.
  - `<div class="state"><span class="lead">t(p.kind === "coach" ? "team.coaches" : "team.players")</span></div>`
  - Use `nameHTML` from `./common.js`, not `textHTML`. `textHTML` adds KR marks to Korean names on the EN page.
- Empty roster: replace the list with `<p class="hint">` + `t(tm.active === false ? "msg.teamClosed" : "msg.rosterPending")`.
- Do not add a fold button, pills or dates. The roster has no status data.
- Do not add the `.cols` header row. The roster grid has two columns, and `.cols` is built for five.

### 2. `js/main.js` — roster branch of `renderView` (around line 38)

- Prepend the tab hint, the same as other tabs: `var html = rosterHTML(tab.cards, state); if (tab.hint) html = '<p class="hint">' + tab.hint + "</p>" + html;`. Then assign `$("view").innerHTML = html`. Today the roster branch returns early and never shows `hint.roster`.
- `jumpList()` already runs after it. It now fills the jump box from the new `.rh` heads. This is intended.

### 3. `css/style.css`

Follow the `.row.sch` / `.row.watch` precedent (lines ~255–279). Use only existing tokens.

- Desktop, next to the `.row.sch` rules:
  - `.row.roster { grid-template-columns: minmax(0, 1fr) auto; padding-left: 0; align-items: baseline; }`
  - `.row.roster::before { display: none; }` (no status rail: roster rows have no status).
- Mobile (inside the media block near line 408, after the generic `.row` grid-areas rule):
  - `.row.roster { grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: "main state"; }`
  - Without this override, the generic mobile `.row` areas (`"main state" "move move" "when x"`) leave two empty grid rows with gaps.
- `.th + .list > .row:first-child` already removes the first border. Check that `.hint + .list` also looks right; if a double border shows, add `.hint + .list > .row:first-child { border-top: 0; }`.
- Remove nothing from the `dp-*` rules. Team detail pages still use them.

### 4. i18n — `js/i18n/ko.js` and `js/i18n/en.js`

- Add `"count.teams": "{n}팀"` (ko) and `"count.teams": "{n} teams"` (en).
- Keep `roster.partial`, `roster.inout` and `hint.roster` unchanged.

### 5. `scripts/test.mjs` — test at line 316

- Keep the existing asserts (`로스터 정보 일부`, `+0 / −0`, region filtering: `Mid` in, `Alpha` out).
- Add asserts: the output contains `class="rh"`, `class="th"` and `class="row roster"`, and does not contain `dp-sec`.
- Add one assert: a card with an unknown region renders under the `region.other` head ("기타").

## Out of scope

- Data (`data/*.json`) and `rosterCards` logic.
- Team detail page roster (`js/views/team.js`).
- Team logos (D4).

## Check before PR

1. `node scripts/test.mjs`, `node scripts/validate.mjs`, `node scripts/build.mjs _site` all pass.
2. Open the site locally (README dev server). On the roster tab, check:
   - sticky region heads
   - the jump box lists regions
   - region chips filter
   - layout at 375px width, in light and dark OS themes
   - the `/en/` page shows Korean names without KR marks
3. Write `docs/sessions/2026-11-xx-pr19-roster-list-design.md` and a PROGRESS.md section (CLAUDE.md rule 1). Add this file to the table in `docs/instructions/README.md`.
