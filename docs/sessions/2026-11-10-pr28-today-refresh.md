# PR 28 "오늘" 날짜를 그릴 때마다 다시 잡기 (2026-11-10)

## 목적
지시문 `docs/instructions/PR28-today-refresh.md` 대로, 자정을 넘겨 열어 둔 탭도 오늘 날짜가 맞게 한다. 감사(2026-11-09) "Should fix" 4번.

## 기준
- 지시문은 `origin/main` 에서 따라고 했지만 PR 24–26 은 아직 병합 전이라 같은 작업 트리(`refactor/test-split`)에서 했다. 커밋하지 않았다.
- 지시문의 "사이트 코드 변경 전" 기준: 개발 서버 8080, 오늘 탭 9건(기준 시각 11/10 00:0x KST, 오늘 소식 없음 → 최근 11/8 로 표시).

## 바꾼 파일
- `js/format.js`: `export var TODAY;` + `export function refreshToday(now = Date.now())`(TODAY 를 새로 계산해 돌려준다) + 모듈 불러올 때 한 번 호출. `isNew` 는 그대로(주석 두 번째 문장을 그 줄에 두었다).
- `js/chrome.js`: `freshDay()` 를 새로 두었다(아래 "결정"). `renderChrome()` 첫 줄에서 호출.
- `js/render.js`: `renderView()` 와 `showDetail()` 첫 줄에서 `freshDay()` 호출.
- `scripts/test/format.test.mjs`: `refreshToday` 시험 한 개(23:59 KST 와 다음 날 00:00 KST 의 차이가 1, 가져온 `TODAY` 도 새 값, 마지막에 실제 날짜로 되돌림). 가져오기 줄에 `TODAY`, `refreshToday` 를 더했다.

## 결정과 이유 (지시문과 다른 부분)
1. 지시문만 따르면 오늘 탭은 그대로 남는다. 오늘 탭의 목록(`todayItems`)과 개수, 최근 날짜 표시(`fallbackDate`)는 `buildTabs` 가 앱을 열 때 한 번 정한다(`js/model/tabs.js:77`, `js/main.js:132`). 그래서 `freshDay()` 를 두었다. 날짜가 바뀌었을 때만 `app.TABS = buildTabs(app.D)` 로 다시 만든다. 날짜가 같으면 아무것도 하지 않는다.
2. 지시문의 확인 3번 방법(`refreshToday(Date.now() + 864e5)` 호출 후 탭을 바꾸기)은 맞지 않는다. 탭을 바꿀 때마다 `freshDay()` 가 실제 시각으로 다시 잡기 때문에 시험 값이 바로 지워진다. 대신 `Date.now` 자체를 바꿔서 확인했다(아래).

## 확인 결과 (직접 실행)
- `node scripts/test.mjs`: 종료 코드 0, `단위 시험 178개 통과`.
- `node scripts/validate.mjs`: 종료 코드 0, 오류 0.
- `node scripts/build.mjs <임시 폴더>`: 종료 코드 0.
- `grep -rn "TODAY =" js scripts`: `js/format.js` 의 `refreshToday` 안에 있는 한 줄뿐(시험 파일 제외).
- 브라우저(개발 서버 8080, 내장 브라우저 창). `Date.now` 를 바꾸고 탭을 바꿔 확인:
  - 실제 날짜(11/10 이 아닌 11/11 로 민 값 `+1일`): `TODAY` 가 46337(11/11)로 바뀌었다. 목록에 11/11 이 없어 "최근 11/8" 로 표시(같은 9건).
  - `−2일`(11/8): 오늘 탭 문구가 "오늘(KST) 보도된 …" 으로 바뀌고 "최근 11/8" 표시가 사라졌다(11/8 의 9건이 오늘 것으로 잡혔다). 실제 날짜로 돌아가면 다시 "최근 11/8". 탭 표시가 날짜와 함께 바뀌는 것을 확인했다.
  - 콘솔 오류 없음.

## 남은 일
- 커밋·PR 생성 없음(요청 시). 병합은 PR 26 뒤.
- 감사의 다른 항목(시트 검사)과 관계없이 독립이다.
- `docs/PROGRESS.md` 에 요약 절, `docs/instructions/README.md` 의 PR 28 행에 "완료" 표시.
