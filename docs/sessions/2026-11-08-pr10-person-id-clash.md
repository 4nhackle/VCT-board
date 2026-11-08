# 2026-11-08 PR 10: personId 없는 소식 행이 낀 인물 이름 충돌은 오류 (감사 지적 6)

- 목적: 지시문 `docs/instructions/PR10-person-id-clash.md` 대로. "ZYZZ"와 "zyzz"처럼 소문자화 뒤 같은 ID 가 되는 인물 이름이, personId 없는 소식 행에 끼면 검증을 멈춘다. 인물 명단끼리의 충돌은 경고로 둔다. 팀 이름 충돌은 바꾸지 않는다.
- 이 세션이 대체하는 것: 없음. 연결: `docs/PROGRESS.md` 27회차 절.
- 브랜치: `fix/person-id-clash`(origin/main `a58ad6d` 기반). PR 기준 `main`. 병합하지 않았다.
- 바꾼 파일
  - `scripts/validate.mjs`: `clashes(list, what, tail, strict)`. 충돌 그룹마다 `row` 표시(소식 행에서 온 이름 형태가 있는지)를 모은다. `strict` 이고 `row` 이면 `errors` 에 "인물 이름 충돌: … 시트의 해당 행에 인물ID를 채우세요"를 넣는다. 아니면 기존처럼 경고. 소식 행 이름 목록에 `row: true` 를 붙였다. 인물 호출만 `strict = true`, 팀 호출은 그대로.
  - `scripts/test.mjs`: 시험 5개 추가(임시 데이터 폴더에서 `validate.mjs` 실행).
    1. 소식 행 "ZYZZ"·"zyzz"(personId 없음): 종료 1, "인물 이름 충돌".
    2. 소식 행 "ZYZZ" + 인물 명단 "zyzz": 종료 1.
    3. 인물 명단 "ZYZZ"·"zyzz" 두 명: 종료 0, 경고("같은 ID 'zyzz'"), "인물 이름 충돌" 없음.
    4. personId 가 있는 행끼리 같은 철자: 충돌 없음, 종료 0.
    5. 팀 이름 "Leviatán"·"LEVIATÁN": 종료 0, 경고("같은 ID 'leviatan'").
  - `docs/instructions/revised/web-publish-daily.txt`: 4단계에 지시문의 영문 규칙 블록을 넣었다. 이 파일은 git 에 없다(`.git/info/exclude`). 파일을 직접 고쳤다.
- 결정과 이유
  - "오류" 조건은 충돌 그룹에 personId 없는 소식 행이 하나라도 있는 것이다(지시문 그대로). 같은 그룹이 인물 명단에서도 나와도 행이 끼면 오류다.
  - 메시지 문구는 경고와 같은 본문에 "시트의 해당 행에 인물ID를 채우세요"를 덧붙였다(지시문).
  - 시트 쪽 작업(인물ID 작성)은 바꾸지 않았다. 시트 작업은 이미 모든 소식 행에 인물ID를 쓴다(지시문 3항).
- 확인 결과 (직접 실행)
  - `node scripts/test.mjs`: 148개 통과(origin/main 의 143 + 새 5). 종료 코드 0.
  - `node scripts/validate.mjs`(현재 data): 오류 0, 경고 606(변화 없음). 차단하지 않는다.
  - `node scripts/build.mjs _site`: 성공.
- 확인하지 못한 것
  - 예약 작업의 실제 안전 검사(사용자 작업). 지시문의 문구를 PR 본문에 넣었다.
  - 브라우저 확인은 이 PR 에 필요 없다(검증 스크립트만 바뀜).
- 작업 트리의 다른 변경(이 PR에 넣지 않음)
  - `docs/디자인`·`docs/인계` 일부 삭제 상태, `docs/instructions/README.md` 수정, `docs/instructions/PR7~PR10` 미추적 파일. 건드리지 않았다.
- 남은 일
  - 사용자: 예약 작업 안전 검사 문구 반영(PR 본문의 블록 붙여 넣기), 로컬 `revised/web-publish-daily.txt` 는 이미 고쳐졌다.
  - PR 병합(사용자 확인 뒤). 병합 시각은 예약 작업 시각 앞뒤 30분을 피한다(CLAUDE.md).
