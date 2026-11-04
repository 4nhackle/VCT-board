[VCT-board 상세 페이지 구현 — 5-1회차(병합 전 검토 수정)]

[역할과 목표]
너는 VCT-board(발로란트 VCT LFT·FA 현황 GitHub Pages 정적 사이트, 저장소 4nhackle/VCT-board)의 선수·팀 상세 페이지 구현을 이어서 맡는다. 1~4회차와 5회차의 병합 전 점검까지 끝났고, main 병합(S4-01) 전에 외부 코드 검토에서 나온 문제를 고치는 회차다. 이 회차에서는 병합, Pages 설정 변경, docs/ 의 docx 커밋을 하지 않는다.

[먼저 읽을 것]
- docs/PROGRESS.md (전체, 특히 4·5회차 결정·변경)
- 아래 [고칠 것]에 적힌 파일과 줄

[지킬 규칙]
1. feature/detail-pages 에서만 작업한다. 시작할 때 git fetch origin 후 git rebase origin/main. main 에 push 하지 않는다.
2. 지금의 data/ 만으로(people.json, teams.json 없이) 사이트가 지금과 똑같이 동작해야 한다. data/*.json, og.png, index.html 은 건드리지 않는다.
3. 기존 코드 스타일(바닐라 ES 모듈, 한국어 주석)을 따르고, package.json 과 외부 라이브러리를 추가하지 않는다.
4. 항목 하나를 고칠 때마다 재현 → 수정 → 같은 재현이 더 이상 안 되는지 직접 실행해 확인하고 커밋한다. 커밋 메시지는 "R-01 빌드 출력 경로 보호: ..." 처럼 아래 항목 ID로 시작한다.
5. 확인하지 못한 것을 "확인함"이라고 쓰지 않는다.

[고칠 것 — 필수]
R-01 빌드·샘플 스크립트의 재귀 삭제 보호 (scripts/build.mjs, scripts/fixture-site.mjs)
- 문제: node scripts/build.mjs js 는 저장소의 js/ 를, node scripts/fixture-site.mjs .. 는 저장소의 상위 폴더를 통째로 지운다. 인자 경로를 그대로 fs.rmSync(recursive) 에 넘기기 때문이다.
- 수정: 두 스크립트 공통 규칙으로, 출력 폴더가 (a) 저장소 루트이거나 (b) 저장소의 상위 폴더(조상)이거나 (c) 저장소 안의 폴더면 거부한다. 단 build.mjs 는 저장소 안의 _site 하나만 예외로 허용한다(CI 가 _site 를 쓴다). 그리고 출력 폴더가 이미 있고 비어 있지 않으면, 스크립트가 직접 만든 표시 파일(예: .vct-build-output)이 있을 때만 지운다. 표시 파일은 출력 폴더를 만들 때 항상 쓴다. 경로 비교는 path.resolve 후 대소문자를 무시하고(Windows) 구분자 끝을 맞춰서 한다.
- 확인: js, .., 저장소 루트, 표시 파일 없는 기존 임시 폴더 → 모두 거부되고 아무것도 지워지지 않는다. _site 와 새 임시 폴더, 같은 폴더 재실행 → 정상. 시험은 저장소 사본(임시 폴더에 git worktree)에서 한다.

R-02 경력 날짜 이스케이프와 형식 검증 (js/views/person.js, scripts/validate.mjs)
- 문제: career[].from·to 가 dotYM() 을 거쳐 이스케이프 없이 innerHTML 에 들어간다(저장형 XSS). validate 는 날짜 형식을 보지 않는다. 데이터는 웹에서 조사한 내용을 시트에 옮겨 만들어지므로 실제로 위험하다.
- 수정: 출력 시 esc(dotYM(...)) 를 적용한다. validate 에 career from·to 형식 검사(yyyy-mm, to 는 null 허용)를 오류로 추가한다. 형식 검사가 이스케이프를 대신하지 않는다.
- 추가: js/views/ 와 js/components/ 의 innerHTML 로 들어가는 문자열을 모두 훑어, 데이터 값이 esc() 없이 들어가는 다른 곳이 있는지 찾아 고치고 목록을 PROGRESS.md 에 적는다(href 는 esc + http(s) 검사 유지).
- 확인: 샘플 사본의 career.from 에 <img src=x onerror=alert(1)> 를 넣으면 화면에 글자로 보이고 스크립트가 실행되지 않으며, validate 는 오류(종료 코드 1)를 낸다.

R-03 상속 속성 이름의 ID로 앱이 멈추는 문제 (js/model.js)
- 문제: ID 가 constructor, toString 같은 값이면 일반 객체 {} 의 상속 속성과 겹쳐 buildIndex 의 add() 가 예외를 내고 전체 목록이 "데이터를 불러오지 못했습니다" 가 된다.
- 수정: buildIndex 의 people, teams, byPerson, byTeam 을 Object.create(null) 로 만든다. 이 객체들을 읽는 다른 곳(views, build.mjs)도 hasOwnProperty 류 가정이 없는지 확인한다.
- 확인: 샘플 사본에 이름이 "constructor", "toString" 인 소식 행과 people 행을 넣어도 목록과 상세가 정상이다.

R-04 시작 전인 경력이 "진행 중"으로 잡히는 문제 (js/model.js careerOf)
- 문제: to 가 없으면 current 로 본다. {from: "2027-01", to: null} 도 오늘 현재 로스터로 보인다.
- 수정: current = to 가 없고 from 이 오늘(KST, TODAY 기준 yyyy-mm) 이후가 아님. today 를 인자로 받을 수 있게 한다(기본값 TODAY). 시작 전 칸은 경력 타임라인에 "예정" 으로 표시하고 팀 로스터에는 넣지 않는다.
- 확인: 단위 시험으로 지난달·이번 달·다음 달 시작 칸의 current 값을 확인한다.

R-05 watch 행 teamIds 가 배열이 아닐 때 앱 전체가 멈추는 문제 (js/model.js idsOf)
- 수정: tids 를 항상 배열로 만든다([].concat(...)). 문자열 원소는 그대로 두되 validate 가 ID 형식 오류로 잡는다.
- 확인: 샘플 사본에 teamIds: "fx-alpha" 를 넣어도 목록이 정상이고, validate 결과를 보고한다.

[고칠 것 — 권장]
R-06 저장소 안 단위 시험 (scripts/test.mjs, 신규, node:assert 만 사용)
- %TEMP% 에 있던 확인 스크립트의 핵심을 옮긴다: ageOf(생일 전날·당일·다음날, 연도만), contractState(어제·오늘·내일·미공개), careerOf(R-04 포함), slugOf, ID_RE, parseRoute, buildIndex(R-03·R-05 포함), teamMoves. 날짜는 모두 today 인자로 고정한다(실행 날짜에 따라 결과가 바뀌면 안 된다).
- .github/workflows/pages.yml 의 build job 에서 validate 앞에 node scripts/test.mjs 를 실행한다.

R-07 dev-server 가 .git 등 저장소 전체를 서비스하는 문제 (scripts/dev-server.mjs)
- index.html, 404.html, sitemap.xml, og.png, css/, js/, data/, p/, t/ 만 서비스하고 나머지는 404. 기본 폴더와 _site 둘 다에서 동작해야 한다.

R-08 정리
- 쓰이지 않는 hashTab()(js/state.js)과 person.js 의 쓰이지 않는 stampOf import 를 지운다(지우기 전에 grep 으로 다시 확인).
- person.js 와 team.js 에 똑같이 있는 val, TAB_NAME, 소식 줄 함수를 js/views/common.js 로 모은다. 화면 결과는 바뀌지 않아야 한다(V-01~V-04 와 샘플 상세 화면으로 확인).

R-09 워크플로·빌드 작은 개선
- runs-on 을 ubuntu-24.04 로 고정한다(두 job 모두).
- upload-pages-artifact 단계는 main 일 때만 실행한다(검증과 빌드는 모든 브랜치에서 그대로).
- build.mjs 는 data/people.json 이나 teams.json 이 없으면 "상세 정적 페이지 0개(people/teams 없음)" 경고 한 줄을 출력한다. 빌드를 실패시키지는 않는다(지금은 설계상 정상 상태다).
- validate.mjs 의 같은 종류 경고가 많으면 파일·종류별 개수와 앞의 5건만 출력한다.

[고치지 않을 것 — 검토 의견에 대한 결정]
- "현재 데이터로는 정적 상세 페이지가 생성되지 않는다": 설계상 알려진 한계다. 시트에 인물·팀 탭이 생기고 예약 작업이 people.json·teams.json 을 만들면 해결된다. 빌드를 실패시키면 배포가 막히므로 R-09 의 경고 출력만 한다.
- js/main.js 분리: 이번에는 하지 않는다.

[끝낼 때]
- 전체 확인: node scripts/test.mjs, node scripts/validate.mjs(현재 data/, 샘플 fixtures), node scripts/build.mjs(임시 폴더, 현재 data/ 와 샘플), V-01~V-04(현재 data/), 샘플 상세 화면 V-05·V-06·V-10.
- 가능하면 gh 로 브랜치 push 뒤 Actions 실행이 성공하는지(test·validate·build 통과, upload·deploy 는 건너뜀) 확인한다.
- docs/PROGRESS.md 에 "5-1회차 검토 수정" 구역을 만들어 R-01~R-09 결과, 고치지 않은 것과 이유, 확인 결과를 적고, 오래된 "5회차에 넘길 것" 구역을 실제 남은 일(S3-06, S4-01~S4-03, 미리보기 한계 안내)로 정리한다. PROGRESS.md 의 C:/Users/... 같은 개인 경로는 %TEMP% 표기로 바꾼다(공개 저장소에 올라가므로).
- git push origin feature/detail-pages 후, 한국어로 짧게 보고한다: 항목별 결과, 확인 결과, 사용자가 판단할 것. 병합은 하지 않는다(5회차 지시문으로 이어서 한다).
