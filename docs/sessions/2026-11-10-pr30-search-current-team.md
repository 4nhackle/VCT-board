# 2026-11-10 PR 30 — 팀 검색은 팀 ID 로 찾는다

지시문: `docs/instructions/PR30-search-current-team.md`
브랜치: `feat/search-current-team` (main e8ce115 에서 분기). 커밋하고 푸시했다.

## 목적

목록 탭(선수·오늘·코치·한국·이적)의 `#q` 팀 검색이 떠난 팀 글자만 보던 문제를 고친다. 예: `cloud9` 을 쳐도 Cloud9 로 이적한 GLYPH·nightz·alym·Derrek 이 빠졌다.

## 바꾼 파일

- `js/model/tabs.js`: `teamWords(tab, it)` 추가. `matches()` 의 검색 글자 묶음에 소속 팀(`it.tid`, 이적이면 `it.tidTo`)의 ID·이름·짧은 이름·별칭을 넣었다. `tab.teamObj` 가 없는 지켜볼 팀은 빈 글자.
- `js/views/roster.js`: `searchCard()` 가 팀 별칭(`tm.aliases`)도 본다. 로스터 구성은 그대로.
- `scripts/test/model.test.mjs`: 시험 1개 추가(도착 팀 짧은 이름·별칭, 떠난 팀, moved 아닌 도착 팀 제외, 지켜볼 팀 기존 동작).
- `scripts/test/views.test.mjs`: 시험 1개 추가(별칭으로 찾으면 팀 전체 카드).
- `docs/PROGRESS.md`: PR 30 요약 한 절 추가.

## 결정과 이유

- 떠난 팀은 항상 남긴다(이적 탭은 양쪽 팀을 보여준다). `tidTo` 는 `moved` 일 때만 쓴다. `krTeam` 과 같은 규칙.
- 새 색인을 만들지 않았다. `tab.teamObj` 는 `buildTabs` 에서 이미 한 번 만든 `TEAM_OBJ` 를 쓴다.
- `teams.json` 과 시트는 건드리지 않았다(예약 작업 소유). 짧은 이름이 없는 팀은 데이터 문제로 남긴다.

## 확인 결과

- `node scripts/test.mjs`: 시험 180개 통과(이전 178 + 신규 2), 종료 코드 0.
- `node scripts/validate.mjs`: 오류 0, 경고 639. `main` 아카이브 복사본과 요약 줄이 같다.
- `node scripts/build.mjs _site`: 빌드 완료(인물 331쪽, 팀 350쪽).
- 브라우저(로컬 `scripts/dev-server.mjs`, 선수 탭, 실제 데이터). 내장 미리보기 브라우저 사용(Obscura 는 localhost 를 막음):
  - `cloud9`: GLYPH, nightz, alym, Derrek(도착) + Jackk, OXY, v1c, Zellsis(떠남).
  - `sentinels`: OXY, Zellsis 포함.
  - `FNC`(짧은 이름 있음): valyn, marteen, Minny 가 Fnatic 으로 이동해 나온다.
  - `c9`: 짧은 이름이 `cloud9` 에 없어 옛 Cloud9 선수 네 명만 나온다(데이터 공백, 아래 참고).
- 시험은 변경 뒤에만 돌렸다. 바꾸기 전 코드에서 새 시험이 실패하는지는 확인하지 않았다(추론으로만 확인).

## 남은 일 (데이터, 코드 아님)

- `short` 가 없는 partner·ascended·challengers 팀 39개. 시트 teams 탭에 짧은 이름을 넣거나 예약 작업 지시문에 추가해야 `c9` 같은 검색이 된다: cloud9, sentinels, 100-thieves, g2-esports, loud, nrg, envy, evil-geniuses, flyquest, m80, mibr, kru-esports, leviatan, gentle-mates, karmine-corp, mandatory, crazy-raccoon, gam-esports, trace-esports, tyloo, zeta-division, bilibili-gaming, jd-gaming, nova-esports, boom-esports, nongshim-redforce, wolves-esports, eintracht-frankfurt, eternal-fire, f9-eicar, fokus, joblife, ucam-esports-club, wip-esports, shopify-rebellion-black, barca-esports, reject, riddle-order, s8ul.
- PR 은 아직 열지 않았다.
