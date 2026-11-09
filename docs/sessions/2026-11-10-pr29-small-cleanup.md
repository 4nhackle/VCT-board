# PR 29 작은 정리: esc 하나로, DAY_VALUES 비공개 (2026-11-10)

## 목적
지시문 `docs/instructions/PR29-small-cleanup.md` 대로, 감사(2026-11-09) 6번과 8번 중 지시문에 적힌 부분만 한다.

## 기준
- 지시문은 `origin/main` 에서 따라고 했지만 PR 24–26 은 아직 병합 전이라 같은 작업 트리(`refactor/test-split`)에서 했다. 커밋하지 않았다.
- 비교 기준 빌드: 바꾸기 전 현재 트리를 `build.mjs` 로 만든 결과(임시 폴더).

## 바꾼 파일
- `scripts/i18n-html.mjs`: 자체 `esc` 를 지우고 `import { esc } from "../js/format.js";` 를 넣었다.
- `js/state.js:27`: `export var DAY_VALUES` → `var DAY_VALUES`. 쓰는 곳은 `state.js` 안(31줄)뿐이라는 것을 `grep -rn DAY_VALUES js scripts` 로 확인한 뒤에 바꿨다.

## 지시문의 "하지 말 것" (그대로 두었다)
- 네 `read` 도우미는 합치지 않았다(각각 다른 방식으로 실패한다).
- `js/format.js` 의 `stampOf` 의 `it._st` 캐시는 지우지 않았다(`js/model/notes.js` 가 그 값을 복사해 쓴다).

## 확인 결과 (직접 실행)
- `node scripts/test.mjs`: 종료 코드 0, `단위 시험 178개 통과`.
- `node scripts/validate.mjs`: 종료 코드 0, 오류 0. `node scripts/css-check.mjs`: 종료 코드 0.
- 빌드 전후 비교(같은 날, 같은 트리에서 두 번): `diff -r -x js <전> <후>` 차이 없음. `js/` 만 다르고, 그 차이는 `DAY_VALUES` 의 `export` 한 줄뿐이다(`diff -r` 결과 확인).
- `esc` 차이(`null`/`undefined` 를 빈 글로 바꿈)는 지금 데이터의 빌드 출력에 영향이 없었다(위 비교).

## 남은 일
- 커밋·PR 생성 없음(요청 시). 병합은 PR 26 뒤.
- 지시문의 확인 2번("main 과 브랜치를 같은 날 빌드해 비교")은 이 작업 트리에 `origin/main` 이 따로 없어, 바꾸기 전 빌드와 바꾼 뒤 빌드로 대신했다. 병합 뒤에 `main` 과 한 번 더 비교하면 된다.
- `docs/PROGRESS.md` 에 요약 절, `docs/instructions/README.md` 의 PR 29 행에 "완료" 표시.
