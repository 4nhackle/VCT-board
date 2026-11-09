# PR 28 — Recompute "today" on each render

Base: `origin/main` after PR 26 is merged. Independent of PR 27.
Source: audit of 2026-11-09, "Should fix" item 4.

## Goal

`js/format.js:29` sets `TODAY` (the KST date as a sheet serial number) once, when the module loads. A browser tab left open past midnight KST keeps the old date:
- the 오늘 tab shows yesterday's list,
- the 3-day and 7-day filters are off by one,
- the "NEW" mark (`isNew`), schedule D-n and past marks, ages, and contract states use the old date.

Fix it with the smallest change: keep `TODAY` as the one shared value, and refresh it before each draw.

## Why this shape

`TODAY` is read in about 15 places, mostly as the default `today == null ? TODAY : today`. ES module exports are live bindings: when `format.js` reassigns `TODAY`, every importer sees the new value on its next read. So one setter function fixes all readers. Do not rename `TODAY` or thread a date argument through the views.

## Changes

### `js/format.js`

Replace line 29 with:

```js
// 오늘(한국 시간)을 시트와 같은 날짜 일련번호로. 자정을 넘겨 열어 둔 탭도 맞도록 그릴 때마다 refreshToday() 로 다시 계산한다.
export var TODAY;
export function refreshToday(now = Date.now()) { return (TODAY = Math.floor((now + 9 * 36e5) / 864e5) + 25569); }
refreshToday();
```

Keep the existing comment's second sentence ("최근 사흘 … 새 소식으로 본다") on the `isNew` line.

### Call sites — browser only

Call `refreshToday()` as the first line of:
- `renderChrome()` in `js/chrome.js` (the summary counts use the date),
- `renderView()` in `js/render.js`,
- `showDetail()` in `js/render.js` (person and team pages use it for ages and contracts).

It is one subtraction; calling it more than once per draw is fine.

Do not call it in `scripts/build.mjs`. The build is one run; its `TODAY` from load time is correct.

## Tests — `scripts/test/format.test.mjs`

One test:
- `refreshToday(Date.UTC(2026, 10, 9, 14, 59))` (23:59 KST on 11/9) and `refreshToday(Date.UTC(2026, 10, 9, 15, 0))` (00:00 KST on 11/10) differ by exactly 1.
- After the second call, the imported `TODAY` equals the returned value (proves the live binding).
- Call `refreshToday()` with no argument at the end of the test, so later tests see the real date.

## Check before PR

1. `node scripts/test.mjs`, `node scripts/validate.mjs`, `node scripts/build.mjs _site` pass.
2. `grep -rn "TODAY =" js scripts` shows only the line inside `refreshToday`.
3. In `node scripts/dev-server.mjs`: open the 오늘 tab, then in the console run `(await import("/js/format.js")).refreshToday(Date.now() + 864e5)` and switch tabs and back. The 오늘 list is now empty or shows the next day. Reload to reset. No console errors.
4. Write the session log and a PROGRESS.md section. Mark the PR 28 row in `docs/instructions/README.md` as done.
