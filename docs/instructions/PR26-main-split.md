# PR 26 — Split `js/main.js`: app state, chrome, rendering, wiring

Base: `origin/main` after PR 25 is merged. Branch from `origin/main`.
Merge order: PR 24 → PR 25 → PR 26.

## Goal

`js/main.js` (405 lines) does four jobs in one file: it loads data, holds app state, renders the page, and wires events. Its state lives in six mutable module variables (`D`, `TABS`, `IDX`, `VIEW`, `FROM_LIST`, `FX`). Split the file by job, and move the button-to-state logic into a pure, tested function. The page must look and behave the same.

## Rules

- No visible change. Same markup, same URLs, same history entries, same focus and scroll behavior.
- `index.html` keeps loading `js/main.js` (`index.html:78`). Do not touch `index.html`. The scheduled job commits its timestamp line.
- Move code; do not rewrite it. Keep every comment with its code.
- No import cycles. Direction: `main.js` → `render.js` → `chrome.js` → `state.js`.
- New DOM code stays in `js/` (not `js/views/`). Views return HTML strings and do not touch the DOM.

## Layout

### `js/state.js` — add app data (no DOM)

- Add `export var app = { D: {}, TABS: [], IDX: <same empty index as main.js:19>, view: "", fromList: false };`.
- Add `export function tabById(id)`, which reads `app.TABS`. Move it from `main.js:24`.
- Add a pure function `export function applyButton(state, data)`. Move the state-change branch of the click handler here (`main.js:234–240`). `data` is the button's `dataset`.
  - It changes `state` in place, the same way the handler does now.
  - It returns `null` when the button is not a tab, region, status, partner, or order button.
  - Otherwise it returns `{ tabChanged, filterChanged }`.
  - `data.top` (scroll to top) stays in the handler. It changes no state.
- In every moved function, replace `D`, `TABS`, `IDX`, `VIEW`, and `FROM_LIST` with `app.D`, `app.TABS`, `app.IDX`, `app.view`, and `app.fromList`.

### `js/chrome.js` — the page frame around the list

- Move these functions here: `$`, `statusLabels`, `DETAIL_HIDE`, `renderChrome`, `jumpList`, `FX`, `fieldBox`, `buildFilters`, `syncFilters`, `syncHash`, `langLinks`, `detailChrome`, `dock`.
- `FX` stays private to this file. Only `buildFilters` and `syncFilters` use it.
- Export what `render.js` and `main.js` call.

### `js/render.js` — what goes into `#view`

- Move these functions here: `renderView`, `showDetail`, `renderRoute`, `keepList`, `savedList`.

### `js/main.js` — start-up and events only

- Keep `isDetailLink`, `toggleRow`, the `click` and `change` listeners, and the `scroll`, `#jump`, `hashchange`, `popstate`, and `#q` listeners.
- Keep `localizeStatic`, the lede KST walker, `load`, and the `Promise.all` boot.
- The boot fills `app.D`, `app.TABS`, and `app.IDX` instead of the module variables.
- The click handler calls `applyButton(state, b.dataset)`. If the result is `null`, return. Otherwise run `renderChrome()` and `renderView()`, then `pushTab(); langLinks();` or `syncHash()`, exactly as now (`main.js:241–244`).
- Target size: about 150 lines.

## Tests — `scripts/test/state.test.mjs`, next to the `clickAction` tests

- `applyButton` with `{ tab: "coaches" }` sets `state.tab` and returns `tabChanged: true`.
- The same tab again returns `tabChanged: false`.
- `{ region: "EMEA" }` and `{ status: "open" }` set the field, and `filterChanged` is `false`.
- `{ partner: "1" }` flips `state.top`, `{ order: "1" }` switches between `recent` and `team`, and both return `filterChanged: true`.
- `{ top: "1" }` and `{}` return `null` and leave `state` unchanged.

## Check before PR

1. `node scripts/test.mjs`, `node scripts/validate.mjs`, `node scripts/build.mjs _site`, and `node scripts/css-check.mjs` pass.
2. Check for cycles: `grep -n "^import" js/main.js js/render.js js/chrome.js js/state.js`. Only the directions listed above are allowed.
3. `grep -nE "^(var|let) " js/main.js` returns nothing. All app state lives in `state.js`.
4. Run `node scripts/dev-server.mjs` and test by hand, in Korean (`/`) and in English (`/en/`):
   - Switch every tab. The tab count, summary chips, and title update. Back and Forward move between tabs.
   - Region chips, status chips, position and period selects, the partner toggle, and the recent-order toggle each change the list. The URL `?…` updates without a new history entry.
   - Search on the players tab and on the roster tab.
   - Open a person from the list, scroll the list first, then use "← 목록으로". The list, its filters, and the scroll position come back.
   - Open a team page from a fresh tab, then use "← 목록으로". It goes to the list URL.
   - Ctrl/⌘-click a person link. It opens a new browser tab.
   - Expand and collapse a row. Use the jump select and the back-to-top dock.
   - Suggest tab: type text, leave the tab, come back. The text is still there.
   - EN/KR links point to the same view in the other language.
   - The console shows no errors.
5. If Playwright is set up, `node scripts/style-snapshot.mjs` shows no difference.
6. Write the session log and a PROGRESS.md section. Add a row to the `docs/instructions/README.md` index.
