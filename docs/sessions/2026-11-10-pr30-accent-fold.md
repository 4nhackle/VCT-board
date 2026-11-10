# 2026-11-10 PR 30 후속 — 검색이 악센트를 무시한다

요청: "PR30에서 악센트를 무시하도록 해."
브랜치: `feat/search-current-team` (PR 30 커밋 `c82dd1e`, `e8a5c1f` 위). 커밋하지 않았다.

## 바꾼 파일

- `js/model/ids.js`: `fold(s)` 추가. 소문자 → NFD → 결합 기호(`̀-ͯ`) 제거 → NFC. `ı`→`i`, `ł`→`l` 은 따로 바꾼다.
- `js/model.js`: `fold` 를 barrel 에서 내보낸다.
- `js/model/tabs.js`: `matches()` 가 글 묶음과 검색어를 모두 `fold()` 로 맞춘다. 위치 거르기(`state.pos`)는 검색이 아니라서 그대로 두었다.
- `js/views/roster.js`: `searchCard()` 의 `has` 와 `rosterHTML()` 의 검색어를 `fold()` 로 맞춘다.
- `scripts/test/model.test.mjs`: "악센트는 무시하지 않는다(현재 동작)" 시험을 뒤집었다(`Jóhn`/`john` 이 이제 맞다). 악센트 있는 검색어, `Łukasz`, `Işık`, 한글 가/각 시험을 더했다.
- `scripts/test/views.test.mjs`: 로스터 검색 시험 추가(인물 이름 `Jóhn`, 팀 별칭 `Équipe Nord`).
- `docs/PROGRESS.md`: PR 30 절에 후속 한 줄.

## 결정과 이유

- **`slugOf` 는 고치지 않았다.** 인물·팀 ID 를 만드는 함수라 URL 이 바뀐다. 검색 맞춤과 따로 둔다.
- **NFC 로 다시 붙인다.** NFD/NFKD 만 쓰면 한글 음절이 낱자로 쪼개져 `가` 가 `각`, `간` 에 맞는다. 시험 `가 는 각 에 안 맞는다` 로 막았다.
- **`ı`·`ł` 만 명시 매핑.** 시트 데이터(`data/*.json`, 문자열 11,259개)를 전부 훑어, 접은 뒤 남는 한글·ASCII 밖 글자를 확인했다. 남는 라틴 글자는 `ı`(1)와 `ł`(1)뿐이었다. 나머지(`·`, `→`, 한자, 기호)는 악센트가 아니라 그대로 둔다.
- **한계:** `ø`, `đ`, `ß` 는 데이터에 없어 매핑하지 않았다. 나오면 `fold()` 의 매핑에 한 글자씩 더한다.

## 확인 결과 (직접 실행)

- `node scripts/test.mjs` → `단위 시험 181개 통과`, 종료 코드 0 (PR 30 때 180개, 로스터 시험 1개 추가).
- `node scripts/validate.mjs` → 종료 코드 0, 오류 0, 경고 639 (PR 30 때와 같은 수준; 데이터는 바꾸지 않았다).
- `node scripts/css-check.mjs` → 스타일 점검 통과.
- `node scripts/build.mjs _site` → 빌드 완료 (`_site` 는 `.gitignore` 대상).

## 남은 일

- 커밋·푸시는 하지 않았다. 요청 시 `feat/search-current-team` 에 커밋한다.
- 작업 트리에 이 작업과 무관한 변경이 있다: `docs/instructions/README.md` (1줄 수정), `docs/instructions/PR31-search-name-team-only.md` (새 파일). 세션 시작 때 `git status` 에는 `.archify/` 만 있었고, 이 둘은 작업 중에 다른 쪽에서 생겼다. 이번 변경과 무관하므로 커밋에 넣지 않는다.
- PR 31 지시문(`docs/instructions/PR31-search-name-team-only.md`)은 악센트 무시를 따르도록 고쳤고, 구현은 `docs/sessions/2026-11-10-pr31-search-name-team-only.md` 에 기록했다. 지시문의 `matches()` 줄은 `fold()` 를 쓴다.
- 검색어를 읽는 곳은 `js/model/tabs.js:119-121`(`matches`)과 `js/views/roster.js:18`(`rosterHTML`)뿐이다(`js/` 전체 grep 으로 확인). `chrome.js`·`render.js` 는 `matches()` 를 거친다.
- `.archify/` 는 PR 30 때와 같이 커밋하지 않는다.
