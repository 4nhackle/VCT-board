# 지시문 목록

설계: `docs/개선-설계-2026-11.md`. 지시문 한 개를 세션 한 개로 실행한다(CLAUDE.md 주의점 2). 지시문은 영어다(주의점 3).

| 순서 | 파일 | 종류 | 선행 |
|---|---|---|---|
| 1 | [PR1-transfer-merge.md](PR1-transfer-merge.md) | 사이트 코드 | 없음 |
| 2 | [PR2-data-rules.md](PR2-data-rules.md) | 사이트 코드 | PR 1 병합 |
| 3 | [schedule-sheet-update.md](schedule-sheet-update.md) | 예약 작업(시트 갱신 2개) | 단계별: A·B·C 는 지금, D·E 는 PR 2 와 웹 반영 변경 뒤 |
| 3 | [schedule-web-publish.md](schedule-web-publish.md) | 예약 작업(웹 반영 2개) | PR 2 배포 |
| 4 | [PR4-today-filters.md](PR4-today-filters.md) | 사이트 코드 | PR 1 병합 |
| 5 | [PR5-team-news.md](PR5-team-news.md) | 사이트 코드 | PR 2 병합 |
| 6 | [PR6-roster-tab.md](PR6-roster-tab.md) | 사이트 코드 | PR 1 병합, 시트 로스터 채우기(F) |
| 19 | [PR19-roster-list-design.md](PR19-roster-list-design.md) | 사이트 코드 | PR 6 병합 |
| 20 | [PR20-transfers-position-filter.md](PR20-transfers-position-filter.md) | 사이트 코드 | PR 19 병합 |
| 21 | [PR21-recent-order-toggle.md](PR21-recent-order-toggle.md) | 사이트 코드 | PR 20 병합 |
| 22 | [PR22-roster-search.md](PR22-roster-search.md) | 사이트 코드 | PR 19 병합 |

| 23 | [PR23-roster-follows-transfers.md](PR23-roster-follows-transfers.md) | 사이트 코드 | PR 22 병합 |

- 예약 작업 변경을 한 번에 시키려면 [schedule-change-prompt.md](schedule-change-prompt.md) 를 붙여 넣는다(위 두 schedule 파일을 합친 완결판, PR 5 병합 기준).
- PR 6 전에 [roster-backfill-once.md](roster-backfill-once.md)(팀 등급 2027 정리 + 로스터 채우기, 일회성)를 실행한다. 정기 지시문 변경점은 [roster-backfill-changes.md](roster-backfill-changes.md).
- PR 은 모두 `js/model.js` 를 고친다. 한 번에 하나씩 열고 병합한다.
- 예약 작업은 이 PC 에 없다. 사용자가 작업 설정에 붙여 넣는다.
