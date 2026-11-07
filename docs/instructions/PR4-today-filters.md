# PR 4: "Today" tab + finer filters

Design reference: `docs/개선-설계-2026-11.md` sections 1.10 and 1.11. Follow `CLAUDE.md`.

Precondition: PR 1 is merged. The Today tab relies on the merged player/coach lists.

## Goal

1. New tab `today` (`#today`) lists news reported today (KST) across players, coaches and transfers.
2. Add four filters: position, confirmation stage, period, top tier only.

## Branch

`feature/today-filters` from latest `origin/main`. Do not merge. Open the PR and report.

## Changes

### Today tab

- `js/model.js` `buildTabs`: add the tab after `players`:
  `{ id: "today", label: t("tab.today"), mode: "entry", status: true, size, hint: t("hint.today"), groups: [{ items: TODAY_ITEMS }] }`.
- `TODAY_ITEMS`: merged `P` + `CO` items (after the PR 1 merge, one item per person) with `date === TODAY`.
- If there are no such items, use the items of the latest numeric `date`. Set `tab.fallbackDate` so the view can show "오늘 소식 없음 · 최근 M/D".
- `js/main.js` `renderView`: for `tab.id === "today"` always use `recentHTML` (ignore `state.order`). Hide the order chips on this tab.
- `TODAY` comes from `js/format.js`. Do not compute dates in the view.
- Do not change the default tab. `state.tab` stays `"players"`.
- Dictionary keys: `tab.today`, `hint.today`, `hint.todayFallback` (ko and en).
- Static build, sitemap and `p/`, `t/` pages must not change. The tab is a hash route.

### Filters

Add to `state` (`js/state.js`): `pos: "all"`, `stage: "all"`, `days: "all"`, `top: false`.
- Store them in the hash in the same way as `region`/`status`. Restore them from `history.state` like the existing fields in `main.js`.

Extend `matches(it, tab, state)` in `js/model.js`. Keep it pure.

| filter | values | rule |
|---|---|---|
| `pos` | all, Duelist, Initiator, Controller, Sentinel, Flex, IGL | the position part of `it.sub` contains the value (case-insensitive). Ignored on the coaches tab. |
| `stage` | all, confirmed, reported | `pillOf(it)[2] === value`. Items without a stage fail unless `all`. |
| `days` | all, 0, 3, 7 | `typeof it.date === "number" && TODAY - it.date <= n` |
| `top` | true/false | `tab.teamObj[it.tid]` or `tab.teamObj[it.tidTo]` has tier `partner` or `ascended` |

- UI: one extra chip row inside `#filters`, rendered in `renderChrome`, using existing `.chip` buttons with `aria-pressed`. Hide the position row on the coaches and watch tabs. Visual polish belongs to the design session. Use existing tokens only and add no new colors.
- Summary chip counts apply the new filters, like region and search.
- First check the real position values: `node -e` over `data/players.json`. If values like "Flex/IGL" exist, match on substring and mention it in the PR.

## Tests

- `matches` for each filter (true and false cases), with a fixed `TODAY` passed in. If `matches` reads the global `TODAY`, add an optional `today` argument.
- `buildTabs`: the today tab contains only today's items. The fallback picks the latest date and sets `fallbackDate`.

## Verify

```bash
node scripts/test.mjs
node scripts/validate.mjs
node scripts/css-check.mjs
node scripts/build.mjs _site
node scripts/dev-server.mjs 8080
```

- In the browser (KR and EN, widths 390 and 1280): open the Today tab; check each filter; reload with filters in the hash; leave a detail page and go back to restore state.

## Out of scope

Roster tab, team news, `data/`, the scheduled tasks.

## Done when

Tests pass, css-check is clean, PR is open, and the session log is written.
