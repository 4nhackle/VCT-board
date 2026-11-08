# 2026-11-08 · PR 11 people.json·teams.json 필수화

## 목적

감사 2026-11-08b 발견 1: `people.json`·`teams.json` 이 없어도 검증이 통과해 인물·팀 페이지가 빠진 채 배포되던 문제를 막는다. 지시문 `docs/instructions/PR11-required-people-teams.md`.

## 작업 위치

- 브랜치 `fix/required-people-teams`, 기준 `origin/main`(2bb0f1e). worktree `C:\Users\idisi\coding\VCT-board-pr11`.
- 병합하지 않는다.

## 바꾼 파일

- `scripts/validate.mjs`: 두 파일이 없으면 `errors` 에 한 줄씩 넣는다("people.json 이 없습니다. 인물·팀 파일은 필수입니다 (예약 작업 동기화를 확인하세요)"). 가드 `hasPeople`/`hasTeams` 는 그대로 둬서 `read()` 에서 죽지 않고 정상 요약·종료 코드로 끝난다. 맨 위 설명과 인물·팀 구역 주석을 "필수"로 고쳤다. 빈 `[]` 파일 검사는 범위 밖이라 하지 않았다.
- `scripts/build.mjs`: 동작은 그대로(경고만). 주석만 고쳤다. 배포에서는 CI 가 빌드 앞에 validate 를 돌리므로 여기서 실패시키지 않는다. 로컬의 일부 데이터 빌드(fixture)를 위해서다.
- `scripts/test.mjs`:
  - `runValidate` 의 `people`·`teams` 기본값을 `[]` 로 하고 항상 파일을 쓴다(지시문).
  - `validateFixture` 도 `people.json`·`teams.json` 을 `[]` 로 쓴다(지시문에는 없었지만 같은 이유로 필요).
  - 새 시험 1개(세 확인): people 없음 → 종료 1, 메시지 "people.json 이 없습니다"; teams 없음 → 종료 1, "teams.json 이 없습니다"; 둘 다 있음 → 종료 0, "이 없습니다" 없음.
  - `validate: personId 가 있는 행끼리 같은 철자는 충돌이 아니다`: 이제 파일이 항상 있어 `personId` 가 people 에 없다는 기존 오류가 난다. 픽스처에 `zyzz-a`·`zyzz-b` 인물을 이름을 다르게(Alpha, Beta) 넣었다. 시험의 뜻(같은 철자 행이 personId 로 구분되면 충돌 아님)은 그대로다.
- `docs/PROGRESS.md`, 이 세션 기록.

## 결정과 이유

- build 는 실패시키지 않는다. 두 줄 규칙을 지키려고 주석만 고쳤다. CI 순서(validate → build)가 배포를 막으므로 충분하다. 실패시키면 fixture 나 로컬 부분 빌드가 깨지고 얻는 것이 없다.
- `js/main.js` 는 손대지 않았다(지시문).

## 확인 결과

- `node scripts/test.mjs` → 단위 시험 158개 통과. 바꾸기 전 `origin/main` 은 157개. 종료 코드 0.
- `node scripts/validate.mjs`(실제 `data/`, origin/main 2bb0f1e): 오류 0, 경고 644. 바꾼 뒤도 오류 0, 경고 644(같음).
- `node scripts/build.mjs <scratchpad>\_site-pr11` → 빌드 완료(인물 330쪽, 팀 350쪽). 종료 코드 0.
- `node scripts/css-check.mjs` → 통과.

## 남은 일

- 예약 작업 쪽: 동기화가 두 파일을 빠뜨리면 이제 CI 가 실패한다(PR 본문에 적음).
- `[]` 빈 파일 검사는 후속 작업으로 남긴다.
