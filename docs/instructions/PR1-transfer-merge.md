# PR 1: Merge confirmed transfers into the player/coach tabs + unify the Korea tab

Design reference: `docs/개선-설계-2026-11.md` sections 1.6 and 1.7. Follow `CLAUDE.md` (session log, one purpose per session).

## Goal

1. Transfers that exist in `data/transfers.json` must show up correctly in the Players / Coaches tabs.
2. The Korea tab uses one rule for players and coaches: Korean nationality OR a Korean team.

## Context (verified on origin/main `1ea55e8`)

- 9 people have a transfer row but no LFT row, so they are missing from the Players/Coaches tabs (GLYPH, KEN, Sacy, cortezia, canezerra, batujnax, hezacoil, Hype, Fayde).
- 1 LFT row still says "합류 보도" although its transfer has `signedDate` (d4v41).
- Root cause: the LFT row status and the transfer row are maintained separately in the sheet.
- Korea tab (`js/model.js` buildTabs): players match `/South Korea/` in `it.sub`; coaches match the hard-coded `KR_TEAMS` regex. Korean coaches on foreign teams (argency, cheonggak, kdg, termi, hype) are missing.

## Branch

`fix/transfer-merge` from latest `origin/main`. Do not merge the PR. Open it and report.

## Changes

All logic stays in `js/model.js` `buildTabs` (pure function). Do not change `pillOf` or `routeOf`; they already handle `moved` items.

1. Build `latestMove`: person id → latest transfer item from `T1` and `T2`. Order by `date` desc. On the same date, prefer an item with numeric `signed`.
2. For each LFT item (`P`, `CO`) whose `pid` has a latest move with `move.date >= item.date`:
   - Return a copy with `moved: true`, and copy `next`, `signed`, `status`, `date`, `conf`, `src`, `tidTo` from the move.
   - Keep `team`, `tid`, `name`, `sub`, `note`, `region`, `pid` from the LFT item.
   - If the LFT date is later than the move date, leave the item unchanged (e.g. released again after the move).
3. For each transfer person with no LFT item, append the transfer item. Player-section transfers go to `P`. Coach-section transfers go to `CO`.
4. Korea tab:
   - Delete `KR_TEAMS`.
   - Include an item if the person's nationality is South Korea (row value; for coaches use `PEOPLE[pid].nationality`) OR `TEAM_OBJ[it.tid]` (for moved items also `TEAM_OBJ[it.tidTo]`) has `country === "South Korea"`.
   - Apply the filter to the merged `P` and `CO`.
5. Update `hint.korea` in `js/i18n/ko.js` and `js/i18n/en.js` to describe the new rule. Run `node scripts/i18n-report.mjs` and keep it clean.

Tab sizes and the summary chips use the merged lists automatically. Do not touch the transfers tab.

## Tests (`scripts/test.mjs`, existing `t(name, fn)` style, fixed date `T`)

Add `buildTabs` tests with a small inline `D` object:
- (a) A person with only a transfer row appears in the players tab with pill `signed`.
- (b) An LFT row "계약 완료(X) · 합류 보도" plus a transfer with `signedDate` produces stage `confirmed`.
- (c) An LFT row dated after the transfer is not overridden.
- (d) A transfer with type containing "잔류" gives the stayed pill.
- (e) Korea tab: a Korean coach on a non-Korean team is included; a non-Korean player on a team with `country: "South Korea"` is included; a coach row without nationality is included through `people`.

## Verify (run, then paste results into the session log)

```bash
node scripts/test.mjs
node scripts/validate.mjs
node scripts/build.mjs _site
node scripts/dev-server.mjs 8080
```

- In the browser at `http://localhost:8080/VCT-board/`, check the Players tab shows GLYPH and that d4v41 shows a confirmed pill. Check the Korea tab count before and after, in KR and EN.
- Report the number of items added and overridden per tab against current `data/`.

## Out of scope

`data/`, CSS, new tabs, filters, the sheet and the scheduled tasks.

## Done when

Tests pass, validate has 0 errors, build succeeds, PR is open, and `docs/sessions/<date>-pr1-transfer-merge.md` is written. Avoid merging within 30 minutes of the scheduled runs (see CLAUDE.md).
