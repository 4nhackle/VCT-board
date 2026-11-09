# PR 20 — Position filter on the transfers tab

Base: `origin/main` after PR 19 is merged (written against `66855fe`). Branch from `origin/main`.
Merge order: PR 19 → PR 20 → PR 21.

## Reading of the request

"이적 완료 탭에도 포지션 정렬" means the same position select the players tab already has (`Duelist / Initiator / Controller / Sentinel / Flex / IGL`). It narrows the list. It is not a new sort order.

## Hidden blocker

Transfer items have no position. `toItem(r, "t")` sets `sub: ""` (`js/model.js:39`). `buildTabs.items()` skips `fillRow` for kind `"t"` (`model.js:97`). If you only enable the filter, every player transfer fails the match and the tab goes empty. The fix fills position from `people.json` `role`. `mergeMoves` already does this for transfer-only players (`model.js:64–66`).

## Changes

### 1. `js/model.js` — `buildTabs`

- After `var T1 = items(D.transfers.players, "t")`, fill `sub` for player transfers from the person record:
  `T1 = T1.map(function (it) { var pp = own(PEOPLE, it.pid) || {}; return Object.assign({}, it, { sub: [cleanName(pp.role), cleanName(pp.nationality)].filter(Boolean).join(", ") }); });`
  - Do this BEFORE `mergeMoves(P0, CO0, T1, T2, PEOPLE)`. `mergeMoves` checks `T1.indexOf(mv)` by identity, so it must receive the same mapped array that the transfers tab uses.
  - After this change, `mergeMoves` line ~66 re-derives the same `sub`. Leave it as is; it is harmless. Or drop that `Object.assign` and push `mv` directly. Either is fine; prefer the smaller diff.
- Leave `T2` (coach transfers) unchanged.
- Visible side effect (intended): player transfer rows now show a meta line (`Duelist · Korea`), the same as rows in the players tab.

### 2. `js/model.js` — `matches` (line ~491)

- Remove `&& tab.id !== "transfers"` from the position condition.
- Update the comment above `matches`: transfers now has position (taken from the person). Coaches and watch still have none.
- Result: with a position chosen, the coach group (T2) on the transfers tab empties and its `<h2 class="kind">` is skipped. The korea tab already behaves this way for coaches. This is intended.

### 3. `js/main.js` — `syncFilters`

- `use.pos`: add `tab.id === "transfers"` to the list (`players`, `today`, `korea`, `transfers`).
- Update the comment above `syncFilters`.

### 4. `scripts/test.mjs`

- Line 146: the transfers tab now filters. Change it to expect `false` for a non-matching position. Add a matching case that expects `true`.
- New test via `buildTabs`: one transfer row with `personId` whose people entry has `role: "Duelist"`.
  - Assert that the transfers tab item has `sub` starting with `Duelist`.
  - Assert `matches(item, transfersTab, {…, pos: "Duelist"})` is true and `pos: "Sentinel"` is false.
  - Assert that the players tab still shows that person once (mergeMoves identity unchanged).
- Transfer rows without a people entry get `sub: ""`. Under a position filter they drop out. Assert this behaviour so it is explicit.

## Out of scope

- Coach transfers by role.
- Data changes (no `position` column added to the transfers sheet).

## Check before PR

1. `node scripts/test.mjs`, `node scripts/validate.mjs`, `node scripts/build.mjs _site` all pass.
2. Locally, on `#transfers?pos=Duelist`: player transfers narrow, the coach group disappears, and the select shows "Duelist". Switching to the players tab keeps the value. The region and VCT partner filters still combine.
3. Write the session log, add a PROGRESS.md section, and add a row to the README index.
