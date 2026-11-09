# PR 21 최근 소식순 단추 되살리기 (2026-11-09)

## 목적
지시문 `docs/instructions/PR21-recent-order-toggle.md` 대로 선수·코치·한국·이적 목록 탭에 "최근 소식순" 단추를 다시 둔다. 켜면 날짜순(최신 먼저), 끄면 팀별(기본). 주소의 `sort=recent` 로 기억해 새로 고침과 공유 주소에서도 유지된다. 데이터는 바꾸지 않는다.

## 기준
- 기준: `origin/main` ca76541 (PR 20 #52 와 기록 PR #53 병합 뒤).
- 작업 자리: 이 체크아웃, 브랜치 `feat/recent-order-toggle`. 커밋하지 않았다.

## 바꾼 파일
- `js/state.js`: `state.order` 기본 `"team"`. `filtersOf` 가 `sort=recent` 를 `order: "recent"` 로 읽고, 그 밖의 값은 `"team"`. `queryOf` 는 `vct` 뒤에 `sort=recent` 를 붙인다(팀별이면 붙이지 않는다). `listAction` 은 그대로다. 키 비교에 `order` 가 들어가 정렬만 바뀌어도 `refilter` 가 된다.
- `js/main.js`:
  - `buildFilters`: `FX.order` 단추(`chip toggle`, `data-order`)를 VCT 파트너팀 단추 뒤에 붙인다.
  - `syncFilters`: 선수·코치·한국·이적 목록 탭에서만 켠다(`is-off`, `disabled`). 오늘 탭과 나머지 탭은 자리만 남긴다. `aria-pressed` 는 정렬 상태를 따른다.
  - 클릭: `data-order` 단추면 `state.order` 를 뒤집고 `filterChanged` 를 켠다(`syncHash` 가 주소를 고친다).
  - `renderView`: `recent = tab.mode === "entry" && (tab.id === "today" || state.order === "recent")`. 날짜순은 탭 묶음(선수·코치 그룹)마다 따로 그려 `h2.kind` 아래 날짜순이다.
- `js/i18n/ko.js`, `js/i18n/en.js`: `order.recent` 만 추가(`최근 소식순` / `Latest news`).
- `scripts/test.mjs`: `filtersOf` 기대값 여섯 곳에 `order: "team"` 을 넣었다. 새 단언: `sort=recent` 읽기, `sort=junk` 는 `team`, `queryOf` 의 `?sort=recent` 와 `vct` 뒤 순서, 팀별은 주소에 안 씀, `listAction` 에서 정렬만 바뀌면 `refilter`.

## 결정과 이유
- 날짜순 그룹은 `recentHTML` 을 그룹마다 한다. 한국·이적 탭의 선수/코치 머리는 그대로 남는다(지시문대로 묶지 않음).
- 설계 문서 `docs/툴바-정리-설계-2026-11.md` 에 "PR 21 이 정렬을 단추로 되살린다" 한 줄을 넣으라는 지시가 있었다. 이 저장소에는 그 파일이 없어(`docs/` 아래 찾을 수 없음) 넣지 않았다. 파일 위치를 알려 주면 그 한 줄을 넣는다.
- `order.team`, `order.freshTitle`, `order.freshCount`, `hint.recent` 는 다시 넣지 않았다. 지시문대로다.
- 옛 `localStorage` `vct-order` 는 읽지도 지우지도 않는다.

## 확인 결과 (직접 실행)
- `node scripts/test.mjs`: 단위 시험 161개 통과. 기존 시험 안에 단언을 더했다(새 `t()` 시험은 없음).
- `node scripts/validate.mjs`: 오류 0, 경고 640(데이터 미변경).
- `node scripts/build.mjs _site`: 빌드 완료(인물 331쪽, 팀 350쪽 각각 한·영).
- 내장 브라우저, 정적 서버 `_site`, 1024 폭:
  - `#players`: 단추 꺼짐, 첫 행 `TenZ`·`Jackk`·`OXY`. 누르면 `#players?sort=recent`, `aria-pressed` `true`, 첫 행 `Aace`·`keiko`·`Zellsis`, 날짜 머리(`어제` 등) 보임.
  - `#players?sort=recent` 새로 열기: 단추 켜짐 유지.
  - 상세 열고 "← 목록으로": 주소 `#players?sort=recent` 로 돌아오고 단추 켜짐, 행 160.
  - `#today`, `#roster`: 단추 `disabled`, `is-off`.
  - `#transfers?sort=recent&pos=Duelist`: 단추 켜짐, 포지션 `Duelist`, 선수 그룹 하나, 행 15. 정렬과 포지션이 같이 먹는다.
- 375 폭: 문서 가로 넘침 없음(scrollWidth 375). `#fx` 줄은 원래도 375 보다 넓어(450) `bar b2` 안에서 가로로 밀린다. 새 단추는 그 안, 파트너 단추 뒤다. 새로 생긴 넘침이 아니다.

## 확인하지 않은 것
- 375 폭에서 단추를 실제로 눌러 보기(가로로 밀린 줄 안이라 화면에서는 잘려 보인다).
- 지역 칩과의 조합.

## 남은 일
- 설계 문서 한 줄(위 결정 참고): 파일 위치 확인 뒤.
- 커밋·푸시·PR 은 사용자가 요청할 때 한다.
