# 2026-11-09 지시문 작성: PR 19~21

## 목적
사용자 요청 3가지에 대한 코드 수정 지시문 작성. 이 세션은 코드를 고치지 않는다(사용자 지시).
1. 로스터 탭에 다른 목록 탭과 같은 디자인 체계 적용
2. 최근 소식순 버튼 복원(선수·코치·한국·이적 완료 탭)
3. 이적 완료 탭에 포지션 거르기 추가

## 만든 파일
- docs/instructions/PR19-roster-list-design.md
- docs/instructions/PR20-transfers-position-filter.md
- docs/instructions/PR21-recent-order-toggle.md

## 결정과 이유
- 기준은 origin/main `66855fe`. 로컬 브랜치 chore/docs-reorg-and-instructions 는 PR 16~18 이전이라 코드가 다르다.
- "포지션 정렬"은 선수 탭의 포지션 고르기 칸과 같은 거르기로 읽었다. 순서를 바꾸는 정렬이 아니다.
- 이적 행에는 포지션이 없다(sub: ""). people.json role 로 채우지 않으면 거르기를 켤 때 탭이 비므로, PR 20 에 채우기를 넣었다.
- 최근 소식순은 #fx 의 토글 칩 하나로 둔다. 주소 ?sort=recent 로 기억하고, 옛 vct-order 는 무시한다. PR 16 결정을 되돌리는 것이라 툴바 설계 문서도 고치게 했다.
- "새 N" 배지와 hint.recent 는 요청에 없어 되살리지 않는다.
- 세 PR 모두 js/main.js·scripts/test.mjs 를 고치므로 19 → 20 → 21 순서로 병합한다.

## 확인
- 코드는 git show origin/main:<파일> 로 읽었다. 지시문을 실행하거나 시험을 돌리지는 않았다.

## 남은 일
- docs/instructions/README.md 표와 docs/PROGRESS.md 에 이 회차를 추가한다. 로컬 판이 main 보다 오래돼서 이번에는 고치지 않았다. 각 PR 을 구현할 때 main 에서 넣는다.
- 지시문 3개는 커밋하지 않았다.
