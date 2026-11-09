# 2026-11-09 지시문 작성: PR 24~26 구조 정리

## 목적
구조 진단(graphify 그래프 + 소스 확인)에서 나온 리팩터링 3건의 구현 지시문을 쓴다. 이 세션은 코드를 고치지 않는다.
1. scripts/test.mjs(1719줄, 시험 169개) 모듈별 분리
2. js/model.js(526줄) 관심사별 분리
3. js/main.js(405줄) 상태·머리 틀·그리기·이벤트 분리

## 만든·바꾼 파일
- docs/instructions/PR24-test-split.md
- docs/instructions/PR25-model-split.md
- docs/instructions/PR26-main-split.md
- docs/instructions/README.md (표에 24~26 행 추가)

## 결정과 이유
- 기준은 origin/main `4c9ecec`(PR 23 병합). 로컬 main 과 같다.
- 순서는 시험 → model → main. 시험을 먼저 나눠야 뒤 두 PR 의 시험 추가가 작은 diff 로 들어간다.
- 세 PR 모두 동작을 바꾸지 않는다. 확인 방법:
  - PR 24: 시험 출력 줄 집합 비교
  - PR 25: 빌드 결과 diff, 내보내는 이름 목록 비교
  - PR 26: 브라우저 수동 점검
- model.js 는 다시 내보내기만 하는 파일로 남긴다. 가져다 쓰는 파일 18곳을 고치지 않아도 된다.
- 사적 함수 own·dayOf 는 tabs·people 두 파일이 같이 쓴다. 그래서 ids.js 에서 내보내되, model.js 로는 내보내지 않는다.
- main.js 의 모듈 변수는 state.js 의 `app` 객체 하나로 모은다.
- 버튼 → state 변경 부분은 순수 함수 applyButton 으로 꺼낸다. clickAction 과 같은 방식이고, 시험할 수 있다.
- index.html 은 그대로 js/main.js 를 불러온다. 기준 시각 줄은 예약 작업이 커밋하므로 손대지 않는다.

## 확인
- 함수 위치와 줄 번호, 가져다 쓰는 파일 목록은 grep 으로 확인했다.
- `node scripts/test.mjs` 는 169개가 통과했다(작성 전 실행).
- 지시문을 실행하지는 않았다.

## 남은 일
- docs/PROGRESS.md 절은 각 PR 을 구현할 때 넣는다.
- 지시문은 커밋하지 않았다.
- README.md 표의 22·23 행 사이에 빈 줄이 있어 표가 끊긴다. 이번에는 고치지 않았다.
