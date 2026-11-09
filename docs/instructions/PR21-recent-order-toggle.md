# PR 21 — Bring back "최근 소식순" (latest news order)

Base: `origin/main` after PR 20 is merged (written against `66855fe`). Branch from `origin/main`.
Merge order: PR 19 → PR 20 → PR 21.

## Context

PR 16 (`e50c736`) removed the order chips, `state.order` and `vct-order`. The user now wants a latest-news order back on four tabs: players, coaches, korea and transfers. This reverses design decision 4.1 in `docs/툴바-정리-설계-2026-11.md`. Add a line there saying PR 21 restores the order as a toggle.

Old code for reference: `git show 966623f:js/main.js` (`renderOrder`, `saveOrder` in `js/state.js`, keys `order.*`).

## Decisions

- Form: one toggle chip, "최근 소식순" / "Latest news", in the `#fx` toolbar after the VCT partner chip. Same pattern as `FX.partner` (`chip toggle`, `aria-pressed`). Off = by team (default). On = by date, newest first (`recentHTML`).
- Tabs: on for `players`, `coaches`, `korea` and `transfers`. On other tabs the chip gets `is-off` and `disabled` (the space stays, as for the other filters). `today` stays always by date, with no chip.
- Persistence: URL hash key `sort=recent`, handled by `filtersOf` / `queryOf`, like `pos`, `days` and `vct`. It survives reload and shared links. Back from a detail page keeps it, because the hash keeps it.
- Old `localStorage` `vct-order` stays ignored. Do not read or delete it (same as PR 16).
- Not restored: the "새 N" badge and `hint.recent`. The user did not ask for them; the "3일 이내" period filter covers new items.

## Changes

### 1. `js/state.js`

- `state`: add `order: "team"`.
- `filtersOf`: add `order: q.get("sort") === "recent" ? "recent" : "team"` to the returned object, including the default object.
- `queryOf`: `if (s.order === "recent") p.push("sort=recent");`. Push it after `vct`.
- `listAction` needs no change. It compares all keys of `filtersOf`, so a hash change of `sort` triggers `"refilter"`.
- Update the file's comments (the line that lists the URL keys).

### 2. `js/main.js`

- `buildFilters`: create `FX.order` like `FX.partner`. Use `type="button"`, `className="chip toggle"`, `dataset.order = "1"` and `textContent = t("order.recent")`. Append it after `FX.partner`.
- `syncFilters(tab)`:
  - `var orderUse = tab.mode === "entry" && tab.id !== "today";`
  - `FX.order.disabled = !orderUse;`
  - `FX.order.classList.toggle("is-off", !orderUse);`
  - `FX.order.setAttribute("aria-pressed", String(state.order === "recent"));`
- Click handler: next to the `dataset.partner` branch, add `else if (b.dataset.order) { state.order = state.order === "recent" ? "team" : "recent"; filterChanged = true; }`.
- `renderView`: `recent = tab.mode === "entry" && (tab.id === "today" || state.order === "recent");`. Update the comment.
- `renderView` groups: korea and transfers have two groups (players / coaches). `recentHTML` runs per group, so each group is ordered by date under its `<h2 class="kind">`. Keep this. Do not merge the groups.

### 3. `js/views/recent.js`

- No logic change. Check one thing: rows in `recentHTML` get `opt.region` (region shown in meta) when `state.region === "all"`. That is correct for these tabs too.

### 4. i18n — `js/i18n/ko.js` and `js/i18n/en.js`

- Re-add only `"order.recent": "최근 소식순"` (ko) and `"order.recent": "Latest news"` (en).
- Do not re-add `order.team`, `order.freshTitle`, `order.freshCount` or `hint.recent`.

### 5. `scripts/test.mjs`

- The `filtersOf` tests at lines 195–205 use exact `deepEqual`. Add `order: "team"` to every expected object.
- New asserts:
  - `filtersOf({hash: "#players?sort=recent"}).order === "recent"`
  - `sort=junk` gives `"team"`
  - `queryOf({pos: "all", days: "all", top: false, order: "recent"}) === "?sort=recent"`
  - `queryOf` with `order: "team"` adds nothing
  - `listAction("list", "players", "players", true, {...cur, order: "team"}, {...cur, order: "recent"}) === "refilter"`
- If a test exercises `clickAction` with toolbar buttons, add one with `data-order`.

## Out of scope

- The today tab's behaviour.
- Ordering inside the roster, watch or schedule tabs.

## Check before PR

1. `node scripts/test.mjs`, `node scripts/validate.mjs`, `node scripts/build.mjs _site` all pass.
2. Locally:
   - On players, coaches, korea and transfers, the chip toggles date order and the URL gains/loses `?sort=recent`.
   - Reload keeps it.
   - Opening a person and pressing "← 목록으로" keeps it.
   - On today, roster, watch and schedule, the chip is hidden and its space is kept.
   - It works together with `pos`, `days` and `vct`.
   - Check the 375px layout: the `#fx` row now has 4 controls. It must wrap or scroll like the other chip rows, with no horizontal page scroll.
3. Update `docs/툴바-정리-설계-2026-11.md` (decision reversed). Write the session log, add a PROGRESS.md section, and add a row to the README index.
