# Scheduled task prompt additions: sheet update

Applies to both sheet tasks:
- "VCT LFT 시트 일일 갱신" (daily 08:50 KST)
- "VCT LFT 시트 추가 갱신 (11/2~11/16)" (14:50, 20:50 KST)

Design reference: `docs/개선-설계-2026-11.md`. The user pastes these blocks into the task prompts. The tasks do not run on this PC.

## Rollout order

| step | what | when |
|---|---|---|
| 1 | Paste sections A (Sources), B (Transfer sync), C (Birth dates) | now; no site change needed |
| 2 | Add sheet columns "요약" and (if missing) "계약 만료" at the far right of each tab listed in section D | after PR 2 is merged |
| 3 | Update the web-publish task (`schedule-web-publish.md`) | same day as step 2, before the next 09:35 run |
| 4 | Paste sections D (Caption) and E (Contracts) | after step 3 |
| 5 | Paste section F (Rosters) and run the one-time backfill | any time; PR 6 waits for it |

Never insert a column in the middle of a tab. The "요약" tab's COUNTIF formulas reference fixed columns.

Section scope:
- Daily 08:50 run: all sections.
- Extra runs (11/2–11/16): only A, B, D, E, and only for people who appear in this run's new news. Skip C and F; the 08:50 run handles them.

---

## A. Sources

```text
## Sources
Use only these sources, in this order of lookup:
1. VLR transfer log (vlr.gg/transfers) and VLR news
2. Sheep Esports (X, website, Instagram)
3. Official team / player / Riot VCT accounts (X, Instagram, Youtube, website)
4. Liquipedia transfer pages
Source tiers:
- A (official): team, player, Riot/VCT official posts. Alone is enough for conf=C and for "성사일".
- B (press): Sheep Esports, Dot Esports, TheSpike, Strafe, VLR news/transfer log. One B source = conf=R. Two independent B sources = conf=C.
- I (profile data): Liquipedia (CC BY-SA, always keep the link), VLR player pages. Use only for People/Teams tab fields, never as the basis for a news row.
- Forbidden: community posts, unsourced rumors, re-quotes whose original you cannot open. If a story is a re-quote, find and cite the original post or article.
Every source cell must be a =HYPERLINK to the exact article or post URL (with path), never a site homepage.
Never invent a value. Leave a cell empty if no A/B/I source confirms it.
In the final report add one line: "sources: A n / B n / I n".
```

## B. Transfer sync

```text
## Transfer sync
When you add or update a row in "성사된 이적", update the same person's row in "LFT 선수" / "코치·스태프" in the same run:
set the status to "계약 완료(<new team>)" and use the same date.
If the person has no LFT row, do not create one; the website merges transfer rows automatically.
When a transfer becomes official (A source), fill "성사일" with the official announcement date and set conf=C.
```

## C. Birth dates (daily 08:50 run only)

```text
## Birth dates (daily 08:50 run only)
Fill up to 15 empty "생년월일" cells in the People tab per run. Do people who appear in current LFT or transfer rows first.
Use the Liquipedia infobox "Born" field. Write yyyy-mm-dd, or yyyy if only the year is shown. Never estimate from age.
Add to the final report: "birth filled n / still empty n".
```

## D. Caption ("요약" column). Paste only after rollout step 3.

Tabs: "LFT 선수", "코치·스태프", "성사된 이적" (both player and coach sections).

```text
## Caption ("요약" column)
For every row you touch in "LFT 선수", "코치·스태프" and "성사된 이적", write "요약":
one Korean sentence, max 120 characters, describing the person's CURRENT situation, with the date in M/D.
Example: "Sentinels 공식 영입 발표(11/2)". Example: "FURIA 철수로 FA, 남미 팀과 협상 중 보도(11/4)".
Overwrite "요약" whenever the situation changes; never append to it.
Keep the full history in "비고" exactly as before (append with " / ").
For rows you do not touch, leave "요약" as it is. The daily 08:50 run also fills "요약" for up to 20 rows that have it empty.
```

## E. Contracts. Paste only after rollout step 3.

Columns: "계약 만료" in "인물", "LFT 선수", "코치·스태프", and "새 계약 만료" in "성사된 이적".

```text
## Contracts
Write a contract end only when an A source, or a B report, states it.
- Exact date known: write the date (it becomes a sheet serial number as today).
- Only the year known ("contract until 2027"): write the 4-digit year as plain text: 2027.
- Never infer a contract end from the season end alone.
One-time backfill (first 08:50 run after this change): for every LFT row whose status or note already says
"계약은 YYYY까지" or similar, copy YYYY into the person's "계약 만료" in the People tab.
When a transfer becomes official, update the People tab "계약 만료" with the new contract end if stated.
Add to the final report: "contracts filled n".
```

## F. Rosters (one-time backfill, then daily 08:50)

Current state (2026-11-08): 32 of 41 partner/ascended teams have 0 people with an open career entry.

```text
## Rosters
One-time backfill: for every team with tier partner or ascended in the Teams tab, make sure every current player
and the head coach has a People row (minimum: 인물ID, 이름, 구분, 역할, 국적) with an open career entry for that team
(append "; <teamID>:YYYY-MM~" to "경력"). Source: the Liquipedia team page "Active" roster (tier I). Keep the link in "출처".
Use the existing ID rules: lowercase a-z, 0-9 and hyphen; never change an existing ID.
Daily 08:50 run: re-check up to 10 such teams, oldest checked first. Close the career entries of people who left
("~YYYY-MM") and open new ones for people who joined.
Add to the final report: "roster teams checked n / people added n / career entries closed n".
```
