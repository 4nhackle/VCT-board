# 2026-11-09 점검 결과 수정 지시문 (PR 27–29)

## 목적
2026-11-09 전체 점검(ponytail-audit)의 "Should fix"·"Nice to have" 항목을 고칠 지시문을 쓴다. 코드는 고치지 않았다.

## 만든 파일
- `docs/instructions/PR27-validate-row-rules.md` — 점검 1–3: 글자 날짜·모르는 팀 등급·이름 없는 행·빈 상태를 validate 오류로.
- `docs/instructions/PR28-today-refresh.md` — 점검 4: `TODAY` 를 그릴 때마다 다시 계산(`refreshToday`).
- `docs/instructions/PR29-small-cleanup.md` — 점검 6 일부·8: `esc` 하나로, `DAY_VALUES` 내보내기 제거.
- `docs/instructions/README.md` 목록에 세 줄 추가.

## 결정과 이유
- 점검 1: validate 에 날짜 검사가 이미 있었다(51행, 경고). 새 검사를 더하지 않고 경고를 오류로 올린다.
- 점검 2: 실제 데이터에 `tier: "other"`(운영 종료 팀 5개)와 등급 없는 팀(273개)이 있다. 둘 다 허용해야 한다. 점검 원안("TIERS 와 대조")대로면 배포가 멈춘다.
- 점검 3: 이름·상태 검사는 players·coaches 만. transfers 에는 status 가 없고, watch 에는 name 이 없다.
- 점검 4: ES 모듈 내보내기는 살아 있는 바인딩이라 `TODAY` 를 다시 대입하면 읽는 곳 15군데가 모두 새 값을 본다. 인자를 끌고 다니는 대신 설정 함수 하나로 끝낸다.
- 점검 5(renderRoute 순수 함수) 뺌: 목록·상세 판단은 이미 `parseRoute`·`listAction` 으로 순수 함수이고 state.test 에 시험이 있다. 남은 부분은 DOM 조작이라 순수 함수로 옮길 것이 없다.
- 점검 6 중 `read` 합치기 뺌: 네 개가 일부러 다르다(없으면 throw·기본값·null). 합치면 옵션이 붙고 3줄쯤 준다.
- 점검 7(시험 39초) 뺌: 이미 받아들일 만한 시간이고, 줄이려면 validate 를 프로세스 밖에서 부르는 구조 변경이 필요하다.
- 점검 9(`stampOf` 의 `_st`) 뺌: `js/model/notes.js:45` 가 줄인 비고의 복사본에 원래 `_st` 를 남기는 데 이 캐시를 쓴다. 지우면 보도 시각이 사라질 수 있다.

## 확인 결과
- 현재 `data/` 와 `scripts/fixtures/` 를 PR 27 규칙으로 점검: 글자 날짜 0, 이름 없는 선수·코치 0, 빈 상태 0. 팀 등급 값은 partner·ascended·challengers·academy·other·없음.
- `TODAY` 사용처, `esc`·`read` 중복, `DAY_VALUES` 사용처를 grep 으로 확인했다.

## 남은 일
- PR 27–29 실행(각각 새 세션). 모두 PR 26 병합 뒤, 서로는 독립.
