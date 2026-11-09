# PR 26 js/main.js 나눔 (2026-11-09)

## 목적
지시문 `docs/instructions/PR26-main-split.md` 대로 `js/main.js`(405줄)를 나눈다. 상태는 `js/state.js` 에 모으고, 버튼이 상태를 바꾸는 규칙은 화면과 떨어진 순수 함수 `applyButton` 으로 뺀다. 화면과 주소·기록 동작은 바꾸지 않는다.

## 기준
- PR 24·25 와 같은 작업 트리에서 이어 했다. PR 24·25 는 아직 커밋·병합 전이다. 이 PR 의 파일은 `js/state.js`, `js/main.js`, `js/chrome.js`, `js/render.js`, `scripts/test/state.test.mjs` 다.
- 나누기 전 기준 사본: `git show HEAD:js/main.js`(원본). 비교 서버는 원본 js 를 쓴 사본(8081)과 나눈 현재 트리(8080)다.

## 바꾼 파일
- `js/state.js`: `export var app`(D, TABS, IDX, view, fromList; 원래 main 의 모듈 변수 다섯 개를 대신한다), `export function tabById`(main 에서 옮김, `app.TABS` 를 읽음), `export function applyButton(state, data)`(클릭 처리의 상태 변경 가지를 옮김: 탭·지역·상태·파트너·정렬. 해당 없으면 null, 아니면 `{ tabChanged, filterChanged }`).
- `js/chrome.js` (150줄): 목록 화면의 틀. `$`, 상태 칩 이름, `DETAIL_HIDE`, `renderChrome`, `jumpList`, 거르기 칸(`FX`, `fieldBox`, `buildFilters`, `syncFilters`), `syncHash`, `langLinks`, `detailChrome`, `dock`. `FX` 는 이 파일 안에서만 쓴다.
- `js/render.js` (124줄): `renderView`, `keepList`, `savedList`, `renderRoute`, `showDetail`. 주소에 맞춰 목록과 상세 중 무엇을 그릴지 고른다.
- `js/main.js` (139줄): 시작과 이벤트만. `FILES`, `OPTIONAL`, `isDetailLink`, `toggleRow`, 클릭·변경 리스너, 스크롤·`#jump`·`hashchange`·`popstate`·`#q` 리스너, `localizeStatic`, 머리말 KST 걷기, `load`, `Promise.all` 부팅.
- `scripts/test/state.test.mjs`: `applyButton` 시험 네 개(clickAction 시험 뒤). 지시문의 다섯 항목을 네 개로 묶었다(탭과 같은 탭 / 지역·상태 / 파트너·정렬 / 맨 위로·빈 값).
- `index.html` 은 건드리지 않았다(`js/main.js` 를 그대로 부른다).

## 결정과 이유 (지시문과 다른 부분)
1. `main.js` 의 최상위 `var` 세 개(`FILES`, `OPTIONAL`, `LEDE`)를 `const` 로 바꿨다. 지시문의 확인 명령 `grep -nE "^(var|let) " js/main.js` 가 빈 결과여야 해서다. 값과 쓰임은 같다. `FILES`·`OPTIONAL` 은 상태가 아니라 설정이라 `state.js` 로 옮기지 않았다.
2. `chrome.js` 의 `var FX` 는 최상위 `var` 로 남았다(지시문의 확인은 `main.js` 만 본다). 이 파일 안에서만 쓰는 값이다.
3. 클릭 처리에서 `data.top`(맨 위로)은 화면 쪽에 그대로 두었다. 상태를 바꾸지 않는다(지시문대로).
4. 내보내는 이름은 필요한 것만 열었다. `chrome.js`: `$`, `DETAIL_HIDE`, `jumpList`, `renderChrome`, `syncHash`, `langLinks`, `detailChrome`, `dock`. `render.js`: `renderView`, `keepList`, `renderRoute`. 나머지는 파일 안에 둔다.
5. 가져오기 방향은 `main → render → chrome → state` 한 방향이다. `chrome.js` 는 render 를 가져오지 않는다. `renderView` 가 `jumpList` 를 부르므로 `jumpList` 는 chrome 에 두고 render 가 가져간다.

## 확인 결과 (직접 실행)
- `node scripts/test.mjs`: 종료 코드 0, `단위 시험 173개 통과`(169 + 시험 4).
- 가져오기 방향: `grep -n "^import" js/chrome.js js/render.js js/main.js js/state.js`. `chrome.js` → `state.js`; `render.js` → `chrome.js`, `state.js`; `main.js` → `render.js`, `chrome.js`, `state.js`. 거꾸로 가는 것 없음.
- `grep -nE "^(var|let) " js/main.js js/render.js js/state.js`: 없음. (`chrome.js` 의 `var FX` 는 위 결정 2.)
- 원문 대조: `js/main.js` 원문 14–405줄의 빈 줄 아닌 줄을 정렬해 새 세 파일과 비교했다. 차이는 (a) `app.*` 이름 바꾸기, (b) 클릭 처리 꼬리를 `applyButton` 호출로 바꾼 것, (c) `export` 붙인 것, (d) `var`→`const` 세 곳, (e) 새 한 줄 주석 세 개, (f) 옮긴 주석 한 줄이다. 빠진 줄 없음.
- `node scripts/build.mjs /tmp/site-after26`: 종료 코드 0. `diff -r -x js` 로 원본 빌드와 비교: 차이 없음.
- `node scripts/validate.mjs`: 종료 코드 0, 오류 0. `node scripts/css-check.mjs`: 종료 코드 0.
- 브라우저(나눈 트리 8080 과 원본 js 사본 8081 을 같은 순서로 눌러 비교):
  - Obscura 브라우저는 `127.0.0.1` 을 막는다(SSRF 보호). 그래서 내장 브라우저 창으로 확인했다.
  - 한국어 `/`: 아홉 탭 각각 `#view` HTML 해시, 요약 칩 개수, 주소, 제목이 두 빌드에서 같다. 지역 칩, 상태 칩, 파트너 단추(`?vct=1`), 정렬 단추(`?sort=recent`)를 눌러도 같다.
  - 영문 `/en/`: 아홉 탭이 같다. 인물 상세(`/en/p/tenz/`)를 목록 링크로 열고 "← 목록으로"로 돌아오면 목록 해시와 화면이 원본과 같다(`#players`).
  - 건의 탭: 글을 쓰고 다른 탭에 갔다 오면 글이 남는다(나눈 트리에서 확인).
  - 콘솔: 새로 생긴 오류 없음(외부 Cloudflare 수집 요청 오류만 있고, 이것은 원본에도 있다).
- 알려진 것(이 PR 과 무관): 건의 탭을 탭으로 열면 본문에 일정 글이 보이던 현상은 원본에도 있다(PR 25 기록 참고).

## 남은 일
- 커밋·PR 생성 없음(요청 시 진행). 병합 순서는 PR 24 → 25 → 26.
- 병합 시각은 예약 작업 앞뒤 30분을 피한다(CLAUDE.md).
- `docs/PROGRESS.md` 에 PR 25·26 요약 절을 붙였다.
