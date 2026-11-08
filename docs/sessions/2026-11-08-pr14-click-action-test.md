# 2026-11-08 · PR 14 문서 클릭 처리 결정 시험

## 목적

감사 2026-11-08c 발견 2: 문서 `click` 처리기가 링크 → 행 펼침 → 단추 순서로 정한다. 순서가 중요한데(행 안의 링크가 행을 여닫으면 안 된다) 시험이 없었다. 결정을 순수 함수로 빼고 시험한다. 클릭의 동작은 그대로다. 지시문 `docs/instructions/PR14-click-action-test.md`.

## 작업 위치

- 브랜치 `test/click-action`, 기준 `origin/main`(b9b4b78). worktree `C:\Users\idisi\coding\VCT-board-pr14`.
- 병합하지 않는다.

## 바꾼 파일

- `js/state.js`: `clickAction(target)` 을 `listAction` 곁에 더했다. `{ kind: "link"|"row"|"button", el }` 또는 `null` 을 돌려준다. 선택자와 순서는 옛 처리기와 같다. DOM 전역(`document`, `window`)을 쓰지 않는다.
- `js/main.js`: 처리기가 `clickAction(e.target)` 을 한 번 부르고 `kind` 로 나뉜다. 각 분기의 본문과 주석은 그대로 옮겼다. `clickAction` 을 기존 import 줄에 더했다. 바뀐 것은 판단 부분뿐이다(`git diff` 로 확인).
- `scripts/test.mjs`: 가짜 요소(`fakeEl`, 20줄 남짓)와 시험 1개. 지시문의 여덟 경우를 한 시험에 넣었다: 행 안의 링크 → 링크, 행의 빈 곳 → 행, 펼침 단추 자체 → 행, 펼침 영역 안 단추 → 단추, 행 안 선택 칸 → 없음, 펼침 단추 없는 행의 빈 곳 → 없음, 행 밖 탭 단추 → 단추, 행 밖 글자 → 없음. 고른 요소를 그대로 돌려주는지도 확인한다.
- `docs/PROGRESS.md`, 이 세션 기록.

## 결정과 이유

- 함수는 `closest` 와 `querySelector(":scope > .row-x")` 만 쓴다. 그래서 가짜 요소로 시험할 수 있다.
- `main.js` 를 import 해서 시험하지 않는다. 시작할 때 DOM 을 건드려서 시험에서 실행하면 안 된다.

## 확인 결과

- `node scripts/test.mjs` → 단위 시험 160개 통과(전 159, 새 1). 종료 코드 0.
- `node scripts/validate.mjs` → 오류 0, 경고 644(변화 없음).
- `node scripts/css-check.mjs` → 통과.
- `node scripts/build.mjs <scratchpad>\_site-pr14` → 빌드 완료(인물 330쪽, 팀 350쪽).
- `git diff js/main.js`: 바뀐 줄은 처리기 첫 줄들과 행 판단 두 줄뿐. 링크·행·단추 본문은 그대로.
- 브라우저 클릭 확인: 하지 못했다. Obscura 가 `127.0.0.1` 을 막는다. 내장 브라우저는 사용자 허락 없이 쓰지 않았다. 지시문의 "1280·375 클릭 확인" 은 빠졌다. 가짜 요소 시험과 diff 로 대신했다.

## 남은 일

- 브라우저 클릭 확인(사용자가 내장 브라우저 사용을 허락하면): 행 빈 곳, 펼침 단추, 행 안 인물 링크(행이 여닫히지 않음), 탭, 필터 칩, 테마 전환, Ctrl+클릭 새 탭.
- PR 15 는 이 PR 병합 뒤에 시작한다(지시문의 순서).
