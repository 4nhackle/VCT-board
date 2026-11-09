# PR 23 로스터가 이적 소식을 따른다 (2026-11-09)

## 목적
지시문 `docs/instructions/PR23-roster-follows-transfers.md` 대로 로스터(로스터 탭과 팀 페이지)가 이적 도착을 반영한다. 이전에는 `teamMoves` 가 경력 칸(`people.json` career)만 보아, 이적으로 옮긴 인물이 새 팀 로스터에 없었다(예: keiko nrg → sentinels). 데이터는 바꾸지 않는다.

## 기준
- 기준: `origin/main` 0ae65f9. 지시문의 기준과 같다.
- PR 22(`feat/roster-search`, #55)는 아직 병합 전이다. 이 브랜치는 `origin/main` 에서 땄다(지시문대로). 두 PR 모두 `scripts/test.mjs` 를 건드려 병합 때 충돌이 날 수 있다(인접한 시험 블록). PR 22 를 먼저 병합하는 편이 낫다.
- 작업 자리: 이 체크아웃, 브랜치 `feat/roster-follows-transfers`. 커밋하지 않았다.

## 바꾼 파일
- `js/model.js`:
  - `latestMove(pid, IDX)` 를 새로 두었다. 인물의 이적 행(`kind === "t"`) 가운데 가장 최근 것을 고른다. 날짜가 같으면 `signed` 가 숫자인 행이 이긴다. `mergeMoves` 와 같은 기준이다(`mergeMoves` 는 건드리지 않았다).
  - `teamMoves` 의 로스터 조건을 `onTeam(p) && !gone(p.id)` 로 바꿨다. `onTeam` 은 이적 행이 있으면 가장 최근 이적의 `tidTo === id` 로, 없으면 기존 경력 칸 규칙으로 판정한다. 위 `shortcut:` 주석을 `onTeam` 위에 달았다.
  - 정렬, `gone`, `closed`, `incoming`·`outgoing` 은 그대로다.
- `scripts/test.mjs`: `teamMoves` 시험 여섯 개와 `rosterHTML` 시험 하나를 추가했다. 확정 이적, 보도 이적, 두 번 이적(최신 도착 팀만), 같은 날 발표 우선, 도착 팀이 빈 경우, 이적 없는 인물은 경력 규칙, 로스터 행에 pill·보도 표시 없음.

## 결정과 이유
- 보도(발표 전) 이적도 같은 취급이다. 사용자가 2026-11-09 에 정했다. 로스터 행에 "보도" 표시를 붙이지 않았다(지시문 2번).
- `rosterCards` 는 그대로다. `partial`(5명 미만)은 이제 도착을 세므로, 일부 표시 팀이 줄어든다. 의도한 변화다.
- `people.json` 경력은 건드리지 않았다(데이터는 예약 작업 소유, CLAUDE.md).

## 확인 결과 (직접 실행)
- `node scripts/test.mjs`: 단위 시험 168개 통과(기준 161 + 새 시험 7).
- `node scripts/validate.mjs`: 오류 0, 경고 648(기준 `origin/main` 과 같다).
- `node scripts/build.mjs _site`: 빌드 완료(인물 331쪽, 팀 350쪽 각각 한·영).
- 내장 브라우저, 정적 서버 `_site`, `#roster` 명단(실제 데이터):
  - Sentinels 에 keiko 있음.
  - NRG 에 eeiu 있음, 다른 팀에는 없음(FURIA 에 없음).
  - LOUD 에 artzin, basic, cortezia 있음.
  - T1 에 TenZ, crashies, Sungmin 있음.
  - 명단 행에 pill·보도 표시 없음.
- 팀 페이지: 로스터 탭의 Sentinels 링크로 들어가 keiko, Zellsis 가 보인다(로스터와 일치).
- 참고: 정적 경로 `/t/sentinels/` 를 직접 열면 팀 이름만 나온다. 이는 로컬 서버가 `/VCT-board/` 기준 경로가 아니어서 생기는 문제이고, 이 PR 과 무관하다.

## 확인하지 않은 것
- 팀 페이지의 다른 팀(LOUD, NRG, T1) 직접 비교. Sentinels 만 확인했다.
- 375 폭.

## 남은 일
- 커밋·푸시·PR 은 사용자가 요청할 때 한다.
- PR 22 병합 뒤 `scripts/test.mjs` 충돌이 나면 시험 블록 순서만 맞추면 된다.
