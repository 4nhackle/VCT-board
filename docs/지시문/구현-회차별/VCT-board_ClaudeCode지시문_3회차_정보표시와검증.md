[VCT-board 상세 페이지 구현 — 3회차 / 5]

[역할과 목표]
너는 VCT-board(발로란트 VCT LFT·FA 현황 GitHub Pages 정적 사이트, 저장소 4nhackle/VCT-board)에 선수·팀 상세 페이지를 추가하는 구현을 맡았다. 전체 구현은 5회차로 나뉘어 있고 이번은 3회차다. 이 세션에서는 이번 회차 범위만 구현하고, 다음 회차 작업은 미리 하지 마라.

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

[이번 회차 범위] 작업 S2-01, S2-02, S2-03, S2-04, S2-05, S2-06, S2-07, S2-08.

[전제] data/ 에는 아직 people.json, teams.json 이 없다. 이 화면들은 샘플 데이터(scripts/fixtures/)로만 시험하고, 실제 data/ 에서는 값이 없어 숨겨지는 것이 정상이다.

[할 일]
1. S2-01 계산 함수 (js/model.js, 순수 함수): ageOf, contractState, careerOf. today 를 인자로 받아(기본값 TODAY) 시험할 수 있게 한다. 시리얼 ↔ 날짜 변환은 format.js 의 isoOf 를 재사용한다.
2. S2-06 검증용 샘플 데이터 (scripts/fixtures/): people.json, teams.json 과 새 필드(personId, teamId, fromTeam, toTeam, teamIds, signedDate, contractUntil)가 들어간 players·transfers 일부. 실제 선수·팀 정보를 지어내지 말고 가상의 이름과 팀을 쓴다. 현재 데이터의 구조(필드 이름, 날짜 시리얼 정수)를 그대로 따른다. 경계 사례를 포함한다: 생년월일 전날·당일, 연도만 있는 생년, 계약 만료 전날·당일·다음날, 계약 미공개, career 가 빈 인물, teams 에 없는 팀을 참조하는 행.
3. 샘플 사이트 실행 방법: 임시 폴더에 사이트를 복사하고 data/ 를 fixtures 로 바꿔치기해 dev-server 로 연다. 배포 코드에 개발용 분기(?data=fixtures 같은 것)를 넣지 않는다. 이 실행을 한 줄 명령(또는 /tmp 에 두는 스크립트)으로 만들어 PROGRESS.md 에 적는다.
4. S2-02 머리부분 보강 (js/views/person.js): 본명, 나이(연도만 알면 "약 N세"), VLR·Liquipedia 링크(target=_blank, rel=noopener).
5. S2-03 이번 이동 카드: 이전 팀 → 새 팀(또는 소속 팀 · 상태), 보도일과 성사일을 항상 글자로 구분, 신뢰도, 이전·새 계약 만료 상태. 보도일(date)과 성사일(signedDate)을 섞지 않는다.
6. S2-04 팀 카드: 권역(REGION_KO), 국가, 등급(partner → 파트너 팀, ascended → 어센션 팀, challengers → 챌린저스, academy → 아카데미), 운영 종료 표시. teams 에 없는 팀은 이름만 보여준다.
7. S2-05 경력 타임라인 (css/style.css 포함): 최신순, 진행 중 칸 강조, career 가 비면 구역을 숨긴다.
8. S2-07 검증 스크립트 확장 (scripts/validate.mjs): 데이터 폴더를 인자로 받는다(기본 data/). people·teams 가 있을 때만 새 점검을 한다. 오류: 참조 무결성(personId, teamId, fromTeam, toTeam, teamIds, career.team), ID 형식(^[a-z0-9-]+$), people·teams ID 중복, birth 형식. 경고: career 기간 겹침, 인물 정보가 빈 인물. 오류가 있으면 종료 코드 1. 기존 점검은 그대로 둔다.
9. S2-08 2단계 완료 확인: 아래를 실행한다.

[완료 확인]
- 현재 data/ 로 node scripts/validate.mjs 가 이전과 같은 결과로 통과한다.
- V-05: 위 경계 사례에서 나이·계약 만료 상태·경력이 기대한 값이다. node 단위 확인으로 표를 만들어 보고하고, 브라우저에서도 확인한다.
- V-06: 팀 카드의 권역·국가·등급이 샘플 teams 값과 일치한다.
- V-07: 일부러 깨뜨린 샘플(없는 personId, 잘못된 ID 형식, 중복 ID, 잘못된 birth)에서 validate.mjs 가 오류로 종료한다. 각각의 종료 코드를 보고한다.
- V-01~V-04 를 현재 data/ 로 다시 통과한다.

[하지 않는 것] 팀 상세 화면, 정적 페이지 생성(build), 워크플로는 4회차 작업이다.
