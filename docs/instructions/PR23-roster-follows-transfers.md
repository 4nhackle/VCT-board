# PR 23 — Roster follows transfer news

Base: `origin/main` after PR 22 (written against `0ae65f9`). Branch from `origin/main`.
Merge order: PR 22 → PR 23.

## Bug

The roster tab (and the team page roster) ignores transfer arrivals. Measured on `0ae65f9` data:
- 53 of 85 transfer rows with a `toTeam` have a destination that is not in the person's current `people.json` career.
- Those people never appear on the new team's roster.
- Examples:
  - keiko nrg → sentinels: in no roster at all.
  - eeiu furia → nrg: still only under furia's current career.
  - artzin / basic furia → loud.
  - TenZ sentinels → t1.

Cause: `teamMoves` (`js/model.js:244`) builds `roster` only from `careerOf(p).current && c.team === id`.
- Transfers only remove people, via `gone()`.
- They never add people.
- `people.json` career is not updated when a transfer is reported. The scheduled job fills transfers first.

## Rule (new)

A person's current team on the roster is decided as follows:

1. If the person has at least one transfer row (`IDX.byPerson[pid]` entries with `kind === "t"`), their latest transfer decides it. The current team is `tidTo`. Pick the latest with the same rule as `mergeMoves`: highest `date`; on the same date, the row with a numeric `signed` wins.
   - Empty `tidTo` (left, no destination) means no team.
   - `잔류` rows have `tidTo` equal to the old team, so the person stays.
2. Otherwise, use the career rule as today (`careerOf(...).current`).
3. In both cases, `gone(pid)` still removes them (a later 방출·결별·이탈 row at that team). `closed` teams stay empty.

Add this comment at the rule: `// shortcut: latest transfer beats people.json career; if career gets a newer move that is missing from transfers, career should win — compare dates then.`

## Changes

### 1. `js/model.js`

- New helper, near `arrivalsOf`:
  `function latestMove(pid, IDX)` returns the winning `{kind:"t", item}` entry or `null`. Use `dayOf` for dates.
  - Optional: if `mergeMoves` can reuse it without changing its inputs, do so. Otherwise leave `mergeMoves` untouched. Do not refactor it in this PR.
- `teamMoves(id, IDX, today)`:
  - Candidates: all `IDX.people` (as now).
  - Keep `p` when `onTeam(p) && !gone(p.id)`, where `onTeam(p)` is:
    - `mv = latestMove(p.id, IDX)`
    - if `mv`, then `mv.item.tidTo === id`
    - otherwise the existing career check.
  - Sorting is unchanged (players first, then name).
  - Reported (unsigned) transfers count the same as confirmed ones (user decision, 2026-11-09).
- `rosterCards`: no change. `partial` (`roster.length < 5`) now counts arrivals. This is intended.

### 2. Views — no change

- Do NOT add any "보도" (reported) tag or pill on roster rows, either on the roster tab (`js/views/roster.js`) or on the team page (`js/views/team.js`). User decision: arrivals look like any other roster row.
- The team page uses `m.roster` from `teamMoves`, so it gets the fix for free.

### 3. `scripts/test.mjs`

Add `teamMoves` tests with a small fixture (see the existing tests at ~line 773 for the pattern):
- A person with career only at `a`, and a confirmed transfer `a → b` (with `signedDate`). In `b`'s roster, not in `a`'s.
- The same with no `signedDate` (reported only): also in `b`'s roster, not in `a`'s.
- Two transfers `a → b` (older) and `b → c` (newer): only in `c`.
- Same date, one with `signedDate`: the signed row wins.
- A transfer with empty `toTeam`: in no roster.
- A person with no transfer rows: the career rule is unchanged (existing tests at ~773 still pass).
- `rosterHTML` output has no `pill` / `reported` markup on roster rows.

## Out of scope

- Updating `people.json` career (data is owned by the scheduled job, CLAUDE.md).
- The in/out counts (`incoming` / `outgoing`). They already read transfers.

## Check before PR

1. `node scripts/test.mjs`, `node scripts/validate.mjs`, `node scripts/build.mjs _site` all pass.
2. Spot-check with real data on the local site:
   - sentinels has keiko
   - nrg has eeiu and furia does not
   - loud has artzin, basic and cortezia
   - t1 has TenZ, crashies and Sungmin
   - No "보도" mark appears on any roster row.
   - Team pages for the same teams match the roster tab.
3. Write the session log and a PROGRESS.md section. Add a row to the `docs/instructions/README.md` index.
