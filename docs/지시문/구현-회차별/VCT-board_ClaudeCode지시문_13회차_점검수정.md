# VCT-board 13회차 지시문 — 점검 결과 수정과 영문 후원 정리

## 배경

- 12회차(PR #16)는 2026-11-02 12:36에 병합됐다.
- 같은 날 13:2x에 웹 반영 예약 작업 두 개(09:35, 15:35·21:35)에 2-5) 단계를 넣었다. 이 단계는 `data/i18n-en.json`을 매 실행 갱신한다.
  - 파이썬 도우미의 `collect_targets`·`en_ok`는 `scripts/i18n-targets.mjs`·`js/i18n.js`의 `trEn`과 같은 결과를 낸다. 현재 데이터로 대상 182개, 통과 173개가 일치하는 것을 확인했다.
  - **이번 회차에서 이 두 규칙(키 만들기, 번역 검사)을 바꾸면 예약 작업 쪽 파이썬과 어긋난다.** 바꿔야 한다면 바꾸지 말고 보고한다.
- 이번 회차는 `/ponytail-audit` 결과(12회차 뒤)를 고치고, 영문 화면의 카카오페이를 정리한다.
- 줄 번호는 점검 당시 기준이다. 함수 이름으로 찾는다.

## 0. 지킬 것

- `main` 최신에서 브랜치 `fix/audit-13`을 만든다. 항목마다 커밋을 하나씩 만들고, 커밋 메시지 앞에 `M-1:` 같은 번호를 붙인다.
- 다음은 건드리지 않는다.
  - `data/`(예약 작업이 커밋한다. `i18n-en.json` 포함)
  - `index.html`의 `<p class="lede">`와 기준 시각 형식
  - `<script type="module" src="js/main.js">`
  - `og.png`, `.github/`
- 판정 정규식, 번역 키 규칙(`i18n-targets.mjs`), 번역 검사 규칙(`trEn`)의 동작은 바꾸지 않는다.
- 항목마다 아래 세 명령이 통과해야 한다.
  - `node scripts/test.mjs`
  - `node scripts/validate.mjs`
  - `node scripts/build.mjs _site`
- 기준선: `node scripts/build.mjs /tmp/before_site`를 만든다. 끝난 뒤 `diff -r`로 비교해 아래 항목이 의도한 차이만 있어야 한다.
  - E-1(영문 후원 링크)
  - S-3(정적 HTML에 영향이 없어야 함)
- **예약 작업 실행 시각을 피해 병합한다.** 실행 시각은 08:50·09:35, 11/2~16의 14:50·15:35·20:50·21:35 KST이고, 그 앞뒤 30분을 피한다. 이 내용을 PR 설명에 적는다.

## 꼭 고칠 것

### M-1. 이적 행의 빈 출발·도착 팀

- **위치**: `js/model.js`의 `pillOf`(약 234행), `scripts/validate.mjs`(약 174~178행)
- **현재**: transfers 행의 `to`가 비면 알약이 " 합류"(팀 이름 없이)로 나온다. 검증은 이름이 있을 때만 도착 팀을 본다.
- **수정**: `scripts/validate.mjs`에 **오류**를 추가한다. transfers(players·coaches)의 `from` 또는 `to`가 비었거나 "-"이면 오류로 막는다.
  - 오류 문구 예: "transfers.players[3] OXY: 새 팀(to)이 비어 있습니다. 시트 '성사된 이적'의 새 팀 칸을 채우세요"
  - 잔류 행처럼 `to`가 원래 비는 경우가 데이터에 있는지 먼저 확인한다(`type`에 "잔류"). 있으면 그 경우는 제외하고 보고한다.
- 배포 전 검증에서 막히면 사이트는 이전 배포로 남는다. 웹 반영 예약 작업의 5-1) 배포 확인이 실패를 알린다. 이 흐름을 PR 설명에 적는다.
- **화면 안전장치**: `pillOf`에서 팀 이름이 비면 "{team} 합류" 대신 사전의 "새 팀 합류"(`pill.joinedNew` 등 기존 키)를 쓴다. 한국어 출력은 지금 데이터에서 바뀌지 않아야 한다.
- **시험**: 빈 `to` 행 → validate 오류 1건, `pillOf` 결과에 앞 공백이 없음.

### M-2. 없는 날짜가 보도 시각으로 통과

- **위치**: `js/format.js`의 `parseStamp`(약 33~41행)
- **현재**: 월·시·분만 확인한다. "(Sheep 2/30 12:00 UTC)"가 3/1로 넘어가 보인다.
- **수정**: 일이 그 달의 날 수보다 크면 `null`을 낸다. 2월은 29일까지 허용한다. 연도를 모르므로 윤년 기준이다(`splitNote`와 같은 2024 기준).
  - `parseStamp`가 `null`이면 `stampOf`와 화면 출처 시각이 모두 빠진다.
  - `validate.mjs`의 "비고 시각" 경고가 이 경우에 "보도 시각 M/D 는 없는 날짜입니다"로 따로 경고하게 한다.
- **번역 검사와의 관계**: `trEn`·예약 작업의 `en_ok`는 `STAMP_RE`(정규식)로 문자열을 비교하므로 이 변경의 영향이 없다. 영향이 있으면 멈추고 보고한다.
- **시험**: 2/30, 4/31, 2/29(통과), 12/31(통과), 13/1(기존대로 null).

## 고치면 좋은 것

### S-1. 언어 이동 스크립트 시험

- `index.html` `<head>` 맨 앞의 인라인 스크립트를 시험한다.
- 시험이 같은 코드를 쓰도록 스크립트 본문을 문자열로 읽어(`index.html`에서 추출) `node:vm`으로 실행한다. 가짜 `location`(pathname, search, hash, replace)과 `localStorage`를 넣는다.
- 경우와 기대값:

