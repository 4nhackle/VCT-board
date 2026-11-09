# PR 22 — Search works on the roster tab

Base: `origin/main` @ `0ae65f9` (PR 19–21 merged). Branch from `origin/main`.
Merge order: PR 22 → PR 23. Both touch `js/views/roster.js` and `scripts/test.mjs`.

## Bug

Typing in the search box (`#q`) on the roster tab changes nothing.

Cause:
- `main.js:328` sets `state.q` and calls `renderView()`.
- The roster branch (`main.js:38–40`) calls `rosterHTML(tab.cards, state)`.
- `rosterHTML` (`js/views/roster.js:9`) only reads `state.region`. It never reads `state.q`.

## Fix — `js/views/roster.js`

- After the region filter, apply `state.q` (already trimmed by main.js). Compare lowercase, using substring match, as `matches` does in `model.js`.
- Team-level match: `tm.name`, `tm.short`, `tm.id`. If the team matches, keep the card with its full roster.
- Person-level match: `p.name`, `p.realName`, `p.role`. If the team does not match, keep the card with only the matching people. Drop the card if no person matches.
  - Build a filtered copy (`Object.assign({}, c, { roster: hits })`). Do not mutate `tab.cards`; it is built once.
  - Keep `inCount` / `outCount` / `partial` from the original card. They describe the team, not the search result.
- Region head counts (`count.teams`) use the filtered cards.
- Nothing left: show the existing `msg.empty`.
- Update the comment on `rosterHTML`. It now applies region and search.
- Empty `state.q` (or `undefined`, as in the current test that passes `{ region: "all" }`) means no search filter.

## Tests — `scripts/test.mjs` (next to the rosterHTML test, ~line 316)

- `q` matching a team name returns that team's full roster and no other team.
- `q` matching one player name returns only that team, with only that player's row.
- `q` matching nothing returns `msg.empty` text.
- `q` is case-insensitive.

## Check before PR

1. `node scripts/test.mjs`, `node scripts/validate.mjs`, `node scripts/build.mjs _site` all pass.
2. Locally, on the roster tab:
   - type a team name, then a player name
   - clear the box: the full list returns
   - combine with a region chip
   - the jump box only lists regions still shown
3. Write the session log and a PROGRESS.md section. Add a row to the `docs/instructions/README.md` index.
