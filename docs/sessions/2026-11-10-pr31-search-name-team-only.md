# 2026-11-10 PR 31 — 검색은 인물 이름과 팀만 본다

지시문: `docs/instructions/PR31-search-name-team-only.md` (악센트 무시로 고친 뒤 실행)
브랜치: `feat/search-current-team` 위 작업 트리. PR 30 과 PR 30 악센트 후속(`fold()`)은 아직 커밋하지 않은 상태다. 커밋하지 않았다.

요청: "지시문을 악센트 무시로 변경하고 실행해."

## 바꾼 파일

- `docs/instructions/PR31-search-name-team-only.md`: 악센트 무시를 범위 안으로 옮기고 `fold()` 를 `matches()` 코드에 반영했다. "악센트 무시 안 함" 범위 밖 항목은 지웠다. 악센트 시험 항목 7을 더했다.
- `js/model/tabs.js`: `matches()` 의 글 묶음을 `[it.name, it.team, it.next, teamWords(tab, it)]` 로 줄이고 `fold()` 로 맞춘다. `regionName` import 를 뺐다(이 파일에서 다른 곳에 안 쓰였다). 주석에 이름·팀만 본다고 적었다.
- `js/views/roster.js`: `searchCard()` 에서 `p.role` 을 뺐다. 주석을 "이름·실명" 으로 고쳤다.
- `scripts/test/model.test.mjs`: "검색은 인물 이름과 팀만 본다" 시험 추가(Spear: `sen`, `kor`, `pac`, `구직`, `sentinel` 은 안 맞고, `spear`, `gen.g`, 팀 짧은 이름 `sen`, 이적 도착 팀 `next` 는 맞는다).
- `scripts/test/views.test.mjs`: "역할(포지션)로는 안 찾는다" 시험 추가(`sentinel` 은 Yolo 를 안 찾고, `alpha` 는 팀 전체를 찾는다).
- `docs/sessions/2026-11-10-pr30-accent-fold.md`: 남은 일의 PR 31 설명을 현재 상태로 고쳤다.

## 결정과 이유

- **`teamWords` 와 PR 30 팀 ID 규칙은 그대로 둠**(지시문 3번).
- **`it.next` 는 팀 검색에 남김.** 이적 도착 팀의 표시 이름이라 팀 이름으로 본다(지시문 규칙).
- **위치·국적·상태·비고·지역은 검색에서 뺌.** 이 값들은 이미 위치 거르기, 상태 칩, 지역 칩, 한국 탭이 맡는다.
- **부분 일치는 그대로.** `sen` 은 여전히 Sentinels 와 `Asen` 을 찾는다.

## 확인 결과 (직접 실행)

- `node scripts/test.mjs` → `단위 시험 183개 통과`, 종료 코드 0 (악센트 후속 끝 181개, 이번에 2개 추가. 기존 시험은 모두 통과했고 고칠 필요가 없었다).
- `node scripts/validate.mjs` → 종료 코드 0, 오류 0, 경고 639 (base 와 같다).
- `node scripts/css-check.mjs` → 종료 코드 0.
- `node scripts/build.mjs _site` → 종료 코드 0.
- 실제 데이터(`data/*.json`, `buildTabs` 로 만든 탭, 임시 스크립트 `$TEMP/pr31-check.mjs`):

| 검색어 | 선수 탭 | 이적 탭 | 코치 탭 | PR 31 전 선수 탭 |
|---|---|---|---|---|
| `sen` | 11 / 160 | 9 / 86 | 2 / 48 | 21 |
| `pac` | 0 / 160 | 0 / 86 | 0 / 48 | 49 |
| `kor` | 0 / 160 | 0 / 86 | 0 / 48 | 23 |

- `sen` 선수 11명은 이름이나 팀(과거 팀, 도착 팀, `FULL SENSE` 의 `sense` 포함)에 `sen` 이 들어 있다. 포지션 `Sentinel` 만으로 잡힌 행은 없다.

## 남은 일

- 커밋·푸시는 하지 않았다. 요청 시 `feat/search-current-team` 에 커밋한다. PR 30 악센트 후속, PR 31 변경, 두 지시문 문서를 함께 넣는다.
- 작업 트리에 `docs/instructions/README.md` 1줄 변경이 있다(세션 시작 때 없었고, 작업 중에 다른 쪽에서 생겼다). 이번 커밋에 넣지 않는다.
- `.archify/` 는 커밋하지 않는다.
