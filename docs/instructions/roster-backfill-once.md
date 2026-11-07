# 일회성 실행: 팀 등급 2027 기준 정리 + 1부 로스터 채우기

예약 작업이 있는 환경의 Claude 에게 아래 코드 블록 전체를 한 번 실행시킨다. 정기 예약 작업과 별개다.

- 실행 시각: 예약 작업 실행 앞뒤 30분을 피한다(08:50·09:35·14:50·15:35·20:50·21:35 KST). 시트 갱신 작업과 같은 시트를 쓰므로 겹치면 안 된다.
- 한 번에 다 못 끝내면 같은 지시문을 다시 실행한다. 이미 채운 팀은 건너뛴다(4단계).
- 등급 근거(2026-11-08 확인): Liquipedia "VCT/2027/Partnered_Teams", Sheep Esports "All the VCT partnered teams for 2027-2028", Strafe 정리 기사. 2027 은 지역마다 파트너 8팀, 어센션 없음, 중국만 게스트 2팀(DRG, Nova).
- 이 실행 뒤 정기 지시문에서 바뀌는 점은 `roster-backfill-changes.md` 에 있다.

```text
# One-off task: set 2027 team tiers, then backfill top-tier rosters in the VCT sheet

Sheet: the same spreadsheet as the daily task "VCT LFT 시트 일일 갱신" (take the spreadsheet_id from that task).
Use the same Composio Google Sheets account and Firecrawl setup as that task.
The user is away. Do not ask questions; decide reasonably and report. Reply in Korean.
Touch only the "팀" (Teams) and "인물" (People) tabs. Do not change any other tab, any task prompt, or the GitHub repo.
No side effects other than sheet writes (no mail, posts or shares).

## Safety
- First run GET_SHEET_NAMES. The tab order must be: 요약, LFT 선수, 코치·스태프, 관망 대상(미확정), 성사된 이적, 인물, 팀, 변경 내역, 일정. If not, stop and report.
- Read "팀" and "인물" with valueRenderOption=FORMULA, up to the last used header column. Find columns by header name.
- Before any write, keep a copy of both tabs' values (in memory) and report the row counts before and after.
- People rows: add new rows with GOOGLESHEETS_UPSERT_ROWS (keyColumn=인물ID) at the bottom. When you edit an existing row,
  rewrite the whole row from the values you read, so 생년월일, 경력 text and the 출처 formula do not change. Write 생년월일 and 경력 as RAW.
- ID rules: lowercase a-z, 0-9 and hyphen only (lowercase the name, strip accents, replace other runs with one hyphen, trim hyphens).
  If a person ID already exists for a different person, append -<teamID>. Never change an existing ID.

## Step 1. Set Teams tab tiers to the 2027 season
"등급" now means the team's 2027 VCT status. Set exactly these teams to "partner" (32):
- Americas: 100-thieves, g2-esports, kru-esports, leviatan, loud, mibr, nrg, sentinels
- EMEA: bbl-esports, fnatic, fut-esports, gentle-mates, karmine-corp, team-heretics, team-liquid, team-vitality
- Pacific: crazy-raccoon, full-sense, gam-esports, gen-g, paper-rex, rex-regum-qeon, t1, zeta-division
- China: all-gamers, bilibili-gaming, edward-gaming, jd-gaming, trace-esports, tyloo, weibo-gaming, xi-lai-gaming
Set these China guest teams to "ascended" (2): dragon-ranger-gaming, nova-esports.
These teams had partner or ascended in 2026 but are not 2027 partners. Change them as follows, and append "2026 1부" to their 비고 (keep the existing 비고 text):
- tier "challengers": cloud9, evil-geniuses, giantx, natus-vincere, boom-esports, detonation-focusme, kiwoom-drx, team-secret,
  wolves-esports, envy, eternal-fire, pcific-esports, nongshim-redforce
- tier "other" (team no longer operates, 운영 여부 stays 운영 종료): furia, global-esports
If a listed team ID is missing, add the row: 팀ID, 팀명, 약칭, 권역, 국가, 등급, 운영 여부=운영. Known missing: gam-esports (GAM Esports, Pacific, Vietnam), jd-gaming (JD Gaming, China, China).
karmine-corp has no 권역: set it to EMEA, 국가 France.
Do not change the tier of any other team.
Source for the 비고 of changed rows: append "(2027 파트너 발표, Liquipedia VCT/2027/Partnered_Teams)" only to rows whose tier you changed.
Keep the Teams tab order: 권역 (Americas, EMEA, Pacific, China, empty last), then team name.

## Step 2. Backfill rosters for the 34 teams from step 1 (partner + ascended)
For each team, open its Liquipedia team page (Firecrawl) and read the "Active" player roster and the head coach.
For each person:
1. Find the People row by Liquipedia link, then by name or alias. If none exists, add a row with at least 인물ID, 이름, 구분 (선수/코치), 역할, 국적.
   Add 본명, 생년월일 (yyyy-mm-dd or yyyy), VLR 링크 and Liquipedia 링크 when the page shows them. Put a =HYPERLINK to the team page in 출처.
2. 역할 for players uses only: Duelist, Initiator, Controller, Sentinel, Flex, IGL (join several with "/"). For coaches use the coach title.
3. 경력: the person needs exactly one open entry, "<teamID>:YYYY-MM~", for this team.
   - Start month = the "Join Date" on the Liquipedia roster as YYYY-MM. If no join month is shown, do not invent one. Skip the person and list them.
   - If the person already has an open entry for this team, keep it.
   - If the person has an open entry for another team, close it first with the month before the new start ("~YYYY-MM").
   - Entries are separated by "; ". Every team ID in 경력 must exist in the Teams tab; add a missing team row first (팀ID, 팀명, 권역, 등급).
4. Never overwrite a non-empty cell with a different value without a source. If Liquipedia disagrees with the sheet, keep the sheet value and list the conflict.

## Step 3. Write and verify
Write in batches of up to 5 teams, then re-read the People tab and check:
- every 인물ID is unique and matches [a-z0-9-]+;
- every team ID in 경력 exists in the Teams tab;
- each 경력 entry matches teamID:YYYY-MM~[YYYY-MM][:role], an end is not before its start, and each person has at most one open entry.
Fix errors before the next batch.

## Step 4. Resume rule
Before step 2, count for each of the 34 teams the people who already have an open entry for it. Skip teams with 5 or more (players + head coach).
If you run out of time or credits, stop after a finished batch and report which teams are left. The next run of this same prompt continues.

## Final report (Korean)
1. Teams tab: tiers changed n, rows added n (list IDs).
2. Rosters: teams done n / 34, teams left (IDs), people added n, people updated n, career entries closed n.
3. Skipped people (no join month) and data conflicts, one line each.
4. Per-team count after the run: "<teamID> n" for all 34 teams.
5. Validation result of step 3 (0 errors, or the list).
```
