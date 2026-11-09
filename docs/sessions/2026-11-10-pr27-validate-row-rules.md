# PR 27 validate: 글자 날짜·알 수 없는 등급·이름 없는 행·상태 없는 행을 오류로 (2026-11-10)

## 목적
지시문 `docs/instructions/PR27-validate-row-rules.md` 대로, 배포를 막아야 할 네 가지 나쁜 데이터를 경고가 아니라 오류(종료 코드 1)로 만든다. 감사(2026-11-09) "Should fix" 1–3번.

## 기준
- 지시문은 `origin/main` 에서 따라고 했지만, PR 24–26 은 아직 병합되지 않았다. 그래서 이 PR 도 같은 작업 트리(`refactor/test-split`)에서 했다. 커밋하지 않았다.
- `data/` 와 `scripts/fixtures/` 는 건드리지 않았다. 시작 전에 네 규칙을 현재 데이터에 대고 셌다: 이름 없는 선수·코치 0, 상태 없음 0, 글자 날짜 0(선수·코치·이적·지켜볼 팀), 등급: partner 32, challengers 28, academy 10, ascended 2, other 5, 없음 273. 모두 통과.

## 바꾼 파일
- `scripts/validate.mjs`:
  - import 에 `TIERS` 추가.
  - `nameOk` 를 행 검사 반복문 위로 옮겼다(두 번째 복사본은 지웠다).
  - 날짜: `warn` → `errors.push`, 문장 끝에 "시트의 날짜 칸을 날짜 형식으로 바꾸세요" 를 붙였다.
  - `players`·`coaches` 행: 이름이 비면 "이름이 비어 있습니다", 상태가 문자열이 아니거나 빈 글이면 "상태가 비어 있습니다. 시트의 상태 칸을 채우세요".
  - `teams`: `tier` 가 없거나 `TIERS` 에 있거나 `"other"` 면 통과, 그 밖은 "등급 … 을(를) 알 수 없습니다 (partner·ascended·challengers·academy·other 중 하나)".
- `js/model/labels.js:9`: `var TIERS` → `export var TIERS`.
- `js/model.js` (배럴): `TIERS` 를 `tierName` 옆에 다시 내보냈다. 지시문의 "변경은 validate.mjs, labels.js, tools.test.mjs 만" 과 "js/model.js 에서 다시 내보낸다" 가 서로 맞지 않아서, 다시 내보내기 쪽을 따랐다. 배럴 한 줄만 바뀌었다.
- `scripts/test/tools.test.mjs`: `validateFixture` 에 선택 인자 `teams`(기본 `[]`)를 추가했다. 시험 네 개를 더했다: 글자 날짜, 이름 없음, 상태 없음·공백, 등급(legend 는 오류, other·없음은 통과).

## 결정과 이유
- 등급의 `null` 은 "없음"으로 치지 않는다(`!== undefined` 로 검사). 지시문은 "없으면 통과"라고만 했고, `null` 은 시트 칸이 지워진 모양이라 고치게 하는 쪽을 골랐다.
- 이름·상태 규칙은 `players`·`coaches` 에만 건다(지시문대로). `transfers`(상태 칸 없음)와 `watch`(이름 칸 없음)는 뺐다.

## 확인 결과 (직접 실행)
- `node scripts/test.mjs`: 종료 코드 0, `단위 시험 178개 통과`(PR 28 시험 한 개가 함께 들어 있다).
- `node scripts/validate.mjs`(실제 `data/`): 종료 코드 0, 오류 0.
- `node scripts/validate.mjs scripts/fixtures`: 종료 코드 0.
- `node scripts/build.mjs <임시 폴더>`: 종료 코드 0.

## 시트 담당자에게 알릴 것 (지시문의 위험 항목)
이제부터 시트의 날짜 칸이 글자이거나 상태 칸이 비면 배포가 멈춘다. 경고만 나오던 때와 다르다. CI 실패 메시지에 시트의 행(파일과 몇 번째 행인지)이 적혀 나온다.

## 남은 일
- 커밋·PR 생성 없음(요청 시). 병합 순서는 PR 24 → 25 → 26 → 27 → 28 → 29 (27·28·29 는 PR 26 병합 뒤).
- `docs/PROGRESS.md` 에 요약 절을 붙였다. `docs/instructions/README.md` 의 PR 27 행에 "완료"를 표시했다.
