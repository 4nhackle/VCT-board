[VCT-board 상세 페이지 구현 — 4회차 / 5]

[역할과 목표]
너는 VCT-board(발로란트 VCT LFT·FA 현황 GitHub Pages 정적 사이트, 저장소 4nhackle/VCT-board)에 선수·팀 상세 페이지를 추가하는 구현을 맡았다. 전체 구현은 5회차로 나뉘어 있고 이번은 4회차다. 이 세션에서는 이번 회차 범위만 구현하고, 다음 회차 작업은 미리 하지 마라.

[먼저 읽을 것]
- docs/ 의 설계 문서 4개(.docx). pandoc -t markdown 으로 읽는다. 문서가 없으면 구현을 시작하지 말고 사용자에게 알려라.
  · VCT-board_사이트코드_변경설계서.docx : 전체 설계 (이번 회차에 해당하는 장은 아래에 적었다)
  · VCT-board_구현체크리스트.docx : 작업 ID, 완료 기준, 선행 작업, 확인 항목(V-xx)
  · VCT-board_설계노트.docx : 작업 ID별 상세 설계
  · VCT-board_예약작업_변경설계서.docx : 참고용(이번 구현 범위 아님). 예약 작업이 매일 data/*.json 을 main에 커밋한다는 점만 기억한다.
- docs/PROGRESS.md : 이전 회차의 완료 작업, 결정·변경, 넘겨받은 주의점. 가장 먼저 읽는다.
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

[이번 회차 범위] 작업 S3-01, S3-02, S3-03, S3-04, S3-05, S3-07. (S3-06 Pages 설정 전환은 사용자 작업이며 5회차에서 한다.)

[할 일]
1. S3-01 팀 상세 (js/views/team.js, 신규): 설계노트 S3-01 대로 한다. 머리부분, 현재 로스터, 들어온 인물, 나간 인물, 관련 소식(watch 포함). 로스터는 career 에 의존하므로 비어 있으면 "로스터 정보는 정리 중입니다" 로 대신한다. 2회차의 팀 링크 임시 화면이 있으면 여기서 실제 화면으로 바꾼다.
2. S3-02 정적 페이지 생성 (scripts/build.mjs, 신규): node scripts/build.mjs [출력 폴더, 기본 _site]. 저장소 파일(index.html, css/, js/, data/, og.png)을 복사하고, people·teams 마다 p/<id>/index.html, t/<id>/index.html 을 만든다. title, description, og:title, og:description, og:url, canonical 을 바꾸고 head 맨 앞에 <base href="/VCT-board/"> 를 넣는다. 설명문은 model.js 의 buildIndex, pillOf 를 import 해서 화면과 같은 규칙으로 만든다. 모든 값은 HTML 이스케이프한다. "/VCT-board/" 는 build.mjs 안의 상수 한 곳에만 둔다. _site/ 를 .gitignore 에 넣는다. people·teams 가 없으면(현재 data/) 상세 페이지 0개로 정상 종료한다.
3. S3-03 사이트맵: _site/sitemap.xml 에 루트 주소와 모든 p/, t/ 주소. lastmod 는 빌드 날짜.
4. S3-04 404 대체 진입점: build.mjs 가 index.html 로 _site/404.html 을 만든다(저장소에 404.html 파일을 따로 두지 않는다). 설계노트 S3-04 의 주의(404 상태에서는 공유 미리보기가 나오지 않는다)를 PROGRESS.md 에 옮겨 적는다.
5. S3-05 배포 워크플로 (.github/workflows/pages.yml): 트리거는 main push, workflow_dispatch, main 외 브랜치 push. 단계는 checkout, setup-node(20), validate, build, upload-pages-artifact, deploy-pages 이고 deploy 는 main 일 때만 실행한다. permissions 는 contents: read, pages: write, id-token: write. concurrency 는 group "pages", cancel-in-progress true.
6. dev-server 에 서비스할 폴더 인자가 이미 있는지 확인하고, 없으면 추가해 _site 를 /VCT-board/ 경로로 서비스할 수 있게 한다.
7. S3-07 3단계 완료 확인: 아래를 실행한다.

[완료 확인]
- 샘플 데이터(scripts/fixtures/)로 build 를 돌려 _site/ 를 만들고 dev-server 로 연다.
- V-08: p/<샘플 id>/index.html 에 선수별 title, og:title, og:description, canonical 이 있다. curl 로 확인한 값을 보고한다.
- V-10: 팀 상세 직접 진입, 팀 상세 ↔ 인물 상세 이동이 된다. 정적 페이지가 없는 주소(임시 ID)는 404.html 대체로 열린다.
- sitemap.xml 이 XML 로 파싱되고, 주소 수가 1 + 샘플 인물 수 + 샘플 팀 수와 같다.
- V-09: 깨진 샘플로 validate 가 실패하면 build/deploy 가 실행되지 않는 구조인지 워크플로 파일로 확인한다. 원격 확인이 가능하면(gh 인증됨) 테스트 브랜치(test/broken-data)에 깨진 데이터를 올려 Actions 의 validate 단계가 실패하는지 보고, 확인 뒤 브랜치를 삭제한다. 원격 확인이 불가능하면 로컬로 대체하고 그 사실을 보고한다.
- 현재 data/ 로 build 가 오류 없이 끝나고 V-01~V-04 가 그대로 통과한다.

[하지 않는 것] main 병합, Pages 설정 변경, docs/ 의 docx 커밋은 하지 않는다.