| 저장값 | 주소 | 기대 |
|---|---|---|
| 없음 | `/VCT-board/` | 이동 없음 |
| en | `/VCT-board/#coaches` | `/VCT-board/en/#coaches` |
| en | `/VCT-board/p/oxy/` | `/VCT-board/en/p/oxy/` |
| ko | `/VCT-board/en/t/cloud9/` | `/VCT-board/t/cloud9/` |
| en | `/VCT-board/?stay` | 이동 없음 |
| en | `/VCT-board/en/` | 이동 없음 |
| (localStorage 접근 시 예외) | — | 이동 없음, 오류 없음 |

### S-2. 비고 나누기 코드 하나로

- `js/views/common.js`의 `splitNote`가 `js/note.js`의 `noteParts`를 불러 쓰고, 화면용 부분(보도 시각 표시 글 만들기)만 더하게 한다.
- `splitNote`의 반환 모양(`{ body, src, cross }`)과 출력은 그대로다. 기준선과 DOM이 같아야 하고, 기존 `splitNote` 시험이 통과해야 한다.
- `noteParts`의 동작은 바꾸지 않는다. 예약 작업의 `note_parts`와 같아야 하기 때문이다. 줄 수 변화를 보고한다(점검 추정 약 -8줄).

### S-3. 사이트 경로 일치 검사

- `/VCT-board/`는 `scripts/build.mjs`(`SITE_PATH`), `scripts/dev-server.mjs`, `index.html` 인라인 스크립트에 적혀 있다.
- 리팩터링하지 않고 **검사**만 더한다.
  - `dev-server.mjs`는 `build.mjs`의 상수를 가져다 쓴다. 가져올 수 없는 구조면 같은 값인지 시험으로 확인한다.
  - `build.mjs`는 시작할 때 `index.html` 인라인 스크립트에 `SITE_PATH`와 같은 경로 글자가 있는지 확인하고, 없으면 오류로 멈춘다.
  - 시험을 하나 둔다.

### S-4. 자정이 지나도 "오늘"이 그대로 (9회차 F-08 미처리분)

- `js/format.js`의 `TODAY`가 페이지를 열 때 한 번만 계산된다.
- 9회차 지시문의 방식을 따른다: `js/main.js`에서 `visibilitychange`가 visible이 될 때 오늘 일련번호가 처음 값과 다르면 `location.reload()`한다.
  - 다시 불러온 뒤 목록 상태와 스크롤이 복원되는지 확인한다.
  - 복원되지 않으면 하지 말고 보고한다.
- `TODAY`를 쓰는 다른 곳(빌드·시험)은 바꾸지 않는다. 브라우저(`document`가 있을 때)에서만 동작한다.

## 있으면 좋은 것

- **N-1 export 정리**: 파일 밖에서 쓰지 않는 export 6개에서 `export`를 뺀다. 빼기 전에 저장소 전체(`scripts/`, `js/`, 시험)에서 grep으로 쓰임이 없는지 확인한다.
  - `js/i18n.js:10`, `js/model.js:27`, `js/model.js:307`, `js/views/schedule.js:6`, `js/views/common.js:32`, `scripts/i18n-html.mjs:48`
- **N-2 한국어 날짜 규칙 하나로**: `js/views/recent.js`(약 29행)가 직접 만드는 한국어 날짜("M월 D일 (요일)")를 `format.js`의 날짜 함수가 맡게 한다. 한국어 출력은 같아야 한다.

## 영문 화면 후원 정리

### E-1. 영문 화면에서 카카오페이 숨김

- 카카오페이 송금은 국내 계좌 송금이라 해외 사용자가 쓰기 어렵다. 12회차 보고의 선택지 중 (2)를 고른다: 영문 화면에서만 숨기고 Ko-fi만 남긴다.
- 적용할 곳:
  - 머리말 후원 메뉴
  - 영문 푸터 문단
  - `en/terms/`, `en/privacy/`의 후원 항목. 카카오페이를 언급하는 문장이 있으면 "KakaoPay (Korean domestic transfer, Korean page only)"처럼 사실만 남긴다. 링크는 넣지 않는다.
- 한국어 화면은 그대로 둔다.
- 머리말 배치 측정(12회차 B-2 방식, 375·601·1280, 라이트·다크)을 다시 해 겹침이나 넘침이 없는지 확인한다.

## 확인과 마무리

1. 각 항목의 결과를 적는다: 고침 / 해당 없음 / 보류, 줄 수 증감, 시험 수.
2. 기준선 대비 `_site` 차이를 요약한다. E-1과 S-3 외 정적 HTML 차이는 0이어야 한다.
3. `node scripts/i18n-report.mjs` 결과를 붙인다. 번역 표는 예약 작업이 계속 바꾸므로 수치만 기록한다.
4. `docs/PROGRESS.md`에 이번 회차를 기록한다.
5. `docs/디자인/design-brief.md`에 "영문 화면 후원은 Ko-fi만"을 추가한다.
6. PR 제목은 "점검 수정: 빈 이적 팀·없는 날짜 검증, 언어 이동 시험, 비고 나누기 통합, 영문 후원 정리"로 연다. 병합하지 않는다.
7. 수정이 끝나면 `/ponytail-audit`을 실행한다. 새로 나온 지적은 고치지 말고 PR 설명과 보고에 목록으로 붙인다.

## 하지 않는 것

- `data/`와 예약 작업 지시문 변경
- 번역 키·검사 규칙 변경
- 새 기능, 디자인 변경(E-1 제외)
