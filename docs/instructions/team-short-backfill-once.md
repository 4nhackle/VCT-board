# 일회성 실행: 팀 약칭(short) 채우기

예약 작업이 있는 환경의 Claude 에게 아래 코드 블록 전체를 한 번 실행시킨다. 정기 예약 작업과 별개다.

- 목적: 검색창에 `C9`·`EG`·`PRX` 같은 약칭을 넣었을 때 그 팀으로 이적한 인물도 나오게 한다. 코드 쪽은 PR 30(`PR30-search-current-team.md`)이 `teams.json` 의 `short`·`aliases` 를 검색하게 바꾼다. 이 실행은 그 값을 시트에 채운다.
- 실행 시각: 예약 작업 실행 앞뒤 30분을 피한다(08:50·09:35·14:50·15:35·20:50·21:35 KST). 같은 시트를 쓰므로 겹치면 안 된다.
- 반영: 다음 웹 반영 예약 작업이 팀 탭의 약칭을 `teams.json` `short` 로 내보낸다(`revised/web-publish-daily.txt`). `data/teams.json` 은 손으로 고치지 않는다.
- 대상: 2026-11-10 기준 `teams.json` 에서 등급이 partner·ascended·challengers 이고 `short` 가 빈 39팀.
- 앞으로 새로 넣는 팀도 약칭을 채우게 하려면, 시트 갱신 정기 지시문(`revised/sheet-update-daily.txt`)의 팀 탭 규칙에 "새 팀 행은 VLR 팀 태그로 약칭을 채운다" 한 줄을 더한다. 이 파일의 범위는 아니다.

```text
# One-off task: fill the 약칭 (short name) column in the VCT sheet Teams tab

Sheet: the same spreadsheet as the daily task "VCT LFT 시트 일일 갱신" (take the spreadsheet_id from that task).
Use the same Composio Google Sheets account and Firecrawl setup as that task.
The user is away. Do not ask questions; decide reasonably and report. Reply in Korean.
Touch only the "팀" (Teams) tab, and only the 약칭 column. Do not change any other column, tab, task prompt, or the GitHub repo.
No side effects other than sheet writes (no mail, posts or shares).

## Safety
- First run GET_SHEET_NAMES. The tab order must be: 요약, LFT 선수, 코치·스태프, 관망 대상(미확정), 성사된 이적, 인물, 팀, 변경 내역, 일정. If not, stop and report.
- Read "팀" with valueRenderOption=FORMULA, up to the last used header column. Find columns by header name
  (팀ID, 팀명, 약칭, 권역, 국가, 등급, 운영 여부, 비고, 별칭). If 약칭 or 별칭 is missing, stop and report.
- Before any write, keep a copy of the tab's values (in memory). Report the row count before and after; it must not change.
- When you write a row, rewrite the whole row from the values you read, changing only 약칭.
- Never overwrite a non-empty 약칭. If a team in the list below already has one, skip it and list it.

## Step 1. Teams to fill (39)
- Americas: 100-thieves, cloud9, envy, evil-geniuses, flyquest, g2-esports, kru-esports, leviatan, loud, m80, mibr, nrg, sentinels, shopify-rebellion-black
- EMEA: barca-esports, eintracht-frankfurt, eternal-fire, f9-eicar, fokus, gentle-mates, joblife, karmine-corp, mandatory, ucam-esports-club, wip-esports
- Pacific: boom-esports, crazy-raccoon, gam-esports, nongshim-redforce, reject, riddle-order, s8ul, zeta-division
- China: bilibili-gaming, jd-gaming, nova-esports, trace-esports, tyloo, wolves-esports
If a listed 팀ID is not in the tab, skip it and list it. Do not add rows.

## Step 2. Find the short name
For each team, open its VLR.gg team page (Firecrawl) and read the team tag shown under the team name (e.g. Cloud9 -> C9, Evil Geniuses -> EG).
- If VLR has no tag, use the Liquipedia team page infobox (Firecrawl).
- Use the tag exactly as the source writes it (case included), 1 to 6 characters, letters, digits or "-" only.
- If no source shows a tag, leave 약칭 empty and list the team. Do not invent one.
- If the tag equals the team name ignoring case (e.g. LOUD, NRG, MIBR, TYLOO), still write it.
- If VLR and Liquipedia disagree, use VLR and list both values.

## Step 3. Collisions
- If a tag equals an existing 약칭 of another team, or two listed teams get the same tag (case-insensitive), write 약칭 for none of them and list them.

## Step 4. Write and verify
Write in batches of up to 10 teams, then re-read the tab and check:
- the row count is unchanged;
- only 약칭 cells changed, and only on the listed teams that were empty before;
- no two rows share the same non-empty 약칭 (case-insensitive).
Fix errors before the next batch. If you run out of time or credits, stop after a finished batch and report the teams left.
The next run of this same prompt continues (step "Never overwrite a non-empty 약칭" skips done teams).

## Final report (Korean)
1. 약칭 filled n / 39, as "<팀ID> <약칭>" one per line.
2. Teams skipped: already had 약칭, missing 팀ID, no tag found, collisions (one line each, with reason).
3. VLR/Liquipedia disagreements (one line each).
4. Validation result of step 4 (0 errors, or the list).
```
