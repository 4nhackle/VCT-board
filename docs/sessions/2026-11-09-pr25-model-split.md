# PR 25 js/model.js 나눔 (2026-11-09)

## 목적
지시문 `docs/instructions/PR25-model-split.md` 대로 `js/model.js`(526줄)를 일 단위 파일로 나눈다. `js/model.js` 는 공개 입구(재내보내기 전용)로 남기고, 코드는 `js/model/` 에 둔다. 동작은 바꾸지 않는다.

## 기준
- 브랜치 `refactor/model-split` 을 따지 않았다. PR 24 는 아직 커밋·병합 전이라 `refactor/test-split` 작업 트리에 함께 있다. 이 PR 의 변경은 `js/model.js`, `js/model/*.js` 뿐이다(PR 24 의 `scripts/test` 변경은 그대로 남아 있다).
- 나누기 전 기준: `node scripts/build.mjs /tmp/site-before`, `node -e 'import("./js/model.js")…'` 공개 이름 목록 32개(`/tmp/exports-before.txt`).

## 바꾼 파일
- `js/model.js`: 첫 줄 주석 그대로, 둘째 줄 추가("코드는 js/model/ 에 있다, 이 파일은 공개 이름을 다시 내보내기만 한다"). 나머지는 `export { … } from "./model/….js";` 여섯 줄(공개 이름 32개, 이름별로 적음).
- `js/model/labels.js` (지역·등급 이름), `ids.js` (ID·이름 정리·행→항목), `status.js` (알약·경로·지켜볼 팀 종류), `notes.js` (메모 꼬리), `people.js` (나이·계약·경력·로스터·팀 소식·색인·카드), `tabs.js` (이적 합치기·탭 목록·거르기). 각 파일 첫 줄은 한 줄 설명 주석.
- 함수 본문은 원문 그대로 옮겼다(생성 스크립트로 줄 범위를 복사). 주석도 해당 함수와 함께 옮겼다.

## 결정과 이유 (지시문과 다른 부분)
1. `toItem` 을 `tabs.js` 에서 `ids.js` 로 내렸다. `buildIndex`(people)가 `toItem` 을 쓰는데, 지시문 표대로면 people 이 tabs 를 가져와 순환이 된다. 지시문의 "함수를 아래 파일로 내린다" 규칙을 따랐다. `toItem` 은 `own` 만 쓴다.
2. 파일 순서를 `people` → `tabs` 로 바꿨다. `buildTabs` 가 `rosterCards`·`buildIndex`·`contractOK`(people)를 쓴다. 지시문 표는 tabs 를 people 위에 두었는데, 그러면 위로 가는 import 가 생긴다. 그래서 `buildTabs` 를 옮기지 않고(탭 목록 만들기는 tabs 가 맡는다) 파일 순서만 바꿨다. 방향은 한쪽이다: labels → ids → status → notes → people → tabs.
3. `notes.js` 는 `../format.js`(stampOf)를 가져온다. 표에는 `ids` 만 적혀 있는데 `notes.js` 는 `ids` 를 쓰지 않는다. `status.js` 는 `../i18n.js`(t, LANG)를 직접 가져온다(표에 빠짐). 둘 다 바깥 모듈이고 순환이 없다.
4. 내부용으로만 쓰는 `own`, `dayOf`, `toIdOf` 는 `ids.js` 에서 `export` 로 열었다(다른 파일이 쓴다). 배럴에는 넣지 않았다. 배럴 공개 목록은 `export *` 가 아니라 이름별 재내보내기로 적었다(`export *` 를 쓰면 `own`·`dayOf` 가 새어 나간다).
5. 줄 42 의 주석("data/*.json 묶음 D 로 탭 목록을 만든다.")은 원래 `mergeMoves` 바로 위에 있었지만 내용은 `buildTabs` 의 설명이라, `buildTabs` 위로 옮겼다. 그 밖의 주석은 그대로다.

## 확인 결과 (직접 실행)
- `node -e 'import("./js/model.js")…'`(나눈 뒤): 공개 이름 목록이 나누기 전과 같다(`diff /tmp/exports-before.txt /tmp/exports-after.txt`: 차이 없음, 32개).
- `node scripts/build.mjs /tmp/site-after` 후 `diff -r -x js /tmp/site-before /tmp/site-after`: 차이 없음(정적 인물·팀 페이지 포함).
- 순환 검사(`grep -n "^import" js/model/*.js`): 모든 import 가 위 순서의 파일이나 바깥 모듈(`../format.js`, `../i18n.js`)을 가리킨다. 위로 가는 import 없음.
- 원문 줄 대조: 원문 5–526줄의 빈 줄 아닌 줄을 정렬해 새 파일 본문과 비교했다. 차이는 새 한 줄 주석 6개, `export` 를 붙인 함수 3개(`own`·`dayOf`·`toIdOf`), 옮긴 주석 한 줄뿐이다. 빠진 줄 없음.
- `node scripts/test.mjs`: 종료 코드 0, `단위 시험 169개 통과`.
- `node scripts/validate.mjs`: 종료 코드 0, 오류 0.
- `node scripts/css-check.mjs`: 종료 코드 0.
- 브라우저(`node scripts/dev-server.mjs`, 나눈 뒤 8080, 나누기 전 원본 사본 8081 과 비교):
  - Obscura 브라우저는 `127.0.0.1` 을 막는다(SSRF 보호). 그래서 내장 브라우저 창으로 확인했다.
  - 한국어 `/`, 영문 `/en/`: 탭 아홉 개(선수·오늘·코치·한국·이적·로스터·지켜볼 팀·일정·건의) 각각의 `#view` HTML 해시가 두 빌드에서 같다.
  - 인물 상세(`/en/p/tenz/`, 목록에서 링크로 열기)·팀 상세(`/en/t/sentinels/`): HTML 해시가 같다.
  - 콘솔 오류: 외부 Cloudflare 수집 요청(CORS), 404 두 건. 두 빌드 모두 같은 종류다. 모듈 불러오기 오류는 없다.
  - 직접 주소 `/en/p/tenz/` 는 개발 서버에서 404(두 빌드 공통). 상세 페이지는 목록에서 눌러 연다.
- 알려진 것(이 PR 과 무관, 나누기 전에도 있었음): 건의 탭을 탭 전환으로 열면 본문에 일정 글이 보인다(직접 `#suggest` 로 열면 비어 있다). 두 빌드에서 같은 동작이라 이 PR 에서 고치지 않는다.

## 남은 일
- 커밋·PR 생성 없음(요청 시 진행). 병합 순서는 PR 24 → 25 → 26.
- PR 26(`js/main.js` 나누기)은 같은 작업 트리에서 이어서 진행한다(아래 기록은 PR 26 세션 기록에 따로 남긴다).
- 병합 시각은 예약 작업 앞뒤 30분을 피한다(CLAUDE.md).
