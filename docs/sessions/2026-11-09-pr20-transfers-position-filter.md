# PR 20 이적 완료 탭 포지션 거르기 (2026-11-09)

## 목적
지시문 `docs/instructions/PR20-transfers-position-filter.md` 대로 이적 완료 탭에도 선수 탭과 같은 포지션 칸으로 거른다. 이적 행에는 포지션이 없어서, 인물 정보(`people`)의 역할을 채워 쓴다. 데이터는 바꾸지 않는다.

## 기준
- 기준: `origin/main` 363f1d3 (PR 19 #51 병합 뒤). 지시문이 PR 19 병합 뒤 시작을 정해서, PR 19 를 먼저 병합했다(사용자 요청).
- 작업 자리: 이 체크아웃, 브랜치 `feat/transfers-position-filter`. 커밋하지 않았다.

## 바꾼 파일
- `js/model.js` `buildTabs`: 선수 이적 `T1` 을 `items(...)` 뒤에 한 번 더 map 해서 `sub` 을 인물 역할·국적으로 채운다. `mergeMoves` 는 `T1.indexOf(mv)` 로 같은 객체를 찾으므로, 이 map 을 `mergeMoves` 호출 전에 한다. 코치 이적 `T2` 는 그대로다.
- `js/model.js` `matches`: 포지션 조건에서 `tab.id !== "transfers"` 를 뺐다. 주석도 바꿨다. 코치 탭·지켜볼 팀은 여전히 거르지 않는다.
- `js/main.js` `syncFilters`: `use.pos` 에 `tab.id === "transfers"` 를 더했다. 주석도 바꿨다.
- `scripts/test.mjs`: 기존 이적 탭 단언(146행)을 뒤집었다(`Initiator` 는 false, `Duelist` 는 true). 새 시험 하나: 인물 역할이 `Duelist` 인 이적 행은 `sub` 이 `Duelist` 로 시작하고 포지션 거르기를 통과한다, 인물 정보가 없는 행은 `sub` 이 `""` 이고 포지션 거르기에서 빠진다, 선수 탭에는 그 인물이 한 번만 든다.

## 결정과 이유
- `mergeMoves` 의 끝부분(`Object.assign` 으로 `sub` 을 다시 채우는 줄)은 그대로 두었다. 해가 없고 diff 가 작다.
- 이적 행에 포지션이 채워지면서 이적 행에 메타 줄(`Duelist, Japan`)이 보인다. 지시문이 의도한 변화다.
- 포지션 거르기를 켜면 코치 이적 그룹(`T2`)은 빈 그룹이 되어 `<h2 class="kind">` 가 빠진다. 이것도 지시문이 정한 대로다.

## 확인 결과 (직접 실행)
- `node scripts/test.mjs`: 단위 시험 161개 통과(160 → 161).
- `node scripts/validate.mjs`: 오류 0, 경고 640(이전 644 에서 줄었다. 데이터 미변경).
- `node scripts/build.mjs _site`: 빌드 완료(인물 331쪽, 팀 350쪽 각각 한·영).
- 내장 브라우저, 정적 서버 `_site`, 1024 폭:
  - `#transfers?pos=Duelist`: 포지션 칸 값 `Duelist`, 사용 가능. 그룹은 `선수` 하나만 보임(코치 그룹 빠짐), 행 15개.
  - `#transfers` (거르기 없음): 행 86개, 그룹 `선수`·`코치·스태프` 둘.
  - `#players?pos=Duelist`: 포지션 칸 값 `Duelist` 유지, 행 21개.
- 가로 넘침: 1009 < 1024 (넘치지 않음).

## 확인하지 않은 것
- 지역 거르기와 VCT 파트너 거르기를 같이 켰을 때의 조합(지시문 2번 중 뒷부분).
- 375 폭.

## 남은 일
- 커밋·푸시·PR 은 사용자가 요청할 때 한다.
- 지역·파트너 조합 확인.
