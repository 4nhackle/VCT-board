# PR 24 시험 파일 나눔 (2026-11-09)

## 목적
지시문 `docs/instructions/PR24-test-split.md` 대로 `scripts/test.mjs`(1719줄, 시험 169개)를 모듈별 파일로 나눈다. 시험 내용과 이름은 바꾸지 않는다. 실행 명령(`node scripts/test.mjs`)은 그대로다.

## 기준
- `origin/main` 4c9ecec 에서 `refactor/test-split` 브랜치를 땄다. 커밋하지 않았다.
- 나누기 전 기준: `node scripts/test.mjs > /tmp/before.txt` → `단위 시험 169개 통과`, 종료 코드 0.
- PR 25(model 나누기)와 PR 26(main 나누기)은 CLAUDE.md 규칙 2(용도마다 세션)에 따라 이 세션에서 하지 않았다.

## 바꾼 파일
- `scripts/test.mjs`: 시험 본문을 빼고 실행기로 줄였다(10줄). 여섯 파일을 format → model → state → views → i18n → tools 순서로 읽고 `count()` 로 합계를 낸다.
- `scripts/test/helpers.mjs` (새 파일): `T`, `t()`, `count()`, 그리고 두 파일 이상이 쓰는 `RT`(로스터 시험 값)와 `serialOf`.
- `scripts/test/format.test.mjs` (15개), `model.test.mjs` (78), `state.test.mjs` (5), `views.test.mjs` (24), `i18n.test.mjs` (15), `tools.test.mjs` (32). 합 169.
- `README.md`: 시험 파일 위치를 설명하는 한 단락을 추가했다. 명령은 바꾸지 않았다.
- `docs/instructions/README.md`: 24~26 행이 이미 있어 추가하지 않았다(이 체크아웃에서 이미 수정 상태였다).
- `docs/PROGRESS.md`: 이 회차 요약 한 절을 끝에 붙였다.

## 결정과 이유
- 옮기기는 생성 스크립트로 했다. 최상위 덩어리(주석 포함 시험 한 개 또는 픽스처 한 개)를 원문 그대로 옮겼다. 시험 본문과 주석은 글자 그대로다.
- 덩어리 배치는 시험이 주로 확인하는 함수 기준이다. 두 모듈에 걸친 시험은 상위 계층 쪽에 두었다(views > model > format).
- `VALIDATE_PATH`, `VALIDATE_JS`, `VALIDATE` 는 `tools.test.mjs` 의 `VALIDATE` 한 상수로 합쳤다(지시문의 유일한 이름 변경).
- 경로: `new URL("./x")` → `new URL("../x")`(scripts/test/ 기준), 저장소 루트를 가리키던 `new URL("../x")` → `new URL("../../x")`.
- 중복 import 줄(`model.js` 두 줄 등)은 파일마다 쓰는 이름만 남겨 하나로 합쳤다.
- `row`, `career` 는 여러 파일에서 이름이 보였지만 각 파일의 지역 변수·인자였다. 그래서 `helpers.mjs` 에 넣지 않고 `model.test.mjs` 에 그대로 두었다.
- 시험 실행 순서가 바뀌었다(파일 단위). 언어 설정(`setLang`)은 각 시험이 되돌리므로 전체 결과는 같다.

## 확인 결과 (직접 실행)
- `node scripts/test.mjs` (나눈 뒤): 종료 코드 0, `단위 시험 169개 통과`.
- `diff <(grep '^ok ' /tmp/before.txt | sort) <(grep '^ok ' /tmp/after.txt | sort)`: 차이 없음. `ok` 줄 169개가 같다.
- 파일마다 실패 시험을 넣음(`t("BREAK-CHECK", () => { assert.equal(1, 2, "BREAK-CHECK"); });`) → 여섯 파일 모두 종료 코드 1, 표준 오류에 `BREAK-CHECK` 한 번. 원본으로 되돌린 뒤 종료 코드 0.
- `node scripts/validate.mjs`: 종료 코드 0, 오류 0, 경고 648.
- `node scripts/build.mjs _site`: 종료 코드 0, 빌드 완료(인물 331쪽, 팀 350쪽, 각각 한·영).
- 표준 오류에 Node 의 `MODULE_TYPELESS_PACKAGE_JSON` 경고와 용어집 경고가 나온다. 나누기 전 실행에도 같은 경고가 있었다.
- 화면 변경 없음. 브라우저 점검은 이 PR 범위가 아니다.

## 남은 일
- 커밋과 PR 생성은 하지 않았다. 사용자가 요청하면 `refactor/test-split` 에서 커밋한다.
- 병합 순서 PR 24 → PR 25 → PR 26. PR 25, 26 은 각각 새 세션에서 한다.
- 병합 시각은 예약 작업 시각 앞뒤 30분을 피한다(CLAUDE.md). 11/16 까지는 14:50·15:35·20:50·21:35 KST 를 피한다.
