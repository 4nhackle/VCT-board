# PR 18 지켜볼 팀 행: 긴 상황 글 접기 (2026-11-09)

## 목적
지시문 `docs/instructions/PR18-watch-row-fold.md` 대로 지켜볼 팀 행은 첫 조각(최신 갱신)만 보이고, 나머지 조각과 출처는 펼침 영역에 둔다. 데이터는 바꾸지 않는다.

## 기준
- 기준: `origin/main` 826fab5 (PR 17 #49 병합 뒤). 지시문의 기준 c5cd56b 는 그 전 커밋이다.
- 작업 자리: `git worktree` `C:\Users\idisi\coding\VCT-board-pr18`, 브랜치 `feat/watch-row-fold`.

## 바꾼 파일
- `js/components/row.js`: 펼침 단추와 영역을 만드는 `foldHTML(detail)` 를 뽑았다. 엔트리 행(`rowHTML`)과 지켜볼 팀 행(`watchHTML`)이 함께 쓴다. 엔트리 행 출력은 그대로다. `watchHTML` 은 `sp.body` 를 첫 `" / "` 에서 나눈다. 첫 조각은 `<p class="detail head">`, 나머지와 출처 줄은 펼침 영역에 든다. 내용이 없으면 단추도 영역도 없다.
- `css/style.css`: `.row.watch > .row-x` 는 오른쪽 열 첫 줄에 둔다(데스크톱). 접혀 있는 동안만 `.head` 를 두 줄로 자른다. 600px 이하에서는 단추를 오른쪽 끝에 둔다.
- `scripts/test.mjs`: 지켜볼 팀 `rowHTML` 시험 1개 추가(첫 조각만 보임, 나머지와 출처는 영역 안, 조각·출처가 없으면 단추 없음).

## 결정과 이유
- 펼침 단추 자리를 `grid-column: 2; grid-row: 1 / span 2` 로 고정했다. 이름 줄 오른쪽에 붙이려는 것이다. 엔트리 행 CSS 는 건드리지 않았다.
- 클램프는 `:has(> .row-x[aria-expanded="false"])` 로 접힌 동안만 건다. 펼치면 규칙이 빠져 전체가 보인다. 그래서 펼친 상태용 규칙은 따로 두지 않았다.
- `shortcut:` 주석: 첫 조각이 최대 345자이므로 CSS 두 줄 자르기를 함께 쓴다. 캡션 칸은 이번 PR 범위 밖이다.

## 확인 결과 (직접 실행)
- `node scripts/test.mjs`: 시험 159 → 160 통과(지켜볼 팀 `rowHTML` 시험 1개 추가).
- `node scripts/validate.mjs`: 종료 0, 오류 0, 경고 644(이전과 같음, `data/` 미변경).
- `node scripts/css-check.mjs`: 통과.
- `node scripts/build.mjs _site`: 빌드 완료.
- 내장 브라우저(`#watch`, 1280×900, 8082 = 병합 전 main, 8083 = PR 18):
  - 페이지 높이: 병합 전 7777px → PR 18 4347px (1280 폭).
  - 가장 긴 조각(345자 머리): 접힘 `clientH` 50 (두 줄, `scrollH` 149), 펼침 `clientH` 149.
  - 단추 클릭: `aria-expanded` true/false 전환, 영역 `hidden` 토글, 영역 글에 `이전: …` 표시.
  - 375 폭: 가로 넘침 없음, 단추가 행 오른쪽 끝, 머리 아래.
- 확인하지 않은 것: 팀 링크 클릭이 행을 접었다 펴지 않는지(클릭 판정은 `clickAction` 의 링크 우선 규칙에 맡겼다. 자동 시험은 없다). Tab·Enter 키 조작. EN 행의 잘린 조각 점검.

## 남은 일
- 팀 링크 클릭과 키보드 조작 직접 확인(사용자 확인 필요할 수 있음).
- EN 행에서 잘 읽히지 않는 첫 조각 목록 보고(데이터는 고치지 않는다).
