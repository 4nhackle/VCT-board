# PR 19 로스터 탭: 목록 디자인 (2026-11-09)

## 목적
지시문 `docs/instructions/PR19-roster-list-design.md` 대로 로스터 탭이 선수 탭의 "팀별로" 보기와 같은 목록 모양(`.rh` 지역 머리, `.th` 팀 머리, `ul.list > li.row`)을 쓰게 한다. 로스터 탭이 평문처럼 보이고 sticky 지역 머리와 바로가기 상자가 없던 문제를 고친다. 데이터는 바꾸지 않는다.

## 기준
- 기준: `origin/main` 66855fe. 지시문대로 `feat/roster-list-design` 을 `origin/main` 에서 땄다. `chore/docs-reorg-and-instructions` 에서 따지 않았다.
- 작업 자리: 이 체크아웃(`/Users/inkoo/coding/VCT-board`). 커밋하지 않았다.

## 바꾼 파일
- `js/views/roster.js`: `rosterHTML(cards, state)` 를 다시 썼다. 시그니처와 지역 거르기, 빈 메시지는 그대로다. 지역은 `REGIONS.concat("기타")` 순서로 묶고(`regionsHTML` 과 같은 규칙), 지역 머리는 `.rh`, 팀 머리는 `.th`(팀 링크 + `+i / −o`), 부분 정보는 `p.hint`, 인물은 `ul.list > li.row.roster`(이름 링크·역할, 선수/코치 표시)다. 빈 로스터는 `p.hint` 한 줄이다. 이름은 `nameHTML` 로 찍어 EN 페이지에서 KR 표시가 붙지 않게 했다. 고정 `dp-*` 블록은 더 이상 쓰지 않는다.
- `js/main.js`: 로스터 분기에서 `tab.hint`(`hint.roster`)를 앞에 붙인다. 이전에는 이 분기가 힌트를 건너뛰었다. `jumpList()` 는 그대로 호출되므로 이제 `.rh` 머리로 바로가기 상자가 채워진다.
- `css/style.css`: `.row.roster` 데스크톱 규칙(상태 레일 없음, 두 열)을 `.row.sch` 옆에 두었다. 600px 이하 미디어 블록에 `.row.roster` 로 영역을 `"main state"` 한 줄로 바꾸는 규칙을 추가했다.
- `js/i18n/ko.js`, `js/i18n/en.js`: `count.teams` 키 추가(`{n}팀` / `{n} teams`).
- `scripts/test.mjs`: 기존 `rosterHTML` 시험에 단언 추가. `class="rh"`, `class="th"`, `class="row roster"` 가 있고 `dp-sec` 은 없다. 지역이 `REGIONS` 밖인 카드는 `기타` 머리 아래 나온다.

## 결정과 이유
- `.hint + .list` 이중 테두리 확인은 브라우저가 필요해 규칙을 넣지 않았다(아래 참고).
- `dp-*` CSS 규칙은 지우지 않았다(팀 상세 페이지가 아직 쓴다).

## 확인 결과 (직접 실행)
- `node scripts/test.mjs`: 단위 시험 160개 통과.
- `node scripts/validate.mjs`: 오류 0, 경고 644(이전과 같음, `data/` 미변경).
- `node scripts/build.mjs _site`: 빌드 완료(인물 330쪽, 팀 350쪽 각각 한·영).
- 정적 서버(`python3 -m http.server 8093 --directory _site`)는 떠 있었다. 내장 브라우저 도구(Obscura)가 localhost 와 file:// 을 막아 화면을 열지 못했다(`--allow-private-network` 필요). 화면 확인은 하지 못했다.

## 확인하지 않은 것
- sticky 지역 머리, 바로가기 상자 목록, 지역 칩 거르기.
- 375px 레이아웃, 밝은·어두운 OS 테마.
- `/en/` 에서 KR 표시가 붙지 않는지(코드로만 확인: `nameHTML` 사용).
- `.hint + .list` 이중 테두리 여부.

## 화면 확인 (내장 브라우저, 정적 서버 `_site`)
- 1024 폭 `#roster`: `.rh` 4개(AMER·EMEA·PACIFIC·CN), `.th` 34개, `li.row.roster` 135개, `.dp-sec` 0개. 바로가기 상자 보임(머리 4개). 힌트 문구 보임. 가로 넘침 없음.
- 375 폭: 가로 넘침 없음(scrollWidth 375). 행 그리드 영역 `"main state"`, 두 열. 지역 머리·팀 머리·행이 한 줄씩 보인다.
- 375 폭 어두운 테마: 배경 rgb(15,19,24), 글씨와 선이 읽힌다.
- 부분 정보 팀(`p.hint` + `ul.list`): 첫 행 위 선 1px 하나, 이중 테두리 없음. `.hint + .list` 규칙은 추가하지 않았다.
- 지역 머리를 스크롤하면 위에 붙는다(sticky 동작 확인).
- 확인 못 한 것: `/en/` 페이지. 정적 서버에서 `/en/` 는 상대 경로 `data/` 를 `/en/data/` 로 찾아 404 가 난다(이 PR 과 무관한 기존 경로 문제, PROGRESS 의 BASE 메모 참고). 그래서 KR 표시가 붙지 않는지는 직접 보지 못했다(코드는 `nameHTML` 사용).
- 밝은 테마 375 폭과 키보드 조작은 직접 보지 않았다.

## 남은 일
- `/en/` 화면 확인: 데이터 경로가 맞는 환경(dev 서버 또는 배포 사이트)에서.
- 커밋·푸시·PR 은 사용자가 요청할 때 한다.
