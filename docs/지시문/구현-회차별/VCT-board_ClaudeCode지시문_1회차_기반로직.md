[VCT-board 상세 페이지 구현 — 1회차 / 5]

[역할과 목표]
너는 VCT-board(발로란트 VCT LFT·FA 현황 GitHub Pages 정적 사이트, 저장소 4nhackle/VCT-board)에 선수·팀 상세 페이지를 추가하는 구현을 맡았다. 전체 구현은 5회차로 나뉘어 있고 이번은 1회차다. 이 세션에서는 이번 회차 범위만 구현하고, 다음 회차 작업은 미리 하지 마라.

[먼저 읽을 것]
- docs/ 의 설계 문서 4개(.docx). pandoc -t markdown 으로 읽는다. 문서가 없으면 구현을 시작하지 말고 사용자에게 알려라.
  · VCT-board_사이트코드_변경설계서.docx : 전체 설계 (이번 회차에 해당하는 장은 아래에 적었다)
  · VCT-board_구현체크리스트.docx : 작업 ID, 완료 기준, 선행 작업, 확인 항목(V-xx)
  · VCT-board_설계노트.docx : 작업 ID별 상세 설계
  · VCT-board_예약작업_변경설계서.docx : 참고용(이번 구현 범위 아님). 예약 작업이 매일 data/*.json 을 main에 커밋한다는 점만 기억한다.
- 기존 코드(js/, css/, scripts/validate.mjs, index.html)와 data/*.json 의 구조를 직접 읽고 기존 규칙을 확인한다.

[지킬 규칙]
1. 브랜치: feature/detail-pages 에서만 작업한다. main 에 직접 push 하지 않는다(병합은 5회차에서 사용자 승인 후). 회차를 시작할 때 git fetch origin 후 git rebase origin/main 을 한다(예약 작업이 매일 main 에 데이터를 커밋하므로). data/ 에서 충돌이 나면 main 쪽을 따른다.
2. 하위 호환: 지금의 data/ 만으로(people.json, teams.json, 새 필드가 없어도) 사이트가 지금과 똑같이 동작해야 한다.
3. 건드리지 않는 것: data/*.json 의 기존 내용, og.png, index.html(수정이 필요하다고 판단되면 멈추고 사용자에게 묻는다), 기존 필드 이름, toItem() 이 지금 돌려주는 필드.
4. 코드 규칙: 기존 코드와 같은 스타일(바닐라 ES 모듈, var·function 스타일, 한국어 주석). 빌드 도구, package.json, 외부 라이브러리를 추가하지 않는다. model.js 는 DOM·state 를 만지지 않는 순수 함수만 둔다. HTML 문자열에 들어가는 데이터는 모두 esc() 로 이스케이프한다.
5. 설계와 맞지 않는 상황을 발견하면 설계를 임의로 바꾸지 말고, 가장 작은 변경으로 해결한 뒤 docs/PROGRESS.md 의 "결정·변경" 에 이유와 함께 적는다. 설계 전체에 영향이 크면 멈추고 사용자에게 묻는다.
6. 작업은 체크리스트의 선행 관계 순서로 한다. 작업 하나를 끝내면 완료 기준을 직접 실행해 확인하고, 통과했을 때만 완료로 표시하고 커밋한다. 커밋 메시지는 "S1-02 인덱스 생성: ..." 처럼 작업 ID로 시작하는 한국어 한 줄로 쓴다.
7. 브라우저 확인은 저장소 밖 임시 폴더(예: /tmp/vct-check)에 Playwright 를 설치해 실행한다. 저장소에 package.json, node_modules, 캡처 파일을 남기지 않는다.
8. 확인하지 못한 것을 "확인함"이라고 쓰지 않는다. 못 한 것은 이유와 함께 못 했다고 보고한다.

[회차를 끝낼 때]
- docs/PROGRESS.md 를 갱신해 커밋한다: 완료한 작업 ID, 변경한 파일, 통과한 확인 항목, 결정·변경, 다음 회차가 알아야 할 점.
- git push origin feature/detail-pages 로 올린다.
- 사용자에게 한국어로 짧게 보고한다: 완료·미완료 작업 ID, 확인 결과, 사용자가 판단하거나 직접 해야 할 일.

[이번 회차 범위] 작업 S0-02, S1-01, S1-02, S1-03, S1-04, 그리고 scripts/dev-server.mjs.
(S0-01 저장소 쓰기 권한은 사용자가 준비했다. git push 가 안 되면 멈추고 알려라.)

[할 일]
1. S0-02 준비
   - feature/detail-pages 브랜치를 만든다.
   - docs/PROGRESS.md 를 만든다. 체크리스트의 작업 30개(S0-01~S4-03)를 ID와 제목으로 "- [ ]" 목록으로 옮기고, "결정·변경" 과 "다음 회차에 알릴 점" 구역을 둔다. S0-01 은 완료로 표시한다.
   - docs/ 의 docx 4개는 커밋하지 않는다(S4-02 에서 한다). PROGRESS.md 는 회차마다 커밋한다.
   - 기준 화면 캡처: 현재 사이트를 로컬에서 열어 선수, 코치·스태프, 한국, 이적 완료, 지켜볼 팀, 일정 탭과 선수 탭의 "최근 소식순" 을 폭 390px 과 1280px 로 캡처해 저장소 밖 /tmp/vct-baseline/ 에 둔다.
2. scripts/dev-server.mjs (배포에는 쓰지 않는 시험용)
   - node 내장 http 만 쓴다. 저장소 루트를 배포와 같은 /VCT-board/ 경로로 서비스한다. 포트와 서비스할 폴더를 인자로 받는다(기본: 저장소 루트).
   - 존재하지 않는 /VCT-board/p/* 와 /VCT-board/t/* 경로는 index.html 에 <base href="/VCT-board/"> 를 넣어 돌려준다(배포의 404.html 동작을 흉내 낸다). / 는 /VCT-board/ 로 보낸다.
3. S1-01 데이터 로더 확장 (js/main.js): 설계노트 S1-01 대로 한다. people, teams 는 선택 파일이고 실패해도 빈 배열로 계속 동작한다.
4. S1-02 인덱스 생성 (js/model.js): buildIndex(D). 설계노트 S1-02 대로 한다. toItem() 의 기존 반환 필드는 바꾸지 않고 새 필드만 붙인다. 임시 ID 충돌(서로 다른 인물이 같은 ID로 묶이는 경우, 예: 동명이인, 선수와 코치의 같은 이름)이 현재 data/ 에 있는지 점검해 결과를 PROGRESS.md 에 적는다.
5. S1-03 ID·경로 유틸 (js/model.js, js/state.js): ID_RE, slugOf, BASE, personUrl, teamUrl, listUrl. BASE 는 js/state.js 의 import.meta.url 기준으로 계산한다.
6. S1-04 라우터 (js/state.js, js/main.js): parseRoute(loc, base) 는 node 에서 시험할 수 있게 인자로 받는다. go(url) 은 pushState 로 이동하고, popstate·hashchange 를 같은 경로로 처리한다. 상세 화면은 2회차에서 만들므로 지금은 임시 화면("상세 화면 준비 중: 종류·id")을 두고 TEMP 주석을 단다. 2회차 S1-07·S1-08 에서 실제 화면으로 바꾼다. 목록 화면은 기존 동작을 그대로 유지한다.

[완료 확인 — 직접 실행하고 결과를 보고에 적는다]
- node 단위 확인: slugOf(악센트, 한자·기호만 있는 이름, 연속 공백), ID_RE, buildIndex(현재 data/ 로 만든 결과에서 한 선수가 players 와 transfers 양쪽 소식으로 묶이는 예 1건), parseRoute(목록 / 인물 / 팀 / 끝 슬래시 없음 / 잘못된 ID).
- V-01: dev-server 로 연 현재 사이트가 /tmp/vct-baseline/ 캡처와 같다.
- dev-server 로 /VCT-board/p/test/ 를 직접 열면 임시 화면이 보인다. 브라우저에서 await import("/VCT-board/js/state.js") 로 같은 모듈을 불러 go() 를 호출해, 주소 변경과 뒤로·앞으로가 되는지 확인한다.

[하지 않는 것] 목록 행 링크화, 상세 화면 구현, 스크롤 복원(S1-05)은 2회차 작업이다.
