# Prompt for Claude: update the VCT-board scheduled tasks

이 파일의 코드 블록 전체를 예약 작업이 있는 환경의 Claude 에게 붙여 넣는다. 스스로 완결된 지시문이다(저장소의 `docs/instructions/` 는 커밋되지 않아 그쪽에서 읽을 수 없다). 내용은 `schedule-sheet-update.md`, `schedule-web-publish.md` 를 합치고, PR 1·2·4·5 병합 결과(origin/main `523c6d7`)에 맞췄다.

---

```text
# Task: update the four VCT-board scheduled tasks and the Google Sheet

You manage four scheduled tasks for the site https://4nhackle.github.io/VCT-board/ (repo 4nhackle/VCT-board):
- "VCT LFT 시트 일일 갱신" (daily 08:50 KST): web research, then update the Google Sheet
- "VCT LFT 시트 추가 갱신 (11/2~11/16)" (14:50, 20:50 KST): same, news since the last run
- "VCT 보드 웹페이지 반영" (daily 09:35 KST): sheet to data/*.json, one commit
- "VCT 보드 웹페이지 추가 반영 (11/2~11/16)" (15:35, 21:35 KST): same

The site code on main already accepts the new data (merged PRs #27-#30):
- transfer rows are merged into the player/coach tabs by the site;
- contractUntil may be a sheet serial number OR a 4-digit year string "2027";
- rows may carry "caption" (string, max 120 chars, shown instead of the long note);
- source URLs that are not https, are a homepage, or are duplicated get validation warnings.
GitHub Actions runs scripts/validate.mjs before every deploy. If the data breaks a rule, the deploy stops
and the site stays on the previous version.

## Hard rules
- Do not edit a task while it is running. Do all edits in a quiet window: not within 30 minutes of
  08:50, 09:35, 14:50, 15:35, 20:50, 21:35 KST.
- Do the steps in the order below. Step 1 must be live before step 3. Otherwise the web task can
  export values that its own safety check rejects.
- Never insert a sheet column in the middle of a tab. Add new columns only after the last column.
  The "요약" tab's COUNTIF formulas reference fixed columns ('LFT 선수'!B:B and I:I).
- Change only the parts listed here. Keep every other line of each prompt as it is.
- Before you edit, save the current full text of each of the four prompts and paste it into your final report,
  so the user can roll back.

## Step 1. Web-publish tasks (both): new fields and safety checks

1a. Add to the export section:

## New fields
Read the "요약" column and export it as "caption" (string) on rows of:
- players.json (from "LFT 선수")
- coaches.json (from "코치·스태프")
- transfers.json players and coaches (from "성사된 이적")
"계약 만료" (LFT rows, People tab) and "새 계약 만료" (성사된 이적) become "contractUntil":
- a date cell: the sheet serial integer, as today;
- a 4-digit year text cell: the string "2027";
- an empty cell: OMIT the field. Never write "" or null for caption or contractUntil; validation rejects them.
If a column does not exist yet, omit the field. This step is safe before step 2.

1b. In the safety checks, replace the rule "contractUntil·signedDate가 숫자인지" with:

## Safety checks (block the commit and report if any fails)
- signedDate is a number when present.
- contractUntil is a number OR a string matching ^\d{4}$ when present (rows and people.json).
- caption is a string when present.
- Warning only, still commit: caption longer than 120 characters. List those rows in the report.
Keep every other existing check unchanged.

1c. Add to the report: "caption rows n / contractUntil year-only n / contractUntil dated n".
1d. Add og-en.png and CLAUDE.md to the do-not-touch list.

## Step 2. Google Sheet: add columns (far right only)
- "LFT 선수", "코치·스태프": add "요약". If missing, also add "계약 만료".
- "성사된 이적" (player and coach sections): add "요약". If missing, also add "새 계약 만료".
- "인물": "계약 만료" already exists; do not add it again.
Set the "계약 만료" columns to plain text format, so a year stays "2027" and is not converted to a date.
After adding, confirm that the "요약" tab's counts are unchanged.

## Step 3. Sheet-update tasks (both): add these sections
The daily 08:50 task gets all sections A-G.
The extra 14:50/20:50 task gets only A, B, D, E, G, and applies them only to people in that run's new news.
C and F run only at 08:50, so the extra runs stay short.

### A. Sources
Use only these sources, in this order of lookup:
1. VLR transfer log (vlr.gg/transfers) and VLR news
2. Sheep Esports (X, website, Instagram)
3. Official team / player / Riot VCT accounts (X, Instagram, YouTube, website)
4. Liquipedia transfer pages
Source tiers:
- A (official): team, player, Riot/VCT official posts. Alone is enough for conf=C and for "성사일".
- B (press): Sheep Esports, Dot Esports, TheSpike, Strafe, VLR news/transfer log. One B source = conf=R. Two independent B sources = conf=C.
- I (profile data): Liquipedia (CC BY-SA, always keep the link), VLR player pages. Use only for People/Teams tab fields, never as the basis for a news row.
- Forbidden: community posts, unsourced rumors, re-quotes whose original you cannot open. For a re-quote, find and cite the original.
Every source cell is a =HYPERLINK to the exact article or post URL (https, with a path), never a site homepage.
Never invent a value. Leave a cell empty if no A/B/I source confirms it.
Report line: "sources: A n / B n / I n".

### B. Transfer sync
When you add or update a row in "성사된 이적", update the same person's row in "LFT 선수" / "코치·스태프" in the same run:
status "계약 완료(<new team>)", same date.
If the person has no LFT row, do not create one; the website merges transfer rows automatically.
When a transfer becomes official (A source), fill "성사일" with the official announcement date and set conf=C.

### C. Birth dates (08:50 only)
Fill up to 15 empty "생년월일" cells in the People tab per run. Start with people in current LFT or transfer rows.
Use the Liquipedia infobox "Born" field. Write yyyy-mm-dd, or yyyy if only the year is shown. Never estimate from age.
Report line: "birth filled n / still empty n".

### D. Caption ("요약")
For every row you touch in "LFT 선수", "코치·스태프" and "성사된 이적", write "요약":
one Korean sentence, max 120 characters, with the person's CURRENT situation and the date in M/D.
Examples: "Sentinels 공식 영입 발표(11/2)", "FURIA 철수로 FA, 남미 팀과 협상 중 보도(11/4)".
Overwrite "요약" when the situation changes; never append. Keep the full history in "비고" as before (append with " / ").
Leave "요약" unchanged on rows you do not touch. The 08:50 run also fills up to 20 rows whose "요약" is empty.

### E. Contracts
Write a contract end only when an A source, or a B report, states it.
- Exact date known: write the date.
- Only the year known ("contract until 2027"): write the 4 digits as plain text: 2027.
- Never infer a contract end from the season end alone.
One-time backfill (first 08:50 run after this change): for every LFT row whose status or note says "계약은 YYYY까지"
or similar, copy YYYY into that person's "계약 만료" in the People tab.
When a transfer becomes official, update the People tab "계약 만료" with the new contract end if stated.
Report line: "contracts filled n".

### F. Rosters (08:50 only)
One-time backfill: for every team with tier partner or ascended in the Teams tab, make sure each current player and the head coach
has a People row (minimum: 인물ID, 이름, 구분, 역할, 국적) with an open career entry for that team
(append "; <teamID>:YYYY-MM~" to "경력"). Source: the Liquipedia team page "Active" roster (tier I); keep the link in "출처".
The backfill is large (about 41 teams x 6 people). Spread it over several runs, up to 10 teams per run.
Use the existing ID rules: lowercase a-z, 0-9 and hyphen; never change an existing ID.
After the backfill, each 08:50 run re-checks up to 10 such teams, oldest checked first. Close the career entries of people
who left ("~YYYY-MM") and open entries for people who joined.
Report line: "roster teams checked n / people added n / career entries closed n / backfill teams left n".

### G. Position values
The site's position filter matches these English words: Duelist, Initiator, Controller, Sentinel, Flex, IGL.
In "포지션" (LFT 선수) and "역할" (People, players), use only these words. Join several with "/" (e.g. "IGL/Sentinel").
Do not write Korean names (이니시에이터) or notes in parentheses ("Initiator(Tejo)"); put such notes in "비고".
Leave the cell empty if unknown. Do not write "-".
On the 08:50 run, normalize up to 20 existing cells per run to this format.

## Step 4. Verify after the first runs
- After the next web-publish run, check the GitHub Actions "pages" run for that commit sha. All steps must succeed.
  If "데이터 검증" fails, copy the failing line from the log into the report.
- Check that data/players.json now has "caption" on the rows whose "요약" is filled, and that contractUntil is a number or "yyyy".
- Open https://4nhackle.github.io/VCT-board/ and confirm that a row with 요약 shows the short sentence.

## Final report to the user (Korean)
1. Saved original prompts (all four, full text).
2. The exact lines changed in each prompt.
3. The columns added, with column letters per tab.
4. The quiet window you used, with times.
5. The results of step 4, or "pending until <next run time>".
```
