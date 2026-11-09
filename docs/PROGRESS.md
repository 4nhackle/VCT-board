# VCT-board 상세 페이지 구현 진행 상황

브랜치: feature/detail-pages · 근거: docs/의 설계서·구현체크리스트·설계노트

## 작업

### 준비 (S0)
- [x] S0-01 저장소 쓰기 권한 연결
- [x] S0-02 작업 브랜치 생성과 기준 확인

### 1단계: ID·라우팅·인물 상세 뼈대 (S1)
- [x] S1-01 데이터 로더 확장
- [x] S1-02 인덱스 생성
- [x] S1-03 ID·경로 유틸
- [x] S1-04 라우터
- [x] S1-05 목록 상태·스크롤 복원
- [x] S1-06 목록 행 링크화
- [x] S1-07 링크 클릭 가로채기·화면 전환
- [x] S1-08 인물 상세 뼈대
- [x] S1-09 상세 기본 스타일
- [x] S1-10 1단계 완료 확인

### 2단계: 인물·팀 정보 표시와 검증 (S2)
- [x] S2-01 계산 함수
- [x] S2-02 머리부분 보강
- [x] S2-03 이번 이동 카드
- [x] S2-04 팀 카드
- [x] S2-05 경력 타임라인
- [x] S2-06 검증용 샘플 데이터
- [x] S2-07 검증 스크립트 확장
- [x] S2-08 2단계 완료 확인

### 3단계: 팀 상세·정적 페이지·배포 (S3)
- [x] S3-01 팀 상세
- [x] S3-02 정적 페이지 생성
- [x] S3-03 사이트맵
- [x] S3-04 404 대체 진입점
- [x] S3-05 배포 워크플로
- [x] S3-06 Pages 배포 방식 변경
- [x] S3-07 3단계 완료 확인

### 마무리 (S4)
- [x] S4-01 main 병합과 배포
- [ ] S4-02 문서 커밋 (이 PR 이 병합되면 완료)
- [ ] S4-03 예약 작업 전환 준비 완료 알림

## 결정·변경
- (1회차) pandoc 이 설치돼 있지 않아 docx 는 python(zipfile + XML)으로 본문을 추출해 읽었다. 문서 내용에는 영향 없음.
- (1회차, S0-02) 기준 캡처는 `python -m http.server` 로 저장소 루트(/)를 열어 Playwright 로 찍었다. 위치: 저장소 밖 $TEMP/vct-baseline. 탭 6개 + 선수 탭 최근 소식순, 폭 390·1280, 각 .png 와 .page DOM(.html).
- (1회차, S0-02) 폭 390 에서 탭·지역 줄의 가운데 맞춤(scrollLeft)이 폰트 로드 시점에 따라 흔들려, 같은 코드끼리도 캡처가 달라졌다. 비교용 캡처는 찍기 직전 #tabs·#regions 의 scrollLeft 를 0 으로 고정한다(캡처 스크립트만의 처리, 사이트 코드는 그대로).
- (1회차, S1-03) slugOf 가 S1-02 에 필요해 S1-03 을 S1-02 보다 먼저 했다(S1-03 의 선행은 S0-02 뿐이라 체크리스트 순서와 충돌 없음). 해시는 FNV-1a 32비트를 36진수로 쓴다.
- (1회차, S1-02) buildIndex 의 kind 는 toItem 의 kind 그대로("player", "coach", "t", "watch")다. watch 행은 인물 ID 가 없고 item.tids(배열)만 붙인다. 이적 행의 from·to 가 같은 팀이면 byTeam 에 한 번만 넣는다.
- (1회차, S1-02) 임시 ID 충돌 점검(현재 data/, 2026-10-31):
  - 인물: 충돌 없음. 한 임시 ID 에 서로 다른 이름 표기가 묶이거나 선수·코치가 섞인 경우 0건, 같은 파일 안에서 같은 ID 가 두 행 이상인 경우(동명이인 후보) 0건.
  - 팀 `leviatan`: "Leviatán" 과 "LEVIATÁN" 이 묶인다. 같은 팀이므로 의도대로다.
  - 팀 `sentinels`: players 의 TenZ 행 팀 칸 "(은퇴 · 전 Sentinels)" 이 한글·기호가 빠지며 Sentinels 와 같은 ID 가 된다. 그래서 임시 ID 로는 TenZ 소식이 Sentinels 팀 소식에 섞인다. 설계(slugOf 규칙)를 바꾸지 않고 그대로 두었다. 시트에 teamId 가 채워지면 해결된다. 3회차 팀 상세(S3-01) 전까지 데이터가 그대로면 다시 판단한다.
- (1회차, dev-server) 설계노트 S1-10 은 `<base href="/">` 로 적었지만, 1회차 지시문과 S3-04(배포 404.html)에 맞춰 `/VCT-board/` 경로로 서비스하고 `<base href="/VCT-board/">` 를 넣는다. 배포의 404.html 처럼 응답 상태는 404 로 둔다. 노드 스크립트 문체는 기존 scripts/validate.mjs(const·화살표 함수)를 따랐다.
- (1회차, S1-01) people·teams 가 없으면 브라우저가 네트워크 404 를 콘솔에 "Failed to load resource" 로 남긴다. 이는 브라우저 자체 기록이라 코드로 막을 수 없다. 앱 코드는 console.error 를 남기지 않는다. 파일은 있으나 JSON 이 깨졌거나 배열이 아니면 빈 배열로 둔다.
- (1회차, S1-04) go(url) 은 pushState 후 popstate 이벤트를 직접 보내, main.js 가 뒤로·앞으로와 같은 renderRoute 로 다시 그린다(state.js 가 main.js 의 render 를 알 필요가 없게). parseRoute 는 p/·t/ 아래인데 id 가 ID_RE 에 맞지 않거나(디코딩 실패 포함) 경로가 더 깊거나 id 가 없으면 {view: "notfound"} 를 돌려준다. 상세 화면의 document.title 변경은 S1-07(2회차) 몫이라 이번에는 바꾸지 않았다.
- (1회차, git) 이 PC 에 git 사용자 정보가 없어서, 저장소 기존 커밋과 같은 `4nhackle <347648258+4nhackle@users.noreply.github.com>` 을 이 저장소에만(local config) 설정했다.

## 1회차 기록 (2026-10-31)
- 완료: S0-02, S1-01, S1-02, S1-03, S1-04, scripts/dev-server.mjs
- 변경 파일: js/main.js, js/model.js, js/state.js, scripts/dev-server.mjs(신규), docs/PROGRESS.md(신규)
- 확인(직접 실행):
  - node 단위: slugOf(악센트 "Leviatán"→leviatan, 연속 공백 "luk   xo"→luk-xo, 한자 "王者"·기호 "★☆"·한글·빈 값→"x-"+해시이고 ID_RE 통과), ID_RE(허용·거부 예), buildIndex(OXY 가 players·transfers 양쪽 소식으로 묶임, toItem 기존 필드 불변·pid/tid 만 추가, 소식 148행 전부 인덱스에 들어감, personId·teamId·teamIds 우선 사용, 빈 데이터), parseRoute(목록 / 인물 / 팀 / 끝 슬래시 없음 / 잘못된 ID·깨진 % 인코딩·깊은 경로 / 루트 "/" 배포) 모두 통과.
  - V-01: 기준 캡처 14장(.png + DOM)과 dev-server(/VCT-board/) 캡처, python http.server(/) 캡처 모두 바이트 단위로 같음. people.json 을 깨진 JSON, teams.json 을 정상 배열로 둔 임시 사이트도 같음. 필터·검색·정렬·탭·뒤로/앞으로 16단계 조작 결과 DOM 이 main 코드와 같음.
  - BASE: / 에서 "/", /VCT-board/ 에서 "/VCT-board/" (브라우저에서 확인).
  - dev-server 로 /VCT-board/p/test/ 직접 진입 시 임시 화면 표시(상태 404), 탭·요약·필터·참고 숨김. 브라우저에서 import("/VCT-board/js/state.js") 의 go() 로 목록→p/oxy/→t/cloud9/ 이동 후 뒤로 3번·앞으로 3번이 순서대로 동작, 목록 복귀 시 탭 복원, pageerror 없음.
- 확인 도구는 저장소 밖(%TEMP%\vct-check: capture.mjs, compare.mjs, interact.mjs, route.mjs, unit-*.mjs)에 있다. 저장소에 package.json·node_modules·캡처를 남기지 않았다.

## 2회차 결정·변경 (2026-10-31)
- (2회차, S1-05) 상세로 가기 직전 목록 항목의 history.state 에 {y, region, status, order, q} 를 적는다(replaceState). 뒤로 오면 이 값을 되살리고 scrollTo 한다. 검색창은 입력 원문(trim 전)을 저장해 그대로 되돌린다. history.scrollRestoration = "manual".
- (2회차, S1-06) 목록 항목(toItem 결과)에 pid·tid 를 붙이는 것은 model.js 의 idsOf(r, kind) 로 한다. buildIndex 와 buildTabs 가 같은 함수를 쓴다. 이적 행의 tid 는 이전 팀(tidFrom)이고, 다음 팀은 링크하지 않는다(체크리스트 S1-06 과 같다).
- (2회차, S1-06) watch 행의 팀 칸은 " / " 로 나눠 팀마다 링크한다. 글자가 여러 링크로 나뉘어 글리프 간격이 서브픽셀 단위로 달라져, V-01 픽셀 비교에서 watch 행 이름 영역만 2127px 가 다르다(390·1280 모두). 육안으로는 같다. 단일 텍스트로 되돌리면 같아지지만 팀 링크를 잃으므로 그대로 둔다.
- (2회차, S1-06) 팀 머리글(h3.th)은 그 그룹 첫 행의 tid 를 쓴다.
- (2회차, S1-07) 가로채기는 같은 출처의 BASE+"p/" 또는 BASE+"t/" 만 대상이다. "← 목록으로" 는 data-back 으로 표시하고, 목록에서 왔으면(FROM_LIST) history.back(), 아니면 #players 주소로 go() 한다. 상세에서는 헤더(사이트 제목·설명)는 그대로 둔다. 설계는 헤더를 숨기라고 하지 않았다.
- (2회차, S1-07) 임시 인물 화면은 제거했다. 팀 상세는 아직 임시 화면이다(TEMP, showDetail). 3단계 S3-01 에서 교체한다.
- (2회차, S1-08) 국적·역할은 people 값 우선, 없으면 소식 행을 최신순으로 훑어 처음 나오는 값을 쓴다(선수는 position, 코치는 role). 현재 data/ 에는 people.json 이 없어 모든 인물 화면에 "선수 정보는 정리 중입니다." 가 나온다(설계대로).
- (2회차, S1-08) 1회차 route.mjs 의 기대값(p/test/ 임시 화면)은 이제 "찾을 수 없는 선수입니다" 다. 기능 변경에 따른 것이다.
- (2회차, 알려진 한계) 팀 임시 ID 충돌 때문에 TenZ 행의 팀 링크("(은퇴 · 전 Sentinels)")가 /t/sentinels/ 로 간다. 시트 teamId 가 채워지기 전까지 그대로다. 사용자 결정(2회차): 그대로 둔다. 시트 teamId 가 채워질 때까지 TenZ 팀 링크는 /t/sentinels/ 를 가리킨다.

## 2회차 기록 (2026-10-31)
- 완료: S1-05, S1-06, S1-07, S1-08, S1-09, S1-10
- 변경 파일: js/model.js(idsOf·buildIndex·buildTabs), js/components/row.js(링크), js/views/regions.js(팀 머리글 링크), js/views/person.js(신규, 인물 상세), js/main.js(클릭 가로채기·스크롤·상세 화면), css/style.css(링크 모양, .detail-page·.dp-*)
- 커밋: S1-06 과 S1-05·S1-07~S1-09 는 파일 단위로 나눠 두 커밋으로 묶었다(main.js·style.css 가 여러 작업에 걸쳐 있어 작업별로 자르지 못했다). 커밋 메시지에 포함 작업을 모두 적었다.
- 확인(직접 실행, 브라우저: Playwright, 저장소 밖 %TEMP%ct-check):
  - V-01: 목록 14장 중 watch 두 장 외에는 픽셀이 기준과 같다(위 결정 참고). DOM 차이는 링크 태그뿐이다.
  - V-02: 선수 탭에서 지역 Americas·구직 중·검색 "a "·최근 소식순 설정 → 700px 스크롤 → 이름 클릭(상세 열림, 스크롤 0) → 뒤로: 탭·지역·상태·정렬·검색 값·스크롤 700 이 같다. 상세의 "← 목록으로" 도 같은 결과.
  - V-03: /VCT-board/p/oxy/ 직접 진입, 새로고침(같은 화면, 제목 "OXY · VCT LFT·FA 현황"), /p/no-such-person/ 는 "찾을 수 없는 선수입니다". 직접 진입 뒤 "← 목록으로" 는 #players 목록.
  - V-04: Ctrl 클릭과 가운데 클릭은 새 탭(/p/tenz/, /p/jackk/), 원래 화면은 목록 그대로. 출처 링크는 target=_blank rel=noopener 외부 주소 그대로.
  - 임의 5명 상세: 무작위 추출(실행마다 다름). 확인한 예: jinggg, oxy, alvinboy, spaz, jerrwin, d3ffo, meiy. 모두 머리부분과 소식이 보이고 페이지 오류 없음.
  - 360px·1280px, 라이트·다크 상세 캡처: %TEMP%ct-check\s1-10\detail-oxy-{360,1280}-{light,dark}.png. 육안 확인: 줄바꿈과 배지 간격 정상, 가로 넘침 없음.
  - 팀 링크: 팀 머리글 → /t/cloud9/ 임시 화면(제목 "cloud9 · …"), "← 목록으로" 로 같은 탭 복귀.
- 확인하지 않은 것: 실제 data 의 people.json 이 없어 people 값 우선 경로는 확인하지 못했다(2단계 샘플 데이터에서 확인). 실제 배포 주소(4nhackle.github.io)는 아직 안 올렸다.

## 3회차 결정·변경 (2026-10-31)
- (3회차, 날짜 일련번호) 기준일 2026-10-31 은 일련번호 46326 이다(isoOf 기준). 1회차·2회차 메모의 번호 대응은 맞지만, 설계서 예시의 "contractUntil 46328 → 2026-11-01"은 isoOf 와 맞지 않는다(46328 은 2026-11-02). 예시 주석일 뿐 데이터는 바뀌지 않았다. 변환은 기존 format.js 의 isoOf 를 그대로 썼다. 설계서 예시 값은 나중에 정리하면 된다.
- (3회차, S2-01) ageOf(birth, today)·contractState(until, today)·careerOf(p) 는 model.js 에 두고 today 기본값은 TODAY. model.js 가 format.js 에서 TODAY·isoOf 를 가져오는 import 가 생겼다(둘 다 DOM·state 를 쓰지 않는다).
- (3회차, S2-07) validate.mjs 는 인자로 데이터 폴더를 받는다(기본 data/). people·teams 파일이 있을 때만 점검한다. ID 형식과 참조 형식(personId·teamId·fromTeam·toTeam·teamIds·career.team)은 값이 있으면 항상 본다. 참조 존재 여부는 그 파일이 있을 때만 본다. 경고(경력 겹침, people 행 없음, 국적·역할 빈 칸, 소식 인물의 people 행 없음)는 종료 코드 0, 오류만 1.
- (3회차, S2-06) 샘플은 scripts/fixtures/ 에 가상 이름으로 두었다(인물 6명, 팀 4개, 소식 8행). 경계 사례: 생일 전날(FX TWO, 24세)·당일(FX ONE, 25세)·다음날(FX FOUR, 25세), 연도만(FX THREE, 약 25세), 계약 만료 어제(FX TWO, 만료됨)·오늘(FX ONE, 오늘 만료)·내일(FX FOUR, D-1), 계약 미공개(FX THREE), 경력이 빈 인물(FX THREE), 운영 종료 팀(Delta Test). 샘플은 오류 0, 경고 0 으로 통과한다.
- (3회차, S2-06) 샘플에 "teams 에 없는 팀" 행은 넣지 않았다. 설계(6.2)상 그 참조는 오류라서 샘플이 validate 를 통과하지 못하기 때문이다. 대신 표시 경계는 임시 복사본에서 teams.json 의 fx-epsilon 을 빼고 확인했다(이름만 보이고 링크는 그대로, 확인함).
- (3회차, S2-03) 신뢰도는 기존 배지(conf R → "단일 출처")만 쓴다. conf C 가 무엇을 뜻하는지 문서에 없어서 다른 말을 붙이지 않았다.
- (3회차, S2-03) 이번 이동 카드: 가장 최근 소식이 이적이면 "이전 팀 → 새 팀", 공식 발표는 signedDate 가 있으면 "공식 발표 M/D", 없고 conf R 이면 "공식 발표 전". 이전 계약은 가장 최근의 비이적 행 contractUntil, 없으면 people.contractUntil. 소속 팀 카드(LFT·FA)는 "계약 만료" 한 줄만 낸다.
- (3회차, S2-04) 팀 카드 대상은 설계 5.1 대로 이적의 이전·새 팀과 현재 소속(career 진행 중 칸)이다. 과거 경력의 팀은 카드로 만들지 않는다(경력 타임라인에는 있다).
- (3회차, S2-05) 경력 칸에 "진행 중" 글자를 덧붙였다(설계 5.1 에는 강조만 있었음). 경력 칸의 팀은 teams 에 없어도 팀 상세 링크를 유지한다.
- (3회차, S2-02) 머리부분에 본명(people.realName)과 VLR·Liquipedia 링크를 넣었다. 링크는 http(s) 주소만 낸다. 나이는 people.birth 가 있을 때만 보인다.
- (3회차) 실제 data/ 에서 이번 회차 화면 변화는 없다(people 파일이 없어서). 2회차 V-01~V-04 와 목록 V-01 픽셀 비교를 다시 돌렸고 결과는 2회차와 같다(watch 이름 2장 서브픽셀 차이는 그대로).

## 샘플 사이트로 시험하는 법
```bash
node scripts/fixture-site.mjs "$TEMP/vct-fixture"
node scripts/dev-server.mjs 8705 "$TEMP/vct-fixture/_site"
```
열기: http://127.0.0.1:8705/VCT-board/p/fx-one/ (상세). fx-two, fx-three, fx-four, fx-five, fx-coach 도 있다. 2026-11-08 PR 15: 샘플 폴더가 상세 페이지까지 빌드하도록 고쳤다(예전에는 build.mjs 가 실패해 404였다).

## 3회차 확인 결과 (직접 실행)
- 현재 data/ 로 validate: 1회차와 출력이 같다(`출처 89개, 행 165개 점검: 오류 0, 경고 9`, 종료 코드 0). 출력 비교로 확인.
- node 단위(S2-01, 표): ageOf 생일 당일 25세, 전날 24세, 다음날 25세, 연도만 약 25세(approx), 빈 값·형식 위반 null. contractState 어제 만료 "만료됨"(-1), 당일 "오늘 만료"(0), 내일 "D-1", 미공개 "미공개". careerOf 최신순, 진행 중 칸 current.
- V-05 (브라우저, 샘플, 기준일 2026-10-31): FX ONE 25세·오늘 만료(2026-10-31), FX TWO 24세·만료됨(2026-10-30), FX FOUR 25세·D-1(2026-11-01), FX THREE 약 25세·미공개, FX FIVE 24세·미공개. 각 기대값은 model.js 함수로 계산해 화면 텍스트와 맞췄다.
- V-06 (브라우저): 팀 카드 6장의 권역·국가·등급·운영 종료가 teams.json 과 모두 일치. fx-delta 는 "운영 종료". 누락 팀(임시 복사본)은 이름만, 링크 유지.
- V-07 (깨뜨린 샘플, 임시 폴더, 종료 코드): b1 없는 personId → 1, b2 잘못된 ID 형식(teams id "FX Alpha") → 1, b3 people ID 중복 → 1, b4 잘못된 birth "2001-13-01" → 1, b5 경력 겹침 → 0(경고만), b6 teams 에서 참조된 팀 제거 → 1. 샘플 원본 → 0.
- V-01~V-04 (현재 data/): s1-10 스크립트 다시 실행, 모두 통과(상세 진입·뒤로·스크롤·Ctrl/가운데 클릭·출처 링크). 임의 5명 상세 오류 없음. 목록 V-01 픽셀 비교: 2회차와 같다.
- 캡처: 샘플 FX ONE 360 라이트, 1280 다크를 찍어 육안 확인(줄바꿈·경력 점·팀 카드 정상). 다크 모드 값은 변수만 써서 대응(육안 확인은 1280 다크만).
- 확인하지 못한 것: 실제 people.json·teams.json 이 없어서 실데이터에서 새 필드 화면은 보지 못했다. 설계상 4회차(build)와 팀 상세(3단계)는 이번 범위가 아니다.

## 4회차 결정·변경 (2026-10-31)
- (요청 1, idsOf) 이름이 빈 행은 인물 ID 를 만들지 않는다(pid ""). 그래서 byPerson 에 들어가지 않고 목록의 이름 링크도 없다(글자만). validate 의 인물 점검도 빈 ID 는 건너뛴다. 팀 ID 도 이름이 없으면 만들지 않는다(기존 동작).
- (요청 2, slugOf) 결합 문자 범위를 소스에 ̀-ͯ 이스케이프로 적었다. 이전에는 실제 결합 문자가 소스에 들어 있었다(같은 범위, 표기만 다름). 동작은 같다: Leviatán→leviatan, Ñandú→nandu.
- (요청 3, .gitignore) 저장소 루트 .gitignore 에 `_site/`(빌드 산출물)와 `.impeccable/`(디자인 점검 도구 설정)을 넣었다. .impeccable/ 은 커밋하지 않았다.
- (S3-01) 팀 상세: 현재 로스터 = 진행 중 경력 칸이 이 팀인 인물(선수 먼저, 코치 다음). 들어온 인물 = 이적의 toTeam. 나간 인물 = 이적의 fromTeam 과, 이 팀 소속으로 나온 LFT·FA 행(인물당 가장 최근 소식 하나). 들어온·나간 구역은 비면 숨긴다. 로스터가 비면 "로스터 정보는 정리 중입니다." 로 대신한다. 관련 소식은 watch 포함, 지켜볼 팀 줄은 대상과 메모를 보여 준다.
- (S3-01) teamMoves·newestFirst·TIER_KO·teamNameOf 를 model.js 로 옮겼다(화면과 build 가 같은 규칙을 쓰도록). teamNameOf 는 teams.json 이 없을 때 소식 행의 이름(이적은 이전 팀 쪽)을 쓴다.
- (S3-02) build.mjs 는 SITE_PATH("/VCT-board/")와 SITE_ORIGIN 을 파일 맨 위 상수 두 곳에만 둔다. <base href> 는 p/·t/·404.html 에만 넣고, 루트 index.html 은 원본 그대로 복사한다. 설명문은 설계서 6.1 대로 model.js 의 pillOf·newestFirst 로 만든다(이적 "보도|확정"은 signedDate 유무).
- (S3-02) build.mjs 는 OUT 이 저장소 루트를 포함하면 거부한다. 샘플 사이트를 만들 때는 fixture-site.mjs 가 build.mjs 를 함께 복사하고, 그 사본에서 실행한다(data/ 를 샘플로 바꾼 사본).
- (S3-03) sitemap.xml 의 lastmod 는 빌드 날짜(KST, TODAY). 주소는 루트 + p/ + t/ = 1 + 인물 수 + 팀 수.
- (S3-04) 404.html 은 index.html 원본에 <base href="/VCT-board/"> 를 넣은 파일이다(build.mjs 가 만든다). 저장소에는 따로 두지 않는다.
- (S3-04 주의, 설계노트 그대로) GitHub Pages 는 없는 주소에 HTTP 404 를 준다. 그래서 404 로 들어온 상세 주소는 공유 미리보기(제목·설명)가 나오지 않는다. 미리보기는 정적 페이지(p/<id>/, t/<id>/)만 낸다. 404 대체 화면은 앱이 주소를 읽어 상세를 그릴 뿐이다.
- (S3-05) pages.yml 은 on: push(모든 브랜치)와 workflow_dispatch. 단계는 validate → build → upload-pages-artifact 이고, deploy-pages 는 needs: build 와 if: main 이다. validate 가 실패하면 build 와 deploy 가 실행되지 않는다.
- (S3-05 위험) concurrency group "pages" 는 설계대로 모든 브랜치가 같은 그룹을 쓴다. 그래서 main 이 배포 중일 때 다른 브랜치를 push 하면 main 의 배포가 취소될 수 있다(cancel-in-progress). 설계를 바꾸지 않고 적어 둔다. 5회차 전에 결정이 필요할 수 있다.
- (S3-05) actions 는 major 버전으로 고정(checkout v4, setup-node v4, upload-pages-artifact v3, deploy-pages v4). node 20.
- (S3-06) 사용자 작업(Pages Source 를 GitHub Actions 로 바꾸기)은 하지 않았다. 5회차.
- (dev-server) 폴더 인자는 이미 있었다(`node scripts/dev-server.mjs [포트] [폴더]`). 바꾸지 않았다. _site 를 `node scripts/dev-server.mjs 8707 _site` 로 연다. 없는 p/·t/ 주소는 404 상태에 base 넣은 index.html 을 돌려준다(404.html 흉내).

## 4회차 확인 결과 (직접 실행)
- S3-01 팀 상세(샘플, 브라우저): 직접 진입(/t/fx-beta/), 팀→인물, 인물→팀, 뒤로 동작. 로스터(FX FOUR 선수·FX ONE 선수), 들어온(FX ONE), 나간(FX THREE, FX FOUR 의 LFT 행), 관련 소식(watch 포함) 표시. fx-delta 운영 종료 표시. 없는 팀(/t/fx-gamma-none/)은 "찾을 수 없는 팀입니다". 오류 없음.
- S3-02 build (샘플): `node scripts/build.mjs _site` → 인물 6쪽, 팀 4쪽, sitemap 주소 11개. 현재 data/ 는 인물 0쪽, 팀 0쪽, sitemap 1개, 오류 없이 종료(0).
- V-08 (curl, 샘플 _site 를 dev-server 8707 로 서비스):
  - /VCT-board/p/fx-one/index.html: title "FX ONE · VCT LFT·FA 현황", og:title 같음, og:description "FX ONE · Alpha Test → Beta Test 이적 보도", canonical https://4nhackle.github.io/VCT-board/p/fx-one/, base /VCT-board/ 있음.
  - /VCT-board/t/fx-alpha/index.html: title "Alpha Test · VCT LFT·FA 현황", description "Alpha Test · 아메리카 · 들어온 0명 · 나간 4명", canonical .../t/fx-alpha/.
- V-10: 팀 상세 직접 진입, 팀 상세 ↔ 인물 상세 이동과 뒤로 동작(샘플, 정적 페이지 있는 주소). 정적 페이지가 없는 임시 ID(/p/fx-six/, data 에 있으나 people 행 없음): HTTP 404 상태로 열리고 앱이 인물 상세를 그림(title "FX SIX · VCT LFT·FA 현황"). 없는 ID(/p/zzz-none/)는 "찾을 수 없는 선수입니다".
- sitemap.xml: XML 파싱 성공(Python ElementTree), loc 11개 = 1 + 인물 6 + 팀 4.
- V-09: 원격 확인 불가. gh 가 설치돼 있지 않다(gh: command not found). GitHub API 를 직접 쓰는 방법은 확인하지 않았다. 그래서 테스트 브랜치(test/broken-data)는 만들지 않았다. 대체 확인: (a) pages.yml 을 js-yaml 로 파싱해 needs·if·단계 순서를 확인, (b) 깨진 샘플 b1(없는 personId)·b4(잘못된 birth)에서 validate 가 exit 1 이므로 워크플로의 뒤 단계(build·deploy)가 실행되지 않는 순서임을 확인. 실제 Actions 실행은 사용자 확인이 필요하다.
- 현재 data/: validate 는 1회차와 같은 출력(오류 0, 경고 9). build 는 오류 없이 끝남. V-01~V-04(s1-10) 모두 통과, 목록 V-01 은 2회차와 같다.
- 샘플 V-05·V-06 는 이전 회차와 같다(s2-fixture 통과).

## 5회차 결정·변경 (2026-10-31)
- (요청 1, concurrency) pages.yml 의 concurrency 를 `group: pages-${{ github.ref }}`, `cancel-in-progress: true` 로 바꿨다(설계 변경). 4회차에 적은 위험(다른 브랜치 push 가 main 배포를 취소)은 이것으로 없어진다. 같은 브랜치의 연속 push 는 여전히 마지막 것만 남는다.
- (요청 2, V-09) 4회차의 로컬 대체 확인을 원격으로 했다(아래 확인 결과).
- (요청 3) '다음 회차에 알릴 점'에서 팀 상세 임시 화면 메모를 지웠다(3회차 S3-01 에서 이미 실제 화면으로 바꿨다).

## 5회차 확인 결과 (병합 전 점검, 직접 실행)
- validate (현재 data/): 오류 0, 경고 9. 1회차와 같다.
- validate (샘플 scripts/fixtures): 오류 0, 경고 1(FX SIX 의 people 행 없음, 의도된 경고).
- build (현재 data/, 임시 폴더): 인물 0쪽, 팀 0쪽, sitemap 1개, 오류 없음. 404.html·sitemap.xml 생성.
- build (샘플, 임시 폴더): 인물 6쪽, 팀 4쪽, sitemap 11개.
- V-01 (목록, 빌드 산출물 서비스): 14장 중 watch 이름 2장만 픽셀 차이(2회차와 같음).
- V-02·V-03·V-04 (현재 data/, 빌드 산출물): 통과(s1-10). 페이지 오류 없음.
- V-08 (샘플 _site): p/fx-one/index.html 과 t/fx-alpha/index.html 의 title·og:title·og:description·canonical 확인. 실제 data/ 는 people 이 없어 정적 상세 페이지 0개(실제 사이트에서 V-08 은 확인할 수 없음, 예약 작업 전환 후).
- V-10 (샘플 _site): 팀 직접 진입, 팀↔인물 이동, 뒤로 동작, 임시 ID(/p/fx-six/)는 HTTP 404 로 열리고 앱이 상세를 그림. 없는 ID 는 "찾을 수 없는 선수입니다".
- V-09 (원격, gh 사용): test/broken-data 브랜치에 깨진 data/people.json(birth "2001-13-01") 을 push → Actions run 41201157811. 결과: build job 의 "데이터 검증" 단계 failure, "정적 페이지 빌드"·upload 단계 skipped, deploy job skipped(conclusion skipped). 확인 뒤 원격·로컬 브랜치 삭제 완료.
- 참고: validate 에 people.json 이 생기면 people 행 없는 인물마다 경고가 쏟아진다(깨진 샘플에서 140건). 경고는 종료 코드에 영향 없음. 5회차 S4-03 의 시트 인물 탭 추가 때 경고가 정상적으로 줄어야 한다.
- 참고: Actions 로그에 "ubuntu-latest 라벨이 2026-10-19 부터 Ubuntu 26 으로 옮겨진다"는 경고가 나왔다. 배포에는 아직 영향이 없지만, 문제가 생기면 runs-on 을 고정 버전으로 바꾼다.

## 5-1회차 검토 수정 (병합 전 외부 검토 반영)
결과 요약: R-01~R-09 모두 고쳤다. 재현은 각 항목에서 확인했고, R-01 만 재현을 실행하지 않았다(아래).

- R-01 출력 폴더 보호 (scripts/out-dir.mjs 신규, build.mjs, fixture-site.mjs): 저장소 루트, 저장소의 상위 폴더, 저장소 안 폴더를 거부한다. 단 build 의 저장소 안 _site 만 예외다. 비어 있지 않은 폴더는 표시 파일 `.vct-build-output` 이 있을 때만 지운다. 표시 파일은 폴더를 만들 때 항상 쓴다. 기본 출력은 저장소 안 `_site`.
  - 확인: 판정 함수 시험 10가지(루트·상위·안쪽·_site 예외·드라이브 루트·대소문자), 표시 파일 없는 폴더는 던지고 파일 유지, 표시 파일 있는 폴더는 지우고 같은 폴더 재실행 정상. 모두 내가 만든 임시 폴더에서 했다.
  - 재현 미실행: 인자로 `js` 나 `..` 를 넘기는 실제 명령은 실행하지 않았다. 권한 거부(자동 승인 정책)로 막혔다. 그 명령은 저장소 상위 폴더를 지울 수 있는 것이었다. 대신 판정 함수와 시험으로 확인했다. 명령 단위 확인은 사용자가 원하면 임시 저장소 사본에서 따로 한다.
- R-02 경력 날짜: person.js 의 career.from·to 출력에 esc 적용. validate 는 yyyy-mm(월 01~12)을 오류로 검사하고, to 는 null 허용.
  - 재현: 수정 전 샘플(career.from = `<img src=x onerror=alert(1)>`)은 img 요소가 생기고 대화상자가 떴다. 수정 후 글자로만 보이고 대화상자 0, img 0.
  - validate: `<img…>`, `2023-13`, `2023-3`, `2023` 은 모두 오류 종료 1. `to=null` 은 정상(종료 0).
  - innerHTML 점검 목록(R-02 추가 항목): js/views, js/components, js/main.js, js/format.js 의 HTML 조립 지점을 훑었다. 데이터 값이 esc 없이 들어간 곳은 career.from·to 뿐이었다. main.js 의 g.title·t.label·t.id·t.size 는 코드에 적힌 고정값이라 제외. href 는 esc + http(s) 검사 유지.
- R-03 상속 속성 이름 (model.js, main.js): buildIndex 의 people·teams·byPerson·byTeam 과 REGION_KO·TIER_KO 를 Object.create(null) 로 만들었다. 출처 조회(toItem)와 validate 의 출처 키 검사는 자기 속성만 본다(own, hasOwnProperty).
  - 재현: 수정 전 이름 constructor 인 행에서 `map[id].indexOf is not a function` 로 buildIndex 가 멈췄다. 수정 후 목록·인물 상세(constructor, toString) 정상, 콘솔 오류 없음.
- R-04 시작 전 경력: careerOf(p, today) 가 current(끝 없음, 시작 달이 오늘 이전이거나 같음)와 upcoming(끝 없음, 시작이 이후)을 나눈다. 예정 칸은 로스터에 넣지 않고, 인물 경력 타임라인에 "예정" 으로 보인다.
  - 확인: 기준일 2026-10-31 에서 2026-09, 2026-10 은 current, 2026-11 은 upcoming. 끝난 칸은 둘 다 아님. 화면 확인: fx-beta 로스터에서 예정 인물 제외, fx-one 경력에 "예정" 표시.
- R-05 teamIds 가 문자열일 때: idsOf 가 tids 를 항상 배열로 만든다. validate 는 "teamIds 는 배열이어야 합니다"를 오류로 낸다(ID 형식 오류가 아니다. 문자열 "fx-alpha" 자체는 ID 형식이 맞다). 확인: 목록 지켜볼 팀 행 1개 정상, 오류 0, validate 오류 1(종료 1).
- R-06 단위 시험 scripts/test.mjs(node:assert, 13개): ageOf(생일 전날·당일·다음날, 연도만), contractState(어제·오늘·내일·미공개), careerOf(경계 달, 순서), slugOf, ID_RE, parseRoute, buildIndex(이중 소식, toItem 불변, 빈 이름, 상속 이름, teamIds 문자열), teamMoves(예정 제외), out-dir 판정. 모든 날짜는 기준일 인자로 고정. pages.yml 의 build job 에서 validate 앞에 실행한다(Actions 실행은 아래 확인).
- R-07 dev-server 서비스 범위: index.html, 404.html, sitemap.xml, og.png 와 css/, js/, data/, p/, t/ 아래만. 확인: .git/config, scripts/validate.mjs, docs/PROGRESS.md, `js/../.git/config`(인코딩된 경로 포함)는 404. 빌드 산출물 폴더에서도 sitemap·404·css 는 200.
- R-08 정리: hashTab(state.js)과 stampOf import(person.js) 제거. 인물·팀 화면이 함께 쓰던 val, TAB_NAME, nameLink, 소식 줄 함수를 js/views/common.js 로 옮겼다. 변경 전후 상세 화면 HTML 11쪽(인물 7, 팀 4)을 바이트 단위로 비교해 같음을 확인했다. 단, 날짜가 없는 소식 줄은 이전에 인물 화면이 앞에 " · " 를 붙이던 것을 팀 화면 방식(빈 칸 건너뜀)으로 맞췄다. 날짜 있는 데이터에서는 결과가 같다.
- R-09 워크플로·빌드: runs-on 을 ubuntu-24.04 로 고정(두 job). 산출물 업로드 단계는 main 에서만 실행(검증과 빌드는 모든 브랜치). build.mjs 는 people 또는 teams 가 없으면 "경고  상세 정적 페이지 0개(people/teams 없음)" 한 줄을 내고 계속한다. validate 경고가 10건을 넘으면 파일·종류별 개수와 앞 5건만 낸다(시험: 140건 → 종류 5개 + 5건).

고치지 않은 것과 이유:
- js/main.js 분리: 검토 의견이지만 이번 지시대로 하지 않았다.
- 현재 데이터의 정적 상세 페이지 0개: 설계상 알려진 한계다. 빌드를 실패시키면 배포가 막히므로 경고 한 줄만 낸다.

확인 결과 (5-1회차, 직접 실행):
- node scripts/test.mjs: 13개 통과.
- validate (현재 data/): 오류 0, 경고 9(1회차와 같음). validate (샘플 fixtures): 오류 0, 경고 1(FX SIX 의 people 행 없음, 의도된 경고).
- build (현재 data/, 임시 폴더): 인물 0쪽, 팀 0쪽, 경고 한 줄, 오류 없음. build (샘플, 임시 폴더): 인물 6쪽, 팀 4쪽, sitemap 11개.
- V-01 (목록, 빌드 산출물 서비스): watch 이름 2장만 픽셀 차이(2회차와 같음).
- V-02·V-03·V-04 (현재 data/, 빌드 산출물): 통과. 페이지 오류 없음.
- V-05·V-06·V-10 (샘플, 빌드 산출물): 통과. 팀 카드 6장 일치, 팀↔인물 이동·뒤로 정상, 임시 ID(/p/fx-six/)는 404 상태로 열리고 인물 상세가 보인다.
- 원격 Actions: 아래 확인 결과 참고(push 후 기록).

## 5-2회차 추가 요청 (병합 전 후속)
- (1) teamMoves 집계를 Set 으로(model.js). 이전 코드는 seenIn·seenOut 을 일반 객체로 써서, 이름이 constructor·toString 인 인물이 들어온·나간 목록에서 빠졌다(재현: 들어온 인물 0명). 시험: test.mjs 에서 constructor·toString 인물을 두 번 넣어도 한 번씩만 집계되는지 확인.
- (2) 워크플로 권한(pages.yml): 전체 permissions 는 contents: read 만. pages: write, id-token: write 는 deploy job 에만 준다. build job 은 전체 값을 상속한다. 확인: js-yaml 로 파싱해 값 확인(실제 Actions 권한 적용은 다음 실행에서 확인).
- (3) validate.mjs: career 의 to 가 from 보다 앞서면 오류(종료 1). 시험: test.mjs 에서 끝이 앞선 경우 종료 1과 메시지, 같은 달은 통과.
- (4) test.mjs 에 out-dir 실제 동작 시험: 임시 폴더(os.tmpdir)만 사용. 표시 파일 없는 폴더는 던지고 파일이 그대로 남는다. 표시 파일 있는 폴더는 비워지고 표시 파일이 다시 써지며, 같은 폴더 재실행도 된다.
- 범위 밖(이번에 안 함): 일정 날짜 검증(js/views/schedule.js), 건의 폼 CAPTCHA(js/views/suggest.js). 아래 "배포 후 할 일"에 적었다.

## 7회차 UI 세부 점검 (2026-11-01)
- 브랜치 fix/ui-polish-7 (origin/main 기준, worktree). 범위: css/style.css, index.html 의 막대 마크업, js/main.js 의 막대 표시 대상 한 줄. 데이터·주소·정렬·머리말 시각은 건드리지 않았다.
- 고친 것:
  - U-01 막대 테두리: `--ink`(다크에서 흰 윤곽) → `--line-strong`(= `--mute`). 그림자는 라이트만, 다크는 `--float` 면을 밝게.
  - U-02 막대 높이: 고정 44px → `--dock-h`(= `--tap`). 데스크톱 36px, 모바일 44px.
  - U-03 푸터 여백: `.site-foot` 규칙 2개를 하나로. 여백은 막대 높이·위치 변수로 계산. 중복 규칙 정리.
  - U-04 "↑" → 인라인 SVG(`currentColor`, `aria-hidden`). `aria-label="맨 위로"` 유지.
  - U-05 고르기 상자: `appearance: none`, 토큰 색 화살표, 최대 폭 13rem → 12rem. 값을 `""` 로 되돌리는 동작 유지. 숨김 대상은 `#jump` 대신 감싼 `#jumpbox`.
  - U-06 구역 머리 위치: `.rh` 의 `top`·`scroll-margin-top` 을 `--tabs-h`(= `--tab-h` 44px)로. 모바일 전용 `.rh { top:44px }` 제거. 탭 높이는 `height: var(--tab-h)`.
  - 정리: `.doc .back` 의 `display: inline-block` 충돌 제거(시각 차이 없음).
- 재현 안 됨(고치지 않음):
  - 막대가 바닥 스크롤에서 푸터 글을 가림: 마지막 링크 아래 끝이 막대 위(375: 706 < 752, 1280: 694 < 740 뷰포트 px).
  - 바로가기 이동 후 구역 머리가 탭 밑에 가림: 머리 위가 탭 바닥과 같다(모든 폭).
  - 키보드 초점이 고정 머리 밑에 숨음: 행 링크 세 개에 초점을 옮겨 확인, 가림 없음. 막대는 숨김일 때 display none 이라 Tab 순서에서 빠진다.
  - 가로 넘침: 375·768·1280·1920 의 목록 위·중간·아래, 인물 상세, 일정, 건의에서 가로 스크롤 0. 팀 상세와 검색 0건은 측정하지 않았다(링크를 찾지 못했다).
- 사용자 결정(고치지 않음):
  - U-07 막대가 행 오른쪽 날짜·상태를 가림. 사용자가 (a) 를 승인했다. 측정(다크, 막대 왼쪽 끝 − 본문 오른쪽 끝): 1280 −103px, 1440 −23px(겹침), 1520 +17px, 1600 +57px, 1920 +217px. 그러므로 1520px 이상에서는 겹치지 않는다(막대 폭 207px 기준). 막대 라벨이 길면 폭이 최대 236px 까지 늘어 1600px 이상을 안전선으로 본다. 이 아래 폭은 막대가 본문 위에 떠 있는 현재 상태 그대로다(c). 코드 변경은 없다: 막대는 이미 오른쪽 끝에 붙어 있어 넓은 화면에서 자연히 밖으로 나간다.
  - U-08 다크에서 인물 모노그램(`.mono`)의 면을 `--mono-bg`(라이트 `--ink`, 다크 `--float`)로 낮췄다. 글자는 `--mono-fg`(다크 `--ink`, 대비 약 12:1). 구역 머리·빈 목록 위 2px 잉크 선은 의도된 반전이라 그대로 둠. 다크 면(#252B28)과 바탕(#111413)의 대비는 약 1.3:1이라 면 경계가 약하다. 경계가 부족하다고 보면 `.mono` 에 다크 전용 1px 테두리를 추가하는 방법이 있다(미적용).
  - 데스크톱 탭 44px 와 칩 36px 높이 차이: 역할이 달라 그대로 둠.
- 확인:
  - `node scripts/test.mjs` 54개 통과, `validate.mjs` 오류 0, `build.mjs _site` 인물 139쪽·팀 334쪽·sitemap 476개(작업 전과 같음).
  - 점검 조합: 폭 375·768·1280·1920 × 라이트·다크 × 목록 위·중간·아래·바로가기·검색 0건·인물·없는 주소·일정·건의, 움직임 줄이기 1회(팀 상세는 링크를 찾지 못해 빠졌다). 전후 스크린샷은 scratchpad `ui-audit/before`·`after`, 전후 비교 이미지는 `ui-audit/compare-before-after.png`.
  - 대비(WCAG): 본문·보조·알약 글자는 전부 4.5:1 이상. 막대 테두리 3:1 이상(라이트 6.1–6.6:1, 다크 6.1–7.9:1), 막대 화살표 12:1 이상.
  - 콘솔: 목록 탭 전부·일정·건의는 오류 0. 인물 상세는 정적 주소 404 1건(배포 기록의 404 대체 화면), 없는 주소 점검도 404 1건. 둘 다 이번 변경 전에도 있던 것이다.

## 8회차 머리말 간격·후원 메뉴 (2026-11-01)
- 브랜치 fix/header-support-8 (origin/main `eea1088` 기준, worktree). 범위: index.html 의 `header.top` 마크업, css/style.css 의 머리말 규칙. 머리말 시각 텍스트와 `h1#site` 태그 모양은 그대로 둠(build.mjs 정규식, js/main.js 의 `#site`·`.lede` 참조 유지).
- 고친 것:
  - 머리말 배치: `.top` 을 grid(`minmax(0,1fr) auto`)로. 제목과 문장은 `.top-text` 안에 위아래로. 후원 메뉴는 오른쪽 칸에 세로 가운데. 600px 이하는 한 칸으로 쌓고 간격 `--sp-2`.
  - 이전 문제의 원인: 머리말 flex 줄이 넘쳐, 후원 메뉴 링크가 sticky 탭 바(`z-index 5`) 밑에 가려졌다. 1280px 목록에서 Ko-fi 링크 가운데를 찍으면 탭 바 `nav` 가 나왔다(hit-test 실패). 다른 폭의 hit-test 는 측정 결과에 있지만 하나씩 확인하지는 않았다.
  - 후원 메뉴 문구: 라벨 "후원" → "카페인이 필요해요"(`aria-labelledby` 로 연결). "I need Caffeine" 보조 글자(`span.support-note`)와 그 CSS 삭제. 링크에 목적 `aria-label`: "Ko-fi로 후원", "카카오페이로 송금해 후원".
  - 모바일 간격: 제목→문장, 문장→메뉴, 메뉴 줄 간격을 모두 `--sp-2`(8px). 메뉴 왼쪽 끝은 제목 왼쪽 끝과 같다.
- 확인: 측정 168개(폭 375·600·601·768·1040·1280·1920 × 확대 100·150·200% × 라이트·다크 × 목록·인물·팀·없는 주소).
  - 작업 전(origin/main): 168개 중 102개 실패.
  - 작업 후: 168개 중 2개 실패. 두 개 모두 375px 에서 200% 확대(viewport 188px)의 가로 스크롤 6px.
  - 6px 원인: 목록 행의 `.r-next`·`.r-to`(`white-space: nowrap`) 노선 글자. 머리말 밖이고 작업 전에도 같은 값이다. 이번에는 고치지 않았다(지시문 "머리말 외 영역 디자인 변경 안 함").
  - 테스트 54개, validate 오류 0, build 인물 139쪽·팀 334쪽·sitemap 476개(작업 전과 같음).
  - 콘솔 오류: 목록 전부 없음. 없는 주소 점검의 404 1건(작업 전과 같음).
- 배포 확인: `eea1088` 의 pages 실행은 success. 사용자 스크린샷에서 메뉴 링크가 가려져 보인 이유는 확인하지 못했다. 캐시이거나 이전 배포일 것으로 보지만 재현하지 못했다.
- 확인 중 발견: 포트 8080 에 이 저장소와 다른 옛 dev 서버가 떠 있었다(`<details>` 마크업 서빙, PID 를 찾지 못함). 측정은 8090(작업본)과 8091(origin/main 내보내기)로 돌렸다. 8080 의 옛 서버는 그대로 두었다.
## 9회차 점검 결과 수정 (2026-11-02)
- 브랜치 fix/audit-9 (origin/main `eea1088` 기준, worktree). 항목마다 커밋 하나, 커밋 제목 앞에 F-번호.
- 처리:
  - F-01 고침: 인물·팀 상세의 날짜 줄 시각을 출처 줄이 없을 때만 붙인다(목록 row.js 와 같은 조건). `js/views/common.js` 한 줄.
  - F-02 고침: `idsOf` 가 "-" 를 빈 칸으로 본다(인물·팀·지켜볼 팀). 현재 data/ 에는 "-" 가 없어 `_site` 는 같다.
  - F-03 고침: 비고 시각 경고 문구를 실제 동작에 맞췄다(출처 줄에는 시각이 나온다). 조건은 그대로.
  - F-04 고침: `parseStamp` 를 `js/format.js` 에 두고 `stampOf`·`splitNote` 가 같이 쓴다. 옛 함수와 새 함수를 data/ 의 모든 비고(1379건)로 비교해 차이 0.
    - 줄 수: 예상 -8줄과 달랐다. 실제로는 format.js +10, common.js +2 (범위 확인과 주석 때문). 중복 파서는 없어졌다.
  - F-05 고침(경고만): 같은 ID 가 되는 서로 다른 인물·팀 이름을 경고한다. 현재 data/ 새 경고 0건. 합성 데이터로 인물·팀 두 경로를 확인했다.
  - F-06 고침: `stampOf`, `parseStamp`, `splitNote`, `newestFirst`, `idsOf`, `matches`, `fmtDate`, `newsRow`(F-01)에 시험 추가. 시험 70개 통과.
    - `matches` 는 악센트를 무시하지 않는다. 지시문의 "악센트 무시(지금 동작대로)"는 현재 코드와 달라서, 현재 동작을 그대로 고정하고 보고한다.
  - F-07 고침: 액션을 커밋 SHA 로 고정(아래 표). 권한·concurrency·조건은 그대로.
  - F-08 보류: 자정 새로고침은 하지 않았다. 확인해 보니 새로고침하면 지역 필터·검색어·스크롤이 사라지고 탭(#주소)만 남았다. 지시문의 "복원이 안 되면 하지 말고 보고" 조건에 해당한다.
    - 대안(사용자 결정): `TODAY` 를 갱신하는 함수를 두고 다시 그린다(다시 불러오지 않음). 화면 상태는 그대로 둔다.
- 기준선 대비 차이: `/tmp/before_site` 와 비교하면 JS 파일 세 개(`format.js`, `model.js`, `views/common.js`)만 다르다. 정적 HTML 은 모두 같다. F-01 의 시각 변화는 브라우저에서 그려지는 상세 화면에만 있어 직접 확인이 필요하다.
- 확인: `test.mjs` 70개 통과, `validate.mjs` 오류 0, 경고 469(작업 전과 같음), `build.mjs _site` 인물 139쪽·팀 334쪽·sitemap 476개.
- 사용자가 할 일: 건의 폼 스팸 방지를 Web3Forms 대시보드에서 켠다(스팸 보호, 전송 제한). 코드는 바꾸지 않는다.
- 줄 수 변화(origin/main 대비): 전체 +188 / -23. pages.yml 4/4, format.js 15/5, model.js 6/4, views/common.js 7/5, scripts/test.mjs 113/3, scripts/validate.mjs 43/2.

### F-07 액션 SHA 표
| 액션 | 태그 | 커밋 SHA |
|---|---|---|
| actions/checkout | v4.4.0 | 11d5960a326750d5838078e36cf38b85af677262 |
| actions/setup-node | v4.4.0 | 49933ea5288caeca8642d1e84afbd3f7d6820020 |
| actions/upload-pages-artifact | v3.0.1 | 56afc609e74202658d3ffba0e8f6dda462b719fa |
| actions/deploy-pages | v4.0.5 | d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e |

- 확인 방법: `git ls-remote https://github.com/actions/<이름> 'refs/tags/v4' 'refs/tags/v4.*'` 로 메이저 태그와 같은 커밋을 가진 정확한 버전을 찾았다.
- 제안(추가하지 않음): 버전 올림은 Dependabot 같은 도구로 자동화할 수 있다.

## 10회차 영문판 1: 화면 문구 사전 분리와 영문 표기 형식 (2026-11-02)
- 브랜치 feature/i18n-1 (origin/main `036b399` 기준, worktree). 화면 변화 없음(한국어 출력 그대로, 영문은 아직 주소로 열리지 않는다).
- 영문판 전체 계획(지시문 기준):

| 단계 | 내용 | 회차 |
|---|---|---|
| 1 | 화면 문구를 사전으로 분리. 한국어 화면은 한 글자도 바뀌지 않음 | 10 |
| 2 | 언어별 표기 형식: 시각, 상대 날짜, 인원·나이·계약 문구 | 10 |
| 3 | 상태 알약과 상태 용어집의 영문 | 11 |
| 4 | `/VCT-board/en/` 주소, 정적 빌드, EN/KR 전환 버튼 | 11 |
| 5 | 예약 작업이 비고·상황·일정 제목을 번역해 `*_en` 필드에 씀 | 12(예약 작업 변경) |
| 6 | 건의 폼, 약관·개인정보 영문 요약 | 12 |

- 지킬 결정: 주소로만 언어를 정한다(`en/` 아래). 전환은 페이지를 실제로 이동한다. 고른 언어는 `vct-lang` 에 기억(아직 미구현). 데이터 원문은 한국어 그대로 둔다. GoatCounter 는 같은 사이트 코드.
- 처리:
  - `js/i18n.js`: `LANG`, `setLang`, `t`, `tIn(lang, key, params)`. 브라우저에서는 주소가 `…/en/` 이면 en, 아니면 ko. Node 에서는 ko.
  - `js/i18n/ko.js`(값은 지금 화면 글자 그대로), `js/i18n/en.js`(같은 키). 두 사전의 키 집합은 같다(시험으로 확인).
  - `REGION_KO`·`TIER_KO`·`TAB_NAME` 을 `regionName()`·`tierName()`·`tabName()` 으로 바꿨다(쓰는 시점에 사전을 읽는다).
  - 화면 문구를 사전으로 옮김: `model.js`(탭·알약·계약·지켜볼 팀 종류), `format.js`(오전·오후, 오늘·어제·N일 전, 출처), `main.js`, `views/common·person·team·regions·recent·schedule·suggest.js`, `components/row·route·badge.js`, `scripts/build.mjs`(제목 접미사, 설명 문장).
  - 데이터 판정 정규식은 그대로 두고 `데이터 판정용` 주석을 달았다: `/계약 완료/`, `/잔류/`, `/구직|탐색/`, `REPORTED_RE`, `/방출|결별|이탈/`, `/^\[확정\]/`, `" 합류"` 검색, `WATCH_KINDS` 정규식, `CROSS_RE`, 소식 줄 앞머리 정규식, `South Korea`·팀 이름 판정.
  - 표기 함수가 언어를 받는다(기본값 `LANG`): `fmtDate`, `dateWord`, `clockText`, `stampLabel`, `dayWord`, `relDate`, `srcHTML`. 날짜 계산(일련번호, `stampOf`, `parseStamp`, `TODAY`)은 그대로.
  - 영문 표기: 날짜 `Oct 25`, 시각 `1:30 AM`, 상대 날짜 `Today`·`Yesterday`·`3 days ago`, 인원 `3 players`, 나이 `24`, D-day `in 3 days`. 최근 소식순 머리는 `Oct 25 (Mon)`.
- 조사 결과(1장): 한글 문자열 리터럴 187곳 중 화면 문구가 대부분이고, 데이터 판정은 약 12곳, 빌드 로그·오류 메시지 6곳(화면이 아니라서 그대로). 판정으로 남긴 문자열은 위 목록.
- 새로 정한 영문 문구(사전 밖 표현은 같은 어조로): "VCT LFT·FA Tracker", "Latest news", "New in the last 3 days", "{n} new", "Jump to", "Not yet official", "Expires today", "Date unknown", "Transfer completed", "Team-wide news →", "Career data source, CC BY-SA 3.0", "Send with email app", "Copy message", "Reference link (optional)", "Reported: joined {team}", "Stayed", "Looking for team", "Unverified", "Withdrawn or disbanded", "Lost partnership", "Contract expiring", "Reported joining", "No related news.", "This team has closed. There is no current roster."
- 남긴 것(다음 회차, 3·4단계 입력):
  - 상태 원문이 화면에 그대로 나오는 곳: `row.js` 줄 머리(`esc(it.status)`)와 `person.js` 이번 이동 제목의 대체 글(`val(it.status)`). 영문에서도 원문은 한국어로 보인다.
  - 경로 줄(`routeHTML`)의 어순: 한국어 "A 에서 B 로" 구조라 영문 어순("from A to B")은 3단계에서 맞춘다.
  - `recent.js` 의 "M월 D일 (요일)" 은 한국어 분기에만 있다(영문 분기는 `dateWord` 사용).
  - `index.html` 정적 문구, 약관·개인정보 페이지, 건의 폼의 안내 문단 일부: 4단계.
- 확인:
  - `node scripts/test.mjs` 77개 통과. 새 시험 7개: 사전(키·빈 값·매개변수·영문 한글 없음), `tIn`(폴백·끼우기), ko 출력 고정, en 표기, 보도 시각 날짜 넘김, `dayWord`, en 화면 문구에 한글 없음.
  - `node scripts/validate.mjs` 오류 0, 경고 469(작업 전과 같음).
  - `build.mjs _site` 인물 139쪽·팀 334쪽·sitemap 476개(작업 전과 같음). 정적 HTML 은 기준선과 전부 같다. 바뀐 것은 `js/` 파일과 새 `js/i18n/` 뿐이다.
  - 브라우저 40 화면(375·1280 × 라이트·다크 × 목록 7개·인물·팀·없는 주소): 렌더된 DOM 은 40/40 같고 콘솔 오류 0.
  - 픽셀 비교는 끝내지 못했다. 같은 기준선을 두 번 찍어도 40 화면 중 12개가 달라서, 이 하네스의 스크린샷은 원래 흔들린다. 지시문의 픽셀 비교를 대신할 방법(고정 시각 캡처 등)이 필요하다.

## 11회차 영문판 2: 상태 용어집, /en/ 주소와 EN/KR 전환 (2026-11-02)
- 브랜치 feature/i18n-2 (origin/main `7c42d06`, PR #14 병합 뒤). 한국어 출력은 기준선과 같다(아래 확인). 영문은 `/VCT-board/en/` 주소로 열린다.
- 처리:
  - `js/i18n/glossary.js` (`termEn(text)`): 데이터 문구를 정해진 짝(`TERMS`)과 규칙(`RULES`)으로 옮긴다. 조각(" · ", " / ", ", ", "/")마다 옮기고, 한글이 남는 조각이 있으면 문구 전체를 `null` 로 돌려준다. 팀 이름·LFT·FA 같은 영문 글은 그대로.
  - 화면 쓰임: `common.js` `termHTML`(용어집 → 영문, 못 옮기면 원문 + KR), `nameHTML`(사람 이름은 `lang="ko"`만), `textHTML`(긴 글: 영문 화면에서 한글이 있으면 원문 + KR). `format.js` `krHTML`·`textHTML`.
  - 상태 줄 머리(`row.js`), 직책·국적 메타, 인물 이번 이동 제목 대체 글(`person.js`), 경력 역할, 팀 칸, 비고 본문(`regions.js` 팀 공통 배경 포함), 일정 날짜·제목·출처, 지켜볼 팀 대상·상황, 출처 이름: 영문 화면에서 전부 이 함수들을 거친다.
  - 경로 줄: `routeHTML` 은 사전 `route.full`·`route.toOnly` 의 틀로 그린다. 화면낭독은 영문 "from A to B", 한국어는 "A에서 B로". 한국어 출력은 예전 문자열과 같다(시험으로 고정).
  - `pillOf` 의 "X 잔류" 알약은 영문 화면에서 사전 글 "Stayed" 를 쓴다(원문 "Team Liquid 잔류" 는 한국어 글이라 보이지 않게).
  - 날짜: 최근 소식순 머리는 영문 "Mon, Oct 25". 인원 한 명은 "1 player"(`count.person`).
  - `js/state.js`: `ROUTE_BASE = BASE + (LANG === "en" ? "en/" : "")`. `personUrl`·`teamUrl`·`listUrl` 이 쓴다. `main.js` 의 `parseRoute`·`isDetailLink` 도 `ROUTE_BASE`.
  - EN/KR 전환(`index.html` 머리말 오른쪽, 후원 메뉴 앞): `<nav class="lang-switch">`. 현재 언어는 `aria-current` 와 굵기·밑줄로 표시. `main.js` 의 `langLinks()` 가 지금 화면과 같은 자리의 주소로 맞춘다(인물·팀·목록 탭·없는 주소는 목록). 링크는 가로채지 않고 페이지를 실제로 불러온다. 고른 언어는 `localStorage` `vct-lang` 에 저장(실패는 무시).
  - 저장값 이동: `index.html` `<head>` 맨 앞의 인라인 스크립트. 저장값이 있고 주소 언어와 다르면 `location.replace` 로 같은 자리의 다른 언어로 보낸다. 저장값이 없으면 아무것도 하지 않는다(브라우저 언어 감지 없음). `?stay` 가 있으면 보내지 않는다.
  - 정적 문구: `index.html` 에 `data-i18n`(글자), `data-i18n-html`(링크가 든 글), `data-i18n-attr`(속성) 을 붙였다. 키는 `ko.js`·`en.js` 에 있고 시험이 ko 값을 index 글자와 맞춘다. `<p class="lede">` 에는 속성을 붙이지 않았다(예약 작업 약속: 시험으로 고정).
  - `scripts/i18n-html.mjs` `toLang(html, "en")`: `<html lang>`, title·description·og(`og:locale` en_US, `og:locale:alternate` ko_KR), `data-i18n*`, 머리말 문장(`ledeHTML`, 시각은 원문 정규식에서 뽑는다), EN 표시, KR 안내 줄. `alternateTags(alt)`: hreflang 세 줄(ko, en, x-default ko).
  - `scripts/build.mjs`: `en/index.html`, `en/p/<id>/`, `en/t/<id>/`(제목 "OXY · VCT LFT·FA Tracker", 영문 설명). 한국어 index·p·t 에도 hreflang 세 줄을 빌드 결과에 넣었다. 정책 페이지는 한 번만. `sitemap.xml` 은 한·영 주소 모두 넣고 각 주소에 `xhtml:link` 세 줄.
  - 런타임 보정: 영문 주소인데 `html lang` 이 `en` 이 아니면(GitHub Pages 의 한국어 `404.html` 이 올 때) `localizeStatic()` 이 같은 사전으로 정적 문구·머리말·KR 안내 줄을 바꾼다. 정상 영문 페이지는 건드리지 않는다.
  - `scripts/dev-server.mjs`: `/VCT-board/en/…` 은 `toLang` 으로 만든 셸을 보낸다(없는 상세는 404, 목록은 200).
  - 영문 화면의 정책 라벨은 "(Korean)" 을 붙이고 한국어 페이지로 간다. 정정 요청 mailto 제목은 영문, 주소는 그대로.
  - 스타일: `.top` 세 칸(글·전환·후원), `.lang-switch`, `.kr-tag`(토큰만 씀).
- 용어집 커버리지(데이터 현재 값 기준, `data/`):

| 항목 | 값 종류 | 옮겨진 종류 | 행 수 |
|---|---|---|---|
| 상태 (players + coaches) | 61 | 61/61 (100%) | 138/138 |
| 이적 구분 (transfers type) | 4 | 4/4 | 35/35 |
| 코치 역할 (coaches role) | 6 | 6/6 | 28/28 |
| 선수 포지션 (players position) | 15 | 15/15 | 110/110 |
| 인물 역할 (people role) | 21 | 21/21 | 74/74 |
| 경력 역할 (career role) | 9 | 9/9 | 67/67 |
| 지켜볼 팀 대상 (watch targets) | 14 | 14/14 | 17/17 |

- 번역되지 않은 것(12회차 5단계 입력). 용어집이 아니라 원문 + KR 로 보인다:
  - 비고 본문 165/166 (대부분 긴 보도 메모)
  - 지켜볼 팀 상황 17/17 (전부)
  - 일정 제목 10/10 (전부)
  - 팀 칸 "(은퇴 · 전 Sentinels)" 1건
  - 출처 이름 "VLR 이적 로그" 1건
- 확인(직접 실행):
  - `node scripts/test.mjs` 85개 통과. 새 시험 8개: 상태 전부 옮겨짐(데이터 기준), 용어집 짝·괄호·날짜·null, 영문 주소 읽기, index 정적 문구 = ko 사전, 머리말 한 번·기준 시각 형식·main.js 줄(예약 작업 약속), 영문 틀에 한글 없음·ko 틀 그대로, 경로 줄 ko 고정·en 낭독 순서, 영문 행에서 한글은 `lang="ko"` 안에만.
  - `node scripts/validate.mjs` 오류 0, 경고 470(작업 전 470).
  - `node scripts/build.mjs _site` 인물 139쪽·팀 334쪽(각각 한·영), sitemap 950개(작업 전 476, 인물·팀 두 배). 한국어 정적 HTML 은 기준선과 비교해 hreflang 세 줄, 전환 버튼, `data-i18n*` 속성, 머리말 `<script>` 만 늘었다.
  - 브라우저(Playwright, 빌드 결과 8095): 한국어 목록 7개·인물·팀·없는 주소 × 375·1280 × 라이트·다크 40화면, `#view`·머리말·제목이 기준선과 전부 같다(전환 버튼·속성 제외).
  - 영문 화면 40화면(목록 7·인물·팀·없는 주소 × 375·1280 × 라이트·다크): 보이는 글과 속성에서 한글이 `lang="ko"` 밖에 있는 것 0, 사이트 안 링크는 `/VCT-board/en/` 시작(예외: css·js·data, 약관·개인정보, EN/KR 전환), 콘솔 오류 0(없는 주소 404 문서 제외).
  - 전환: 목록 `#coaches`, 인물 `p/oxy/`, 팀 `t/cloud9/`, 없는 주소에서 EN·KR 누르면 같은 자리로 실제 이동하고 저장값이 바뀌었다. 저장 en + ko 주소 → en 으로 이동. 저장 en + `?stay` → 그대로. 저장값 없음 → 그대로.
  - 404 대체: GitHub 가 주는 한국어 `404.html` 을 `/en/p/BAD/` 에 주었을 때 영문 머리말·"This address was not found."·KR 안내 줄이 나오고 한글 0.
  - 정적 페이지: `_site/en/p/oxy/` 의 `<html lang="en">`, 영문 title·canonical, hreflang 세 줄. 한국어 `p/oxy/` 도 같은 세 줄.
- 못 한 것·남은 것:
  - 픽셀 비교는 하지 않았다. 대신 DOM(`#view`, 머리말, 제목)과 이 목록의 시험으로 판정했다. 10회차에 흔들린 스크린샷 비교는 이번에도 쓰지 않았다(고정 시각 캡처는 적용하지 않음).
  - 영문 건의 폼: 비활성 전송 링크가 `href="#"` 인 채 남았다. 한국어와 같은 DOM 을 지키기 위해 그대로 두었다. 누르면 막혀 있어 이동하지 않는다(`aria-disabled`).
  - 개발 서버는 상세 주소(`/p/`, `/t/`)에 404 를 돌려준다(예전부터 그랬다). 배포 빌드의 상세 페이지는 200 이다.
  - 영문 설명 대부분은 정해진 짝과 규칙으로 옮긴다. 새 문구가 들어오면 `glossary.js` 에 짝을 더한다. 옮기지 못하면 자동으로 KR 칸이 된다(누락은 화면에서 바로 보인다).
  - 12회차: 비고·상황·일정 제목의 영문(`*_en` 필드), 약관·개인정보 영문 요약, 건의 폼 안내 문단.
- 검증 스크립트는 저장소에 넣지 않았다(작업 폴더의 scratchpad). 필요하면 별도 회차에서 `scripts/` 에 넣는다.

## 12회차 영문판 3: 본문 번역 표, 머리말·지역 머리 정리, 영문 안내 페이지 (2026-11-02)
- 브랜치 feature/i18n-3 (origin/main `f9be42f` 기준). 커밋은 A-1~A-5, B-1, B-2·B-3, C-2 로 나눴다. C-1 은 바꿀 것이 없었다.
- 배포 전 상태(09:50 실측): 영문 목록 탭 KR 표시 253개, 본문 대부분이 한국어 원문.

### A. 본문 번역 표 (5단계)
- `data/i18n-en.json`: 원문 글자가 키, 영문이 값, 키 정렬. 대상은 비고(조각마다), 지켜볼 팀 상황(몸말), 일정 제목·날짜(글)·출처, 출처 이름, 용어집이 못 옮기는 팀 칸. 상태·구분·역할·대상은 용어집이 맡는다.
- 번역 규칙: 사실만 짧게. 끝의 출처 시각 괄호와 "교차 확인:" 구절은 글자 그대로 붙인다("교차 확인:"도 번역하지 않는다). 날짜 숫자 표기는 그대로.
- 건너뜀 9건: 원문 데이터가 중간에 끊긴 문장 8건(예: "...'성사된 이적", "Joblif")과 교차 확인만 있는 문장 1건. 확신이 없어 KR 로 남겼다.
- 검사(`js/i18n.js` `trEn`): 같은 출처 시각, 같은 교차 확인 목록, 몸말에 한글 없음, 원문 숫자 묶음이 모두 영문에 있음. 하나라도 어긋나면 원문 + KR.
- 화면: 영문 화면에서만 `data/i18n-en.json` 을 받는다(실패하면 빈 표). 비고는 `noteText`(조각마다), 상황은 몸말, 일정·출처·팀 칸은 `trWhole`.
- 검증: `scripts/validate.mjs` 경고(형식, 영문 한글, 검사 실패, 번역 누락 요약 + 처음 10건, 낡은 번역). `scripts/i18n-report.mjs` 현황표.
- 현황표(i18n-report): 원문 214, 번역 205, 누락 9(건너뜀 9건과 같다).
- 표본 20건(고정 간격 추출, 긴 글은 줄임):

| # | 원문 | 영문 |
|---|---|---|
| 1 | 1부→비1부 이적(기준 변경으로 백필). 2026 Fnatic 소속 … | Tier 1 to non-Tier 1 transfer (backfilled after a criteria change). 2026 Fnatic member … |
| 2 | 2025년 합류 | Joined in 2025. |
| 3 | 2년 연속 계약 만료 | Contract expired 2 years in a row. |
| 4 | Barça 2027 합류 보도(Sheep), 공식 발표 전 (갱신 10/31 23:58 UTC, 보도 시각 미확인) | Reported 2027 join with Barça (Sheep); not yet official (updated 10/31 23:58 UTC, report time unconfirmed). |
| 5 | Champions 직전 GSR에 밀림. 계약은 2027까지. Barça 이적설(Sheep) — 이미 LFT가 아닐 수 있음 | Lost to GSR before Champions. Contract through 2027. Barça transfer rumor (Sheep); may already no longer be LFT. |
| 6 | EG는 11/2 운영 종료. 이미 타팀과 대화 가능 | EG ceased operations on 11/2. Already able to talk with other teams. |
| 7 | FURIA는 10/30 공식 발표로 발로란트 믹스 철수(전 선수·코치 11/2 FA, LFT 탭 반영). M80·FlyQuest 존속 여부 미정 | FURIA officially announced its Valorant mix exit on 10/30 (all players and coaches FA on 11/2; reflected on LFT tab). M80 and FlyQuest future undecided. |
| 8 | GIANTX는 비파트너로 탈락. 제목만 확인 | GIANTX eliminated as non-partner. Title only verified. |
| 9 | Global 철수로 방출 후 PRX 복귀(2025 PRX 출신) 보도. 교차 확인: Sheep, VLR. 공식 발표 전 (Sheep 10/29 09:46 UTC) | Released after Global's withdrawal; reported return to PRX (former PRX player from 2025). Not yet official. 교차 확인: Sheep, VLR. (Sheep 10/29 09:46 UTC) |
| 10 | Liquipedia 이적 로그 10/26 단독 등재(퍼포먼스 코치, 비활성 처리). 팀·본인 발표 미확인 | Liquipedia transfer log lists him alone on 10/26 (performance coach, marked inactive). Team and player announcement not confirmed. |
| 11 | NAVI 방출 후 Heretics 합류 보도, 공식 발표 전 (갱신 10/31 23:58 UTC, 보도 시각 미확인) | Released by NAVI; reported to join Heretics, not yet official (updated 10/31 23:58 UTC, report time unconfirmed). |
| 12 | Sentinels 공식 X 방출 발표(VLR·Strafe 원문 확인). 2026.3 G2에서 합류, 8개월 만에 이탈. 교차 확인: VLR, Strafe, Liquipedia 이적 로그(10/30) (Sentinels X 10/31 00:15 UTC) | Sentinels official X released him (VLR and Strafe source checked). Joined from G2 in 2026.3; left after 8 months. 교차 확인: VLR, Strafe, Liquipedia 이적 로그(10/30) (Sentinels X 10/31 00:15 UTC) |
| 13 | VLR 이적 로그 10/19 이탈(M80 존속 불투명). ShwN이 GoodGoodGame_ 보도를 인용 … | VLR transfer log: left 10/19 (M80 future unclear). ShwN, quoting GoodGoodGame_: VCT CN Bilibili Gaming join imminent … |
| 14 | VLR 이적 로그 10/22 이탈 등재(Sheep 10/21 보도). 진로 미정 | Listed as left in the VLR transfer log on 10/22 (Sheep report 10/21). Next team undecided. |
| 15 | XLG 3시즌 만에 | Left XLG after 3 seasons. |
| 16 | 계약 2026 만료(Sheep 보도). STYRON은 LFT 시트에 반영 | Contract expired in 2026 (Sheep report). STYRON reflected on the LFT sheet. |
| 17 | 본인 X 게시로 FA 선언. 2025.12 ZETA 복귀 | Player's own X post announces FA. Rejoined ZETA in 2025.12. |
| 18 | 본인 X 발표(VLR 10/27 원문 확인): DRG와 VCT CN 2027 재계약 협의 중이나 제한적 F/A로 타 옵션 탐색 허가 … | Player's own X statement (VLR 10/27, source checked): in talks with DRG and VCT CN for a 2027 re-sign … |
| 19 | 본인 공식 발표를 VALO2ASIA가 전함(X 원문 확인). Paper Rex 6년 후 2026년 Weibo Gaming 단기 소속 … | Official announcement by the player, relayed by VALO2ASIA (checked on X). Six years after Paper Rex … |
| 20 | 탐색 허가 후 잔류. 공식 발표 전 (Sheep 10/23 17:35 UTC) | Free to explore, then stayed. Not yet official. (Sheep 10/23 17:35 UTC) |

### B. 화면 정리
- B-1: 영문 지역 머리의 "Americas Americas" 중복 제거. 영문 이름과 원문이 같으면 `.en` 칸을 만들지 않는다. 한국어 머리는 그대로.
- B-2: 머리말 배치(두 언어 공통). 601px 이상: 왼쪽 제목·문장, 오른쪽 칸 위 EN/KR, 아래 후원 메뉴(둘 다 오른쪽 정렬). 600px 이하: 제목·문장, 그 아래 후원 메뉴(왼쪽)·EN/KR(오른쪽), 좁으면 줄을 바꾼다. 마크업은 `<div class="top-side">` 한 겹.
  - 측정 48건(375·600·601·768·1280·1920 × 라이트·다크 × 100·200%. 200%는 레이아웃 폭을 절반으로 흉내): 링크 4개 모두 보임, 겹침 없음, 601px 이상 오른쪽 끝 = 본문 오른쪽 끝, 600px 이하 후원 메뉴 왼쪽 끝 = 제목 왼쪽 끝. 모두 맞다.
  - 예외: 200%(187px)에서 탭·칩 줄이 5–6px 가로로 넘친다. 같은 줄이 main 에서도 그대로 넘치므로 이번 작업 전부터 있던 것이다(탭·칩 스크롤 줄 안).
  - 375px 에서 후원 메뉴가 한 줄을 다 차지하면 EN/KR 은 다음 줄 오른쪽에 놓인다(`margin-left: auto`).
- B-3: css 의 `.lang-switch`·`.kr-tag` 규칙이 두 번 있던 것을 한 번으로 합쳤다. 남은 중복 선택자는 `:root`(라이트·다크 테마 블록, 의도)뿐이다.

### C. 영문 안내 페이지 (6단계)
- C-1 건의 폼: 안내 문단·라벨·버튼·메일 머리가 모두 사전 문구다(영문 화면 #suggest 한글 0). 바꾼 것 없음.
- C-2 약관·개인정보 영문 요약: `en/terms/index.html`, `en/privacy/index.html`(정적 파일). 맨 위에 "This is a summary. The Korean original prevails." 와 원문 링크. 한국어 라벨은 `lang="ko"` 안에 둔다. 한국어 원문의 항목 순서를 따르고, 원문에 없는 약속은 넣지 않았다.
  - 빌드가 두 언어 파일을 모두 쓰고, 두 페이지에 hreflang 세 줄을 넣고, sitemap 에 한·영 주소를 넣는다. 영문 푸터는 영문 요약으로 연결하고 "(Korean)" 표시를 지웠다.
- 후원(영문 화면의 카카오페이): 이번에는 그대로 두었다. **사용자 결정**. 선택지: (1) 그대로, (2) 영문 화면에서만 숨기고 Ko-fi 만 남김, (3) 영문 화면 안내에 "국내 송금"임을 밝힘.

### 확인 (직접 실행)
- `node scripts/test.mjs` 90개 통과. 12회차 새 시험 5개: trEn 검사 종류, 번역 표가 한국어 화면에서 쓰이지 않음과 조각 번역, 표 파일 검사(검사 통과·쓰이지 않는 키·영문 한글), 영문 행의 번역 한글 0, 약관·개인정보 영문 요약.
- `node scripts/validate.mjs` 오류 0, 경고 481(11회차 471 + 번역 누락 요약 10건: 건너뜀 9건과 요약 1줄).
- `node scripts/build.mjs _site` 인물 139쪽, 팀 334쪽(각각 한·영), sitemap 952개(11회차 950 + 약관·개인정보 영문 2개).
- 영문 KR 표시 수(목록 탭 합계, 기준 = main): 253 → 45. #players 131 → 25, #coaches 33 → 4, #korea 19 → 0, #watch 19 → 2, #transfers 40 → 14, #schedule 11 → 0, 인물 2 → 0, 팀 4 → 0.
  - 남은 KR 45개는 번역이 없는 9건과, 교차 확인 이름·출처 이름처럼 시각 괄호와 함께 원문 그대로 두기로 한 글이 주다.
- 영문 화면 한글 0: 목록 7탭·인물·팀·없는 주소 × 375·1280 × 라이트·다크 40화면에서 `lang="ko"` 밖의 한글 0, 사이트 안 링크는 `/VCT-board/en/` 시작(예외 제외 0). 콘솔 오류 0(없는 주소의 404 문서 제외).
- 한국어 화면 불변: 목록 7탭·인물·팀 × 375·1280 × 라이트·다크(같은 조건 16화면): `#view` 16/16 같음. 머리말은 B-2 의 래퍼 `<div class="top-side">` 한 겹만 다르다(의도). 한국어 화면은 `i18n-en.json` 을 요청하지 않는다. 영문 화면은 요청한다.
- 스크린샷(사람이 보는 자료, 작업 폴더): 머리말 전후(375·1280), 영문 목록 375·1280 다크, 영문 인물, 전환 버튼 확대.

### 남은 일
- 부록(예약 작업 변경 블록)은 Claude Code 가 적용하지 않는다. 이 PR 병합 뒤에 사용자가 예약 작업 지시문에 넣는다.
- 교차 확인 이름과 출처 이름의 한글(예: "VLR 기사 인용 선수 본인 X", "VLR 이적 로그")은 원문 그대로 KR 로 보인다. 번역하려면 목록 일치 검사를 바꿔야 해서 두었다.
- 건너뜀 9건은 원문을 먼저 고쳐야 번역할 수 있다(데이터 자체가 잘림).
## 13회차 점검 수정과 영문 후원 정리 (2026-11-02)
- 브랜치 fix/audit-13 (origin/main `ce15121` 기준). 항목마다 커밋 하나. 이 회차 시작 전 기준선: 시험 90, 검증 경고 481, 빌드 인물 139·팀 334·sitemap 952.
- 예약 작업 실행 시각: 14:50·15:35·20:50·21:35 KST, 다음날 08:50·09:35 KST. 병합은 이 시각 앞뒤 30분을 피한다.

### 결과
| 항목 | 상태 | 내용 | 줄 수 | 시험 |
|---|---|---|---|---|
| M-1 빈 출발·도착 팀 | 고침 | to 가 비거나 '-' 이면 오류(잔류 제외). from 이 비거나 '-' 이면 경고(시트 '성사된 이적'에 채우라는 안내). 검사는 teamList 반복문 안에 둠 | +5 | +2 |
| M-2 없는 날짜 | 고침 | parseStamp 가 일을 확인(2월 29일까지). validate 는 '없는 날짜' 경고를 따로 | +5 | +2 |
| S-1 언어 이동 시험 | 고침 | node:vm 으로 index.html 인라인 스크립트를 실행, 표의 7경우. 추출 함수는 scripts/inline-script.mjs 한 곳 | +14 | +1 |
| S-2 비고 나누기 통합 | **보류** | S-2: noteParts 는 예약 작업 번역 검사와 같아야 해서 유지 | 0 | 0 |
| S-3 사이트 경로 검사 | 고침 | build 가 index.html 의 `<head>` 인라인 스크립트 본문만 보고 경로를 확인. 가짜 index 시험 | +9 | +1 |
| S-4 자정 후 새로고침 | **보류, 종결** | S-4: 새로고침 시 상태 초기화로 보류, 영향이 작아 종결 | 0 | 0 |
| N-1 export 정리 | 고침 | export 6개 제거(grep 으로 쓰임 없음 확인) | 0 (단어 6개) | 0 |
| N-2 한국어 날짜 | 고침 | format.js `dateLong`, recent.js 중복 제거 | -3 | +1 |
| pillOf 도착 팀 '-' | 고침 | routeOf 와 같은 cleanName 적용. '-' 이면 '새 팀 합류' | +1 | +1 |
| E-1 영문 카카오페이 숨김 | 고침 | 영문 머리·푸터·약관·개인정보에서 제외(Ko-fi 만 남김) | +4 | +1 |

시험 90 → 100(+10). 검증 종료 코드 0, 경고 482(KEN 의 '이전 팀' 경고 1건 포함).

### 데이터 KEN 행
- `transfers.players[26]` KEN: from "-", 비고 "이전 소속 미확인". 검사는 경고만 낸다. 데이터는 바꾸지 않았다. 시트에 출발 팀이 확인되면 채운다.

### 보류: S-2 비고 나누기 통합
- 사유: noteParts 는 예약 작업 번역 검사와 같아야 해서 유지한다. splitNote 는 날짜가 범위 밖이면(13/1) 원문을 본문에 남기는데, noteParts 를 그 위에 올리면 "메모 (A 13/1 10:00 UTC)" 시험이 깨진다. 맞추려면 noteParts 동작을 바꿔야 한다.

### 보류 종결: S-4 자정 후 새로고침
- 사유: 새로고침 시 상태 초기화로 보류. 지역 필터를 고르고 스크롤 600px 로 내린 뒤 새로고침하면 필터는 "모든 지역", 스크롤은 0 이 된다. 자정이 지난 탭만 해당하고 영향이 작아 종결한다.

### 확인
- 한국어 정적 HTML: 기준선(main)과 0 차이(en/ 외). 목록 #view: 기준선과 16/16 같음. 상세 페이지 머리 차이는 개발 서버의 404 대체 셸과 정적 빌드의 차이이고, 빌드 HTML 비교에서는 0 차이.
- 영문 머리: KR · EN · Ko-fi 세 링크가 375·601·1280 에서 보이고 겹치지 않는다.
- 기준선 대비 `_site`: HTML 차이는 전부 `en/` 아래(카카오페이 링크 제거와 푸터 문장).

### i18n-report (수치만)
- 원문 214, 번역 205, 누락 9(건너뜀 9건: 데이터가 잘린 문장 8과 교차 확인만 있는 문장 1).
- 번역 표 항목 173개, 지금 data 에 쓰이는 키 182개.

### PR 과 병합
- PR 제목: 점검 수정: 빈 이적 팀·없는 날짜 검증, 언어 이동 시험, 비고 나누기 통합, 영문 후원 정리 (병합하지 않음)
- 병합 시각: 예약 작업 실행 시각(14:50·15:35·20:50·21:35, 다음날 08:50·09:35 KST) 앞뒤 30분을 피한다.

### /ponytail-audit
- 수정 뒤 실행했다. 새로 나온 지적은 고치지 않고 PR 설명과 보고에 목록으로 둔다.

## 14회차 선수 정보 보충과 생년월일 공개 (2026-11-02)
- 브랜치 feature/info-fill (origin/main `c889494` 기준). 이 회차는 PR 을 만들고 병합하지 않는다.
- 기준선(origin/main): 시험 100, 검증 오류 0, 경고 471, 빌드 인물 140·팀 334·sitemap 954.
- 예약 작업 실행 시각: 14:50·15:35·20:50·21:35 KST, 다음날 08:50·09:35 KST. 병합은 이 시각 앞뒤 30분을 피한다.

### 결과
| 항목 | 상태 | 내용 | 줄 수 | 시험 |
|---|---|---|---|---|
| A-1 목록 행 보충 | 고침 | items() 에서 행의 포지션(코치는 역할)·국적이 비면(cleanName) personId 로 people 을 찾아 role·nationality 로 채운다. 행 값이 있으면 행 값을 쓴다 | model.js +16 −2 | +1 |
| A-2 생년월일 | 고침 | 칸 이름 "생년월일"(Born). birthText 가 날짜·연도만·미성년 규칙을 낸다. 사전 키 age.* 를 birth.* 로 바꾸고 info.age 를 info.birth 로 | person.js +13 −8, ko·en +4 −3 | +1 (birthText) |
| A-3 빈 정보 현황 | 새로 만듦 | scripts/gaps.mjs(표, `--json`). validate 요약 아래 "정보 빈 칸" 줄 한 개(경고 수는 그대로). cleanName 을 export | gaps.mjs 56 줄 신규, validate +6 | +2 (gapsOf, gaps 출력) |
| A-4 마무리 | - | 이 절, design-brief 두 항목 | - | - |

시험 100 → 104(+4). 검증 종료 코드 0, 경고 471(기준선과 같음). 정보 빈 칸: 생년월일 21, 포지션 65, 국적 14, 계약 139.

### A-1 보충 전후 숫자
- 국적이 빈 행 39 중 30 은 인물 정보로 채워졌다. 나머지 9 는 인물 정보도 비어 있다.
- 포지션이 빈 행 69 중 5 는 인물 역할로 채워졌다. 나머지 64 는 인물 역할도 비어 있다.
- 코치 행은 역할이 모두 있어 바뀌지 않는다. 코치 행에는 국적을 쓰지 않는다(열린 결정, 아래 참고).
- 목록 글이 바뀐 행은 75개다. 전부 전에는 `-` 가 보이던 행이다. `-` 는 빈 칸으로 본다(`val` 과 같은 규칙).
- 한국 탭 행 수는 18 → 18 로 같다.

### A-2 생년월일 공개
- 날짜가 있는 성인: "2006-08-27 (20세)" / "August 27, 2006 (age 20)".
- 미성년(만 18세 미만): 연도만. 현재 2명(ion 2009-01-07, jamelinho213 2009-09-10, 기준일 2026-11-02). 표시 "2009년 (17세)" / "2009 (age 17)".
- 연도만 있는 값: "2002년 (약 24세)" / "2002 (about 24)". 현재 데이터에는 없다(시험에서만 확인).
- 없는 값은 "미공개"를 흐리게 쓴다(기존과 같음). 정적 빌드 HTML 은 바뀌지 않는다(상세 정보는 실행 시 그린다).
- 브라우저 확인(개발 서버): 한·영 absol, ion 의 생년월일 칸이 위 표시와 같고, 페이지 오류 0.

### A-3 빈 정보 현황 (`node scripts/gaps.mjs`, 앞 10줄)
```
인물 140명 (선수 111명, 코치 29명), 빈 항목이 있는 인물 139명
항목 | 선수 | 코치 | 합계
생년월일 | 10 | 11 | 21
포지션·역할 | 65 | 0 | 65
국적 | 9 | 5 | 14
본명 | 6 | 5 | 11
경력 | 7 | 5 | 12
VLR | 25 | 9 | 34
Liquipedia | 8 | 6 | 14
계약 만료 | 110 | 29 | 139
```
- `--json` 은 빈 항목이 있는 인물 139명을 낸다. 정렬은 빈 항목 수 많은 순, 같으면 현재 소식에 나오는 인물 먼저.
- 계약 만료는 people 에 `contractUntil` 이 한 명에게만 있어 139명이 빈 칸으로 잡힌다. 계약 항목은 전원이 같아 정렬에는 영향이 없다.

### 확인
- 시험 104 개 통과. validate 오류 0, build 성공.
- 빌드 비교: origin/main 과 `_site` 의 HTML 차이 0(4개 차이는 js/ 원본 4개뿐).
- data/ 는 바꾸지 않았다. gaps.mjs 는 data/ 를 읽기만 하고 표준 출력에만 쓴다.

### 열린 결정 · 알아 둘 점
- 코치 행의 국적: 지금은 역할만 보인다. 국적을 함께 보일지는 사용자가 정한다.
- main 의 cleanName 은 공백을 다듬지 않는다. 공백만 있는 값은 아직 빈 칸이 아니다. PR #18(fix/blank-rule)이 병합되면 trim 이 들어온다.
- cleanName export 는 PR #18 과 같은 줄을 바꾼다. 두 PR 중 나중 것이 충돌을 풀어야 한다.

### PR 과 병합
- PR 제목: 선수 정보 보충 표시, 생년월일 공개, 빈 정보 현황 스크립트 (병합하지 않음)
- 병합 시각: 예약 작업 실행 시각(14:50·15:35·20:50·21:35, 다음날 08:50·09:35 KST) 앞뒤 30분을 피한다.
## 15회차 팀 머리 키우기, 후원 문구, 모바일 전환·정렬 줄바꿈 (2026-11-02)
- 브랜치 fix/mobile-polish-15 (origin/main `c889494` 기준). 항목마다 커밋 하나. 이 PR 은 병합하지 않는다.
- 기준선(origin/main): 시험 100, 검증 오류 0, 경고 471, 빌드 인물 140·팀 334·sitemap 954.
- 예약 작업 실행 시각: 08:50·09:35 KST, 11/16까지 14:50·15:35·20:50·21:35 KST. 병합은 이 시각 앞뒤 30분을 피한다.

### 결과
| 항목 | 상태 | 내용 | 변경 | 시험 |
|---|---|---|---|---|
| U-1 팀 머리 키우기 | 고침 | 토큰 `--fs-team`(19, 모바일 18)·`--fs-region`(= `--fs-5`, 모바일 20) 추가. 팀 머리 800·`--ink`, 인원 수는 `--mute`. 팀 머리 위 구분선(지역 머리 바로 다음 첫 팀은 없음). 모바일: 긴 팀명 줄바꿈, 인원 수 줄 끝 | css/style.css +11 −5 (커밋 be517de +9 −5, f1534ab +2 −0) | 100 → 100 (CSS, 측정) |
| U-2 후원 문구 | 고침 | ko "개발자 커피 사주기", en "Buy the developer a coffee". index.html 정적 글자도 같이 | ko·en·index 각 1줄 | 기존 11회차 시험 통과 |
| U-3 전환 버튼 폭 | 고침(재현 안 됨) | `.lang-switch`·`a` 를 `flex: 0 0 auto`, `max-content`. 측정값은 전후 같다 | css/style.css +3 −2 | 측정 |
| U-4 정렬 칩 줄바꿈 | 고침 | 600px 이하: 지역 칩 줄은 한 줄 가로 스크롤 유지, 정렬 칩은 다음 줄에서 넘치면 줄을 바꿈 | css/style.css +4 −4 | 측정 |

시험 100 → 100(새 시험 없음: CSS 변경은 브라우저에서 측정했다). 검증 종료 코드 0, 경고 471(같음). 빌드 인물 140·팀 334·sitemap 954(같음).

### U-3 재현 결과
- WebKit(playwright webkit-2386) iPhone 13·iPhone SE, Chromium 360·375·414 × 한국어·영문. 버튼 폭 85~86px, 링크 높이 44px. 늘어나지 않았다.
- 사용자 기기(모바일 Safari)에서만 늘어난다는 보고는 이 측정으로 재현하지 못했다. 방어 수정만 넣었다. 측정값은 수정 전후 같다.

### U-1 측정 (WebKit·Chromium)
- 375: 지역 머리 20px/800, 팀 머리 18px/800 `--ink`, 선수 이름 17px. 1280: 22·19·17.
- 첫 팀 선 0px, 이후 팀 선 1px.
- 바로가기: 지역 머리 상단이 탭 아래 44px(= `--tabs-h`)에 붙고 온전히 보인다(375·1280, 처음 세 지역).

### U-4 측정
- 360·375·414 × 한국어·영문 × WebKit·Chromium: 정렬 칩이 모두 viewport 안, 한 줄 아래(지역 줄 밑), 왼쪽 16px. 칩 "새 N" 배지 잘림 없음. 문서 가로 넘침 없음.
- 지역 칩 줄은 가로 스크롤 가능(bleed 16px). 이 16px 때문에 `.bar.b2` 의 scrollWidth 가 넘치는 것은 의도다. 정렬 칩 줄은 넘치지 않는다.

### U-2 확인
- 두 언어 라벨이 칩 줄 안에서 칩 사이에 끼지 않는다(360·375). 영문 360px 에서는 전환 버튼이 다음 줄로 간다(넘침 없음).

### 화면 불변 확인 (DOM)
- origin/main 과 빌드 결과를 비교했다. 후원 문구 두 값을 같은 글자로 바꾼 뒤 989개 파일 중 986개가 같다. 다른 3개는 `css/style.css`, `js/i18n/ko.js`, `js/i18n/en.js` 뿐이다(의도한 변경).
- 스크린샷: 360·375·414·768·1280 × 라이트·다크 × 한국어·영문(Chromium), WebKit 360·375 라이트. 작업 폴더 `scratchpad/shots-15`(수정 후)와 `shots-15-before`(main)에 있다. PR 에는 몇 장만 넣는다.

### 열린 결정 · 알아 둘 점
- 16회차 디자인 토큰 작업은 이 PR 병합 뒤에 시작한다. 지금은 시작하지 않았다.
- 15회차는 14회차(feature/info-fill, PR 미병합)와 겹치지 않는다. 두 PR 은 각각 main 에서 갈라졌다.

### PR 과 병합
- PR 제목: 팀 머리 키우기, 후원 문구 변경, 모바일 전환 버튼·정렬 칩 줄바꿈 (병합하지 않음)
- 병합 시각: 예약 작업 실행 시각(08:50·09:35, 11/16까지 14:50·15:35·20:50·21:35 KST) 앞뒤 30분을 피한다.

## 16회차 디자인 토큰 3층, 컴포넌트 견본, 스타일 자동 점검 (2026-11-02)
- 브랜치 feature/design-tokens (origin/main `5703a43` 기준, 15회차 PR #19 병합 뒤). 항목마다 커밋 하나. 이 PR 은 병합하지 않는다.
- 기준선(origin/main): 시험 100, 검증 오류 0, 경고 471, 빌드 인물 140·팀 334·sitemap 954.
- 예약 작업 실행 시각: 08:50·09:35 KST, 11/16까지 14:50·15:35·20:50·21:35 KST. 병합은 이 시각 앞뒤 30분을 피한다.

### 결과
| 항목 | 상태 | 내용 | 변경 | 시험 |
|---|---|---|---|---|
| D-2 스냅숏 도구 | 새로 만듦 | scripts/style-snapshot.mjs: 목록 탭·인물·팀·없는 주소 × 한·영 × 라이트·다크 × 375·1280, 계산된 스타일 20속성. `--compare` 로 다른 값만 보인다(수동 실행, Playwright) | 파일 1 | 기준선 52,320개 값 |
| D-1 토큰 3층 | 고침 | 1층(:root·다크 블록: 글자·간격·모서리·터치·원색), 2층(:root 에서 한 번: --text-*, --space-*, --radius-*, --color-*, --status-*), 3층(규칙 맨 위 --이름 선언). 규칙은 2층·3층만 쓴다. 중복 선택자 8건 제거 | css/style.css 3층 재작성 | 스냅숏 차이 0 |
| D-4 자동 점검 | 새로 만듦 | scripts/css-check.mjs: 중복 선택자, 날것의 값(#색·rgb·px·기본값 토큰), 대비(본문 4.5:1, 테두리·아이콘 3:1, 라이트·다크), 터치(모바일 --tap 44px 이상). 시험에 넣었다 | 파일 1, 시험 +4 | 104 |
| D-3 견본 페이지 | 새로 만듦 | dev/styleguide.html(바깥 틀: 언어·색·폭 선택, iframe 미리보기), dev/styleguide.js(안쪽: 실제 regionsHTML·recentHTML·infoHTML·monoHTML·routeHTML). 샘플은 scripts/fixtures(+ styleguide/extra.json: 긴 이름·긴 팀명·한글 팀 칸·빈 팀 칸·빈 역할·잔류). dev-server 가 dev/ 를 연다 | dev 2 파일, fixtures 1 | build 에 dev/ 없음(시험) |
| D-5 문서 | 고침 | design-brief "토큰" 절을 3층으로 다시 씀(이름·라이트값·다크값·용도 표), "새 스타일을 넣을 때" 다섯 단계, 외부 디자인 시스템을 쓰지 않는 이유. README.md 를 새로 만들고 "로컬에서 실행" 절을 넣었다 | 문서 2 | — |

시험 100 → 104(+4). 검증 종료 코드 0, 경고 471(같음). 빌드 인물 140·팀 334·sitemap 954(같음).

### D-1 화면 불변
- 스냅숏: origin/main 빌드 트리를 따로 띄워 잰 기준선과 새 CSS 를 비교했다. 52,320개 값 모두 같다(차이 0).
- 빌드 HTML: origin/main 빌드와 비교하면 989개 파일 중 988개가 같다. 다른 하나는 `css/style.css` 뿐이다. 견본 페이지는 배포 출력에 없다.

### D-4 점검 결과
- 처음 돌린 결과: 중복 선택자 8건, 날것의 px 15건, 날것의 색 0건, 기본값 토큰 0건, 대비 부족 0건, 터치 0건.
- 고친 뒤: 통과. 중복 선택자는 규칙을 합쳤고, px 는 3층 컴포넌트 토큰이나 `--link-underline-offset` 으로 옮겼다. 값은 그대로다(스냅숏으로 확인).
- 대비: 라이트·다크 모두 본문 쌍 4.5:1, 테두리·아이콘 쌍 3:1 이상. 색 값은 바꾸지 않았다.

### D-3 견본 확인
- Chromium 375 라이트 한국어와 375 다크 영문을 확인했다(행 15, 머리 14·7, 칩과 토큰 표가 실제 CSS 로 그려짐). 페이지 오류 없음. 바깥 틀은 iframe 을 한 번만 중첩한다.
- 스크린샷 8장(375·1280 × 라이트·다크 × 한·영): 작업 폴더 `scratchpad/sg-shots`.

### 열린 결정 · 알아 둘 점
- 다크 블록은 두 개다. CSS 는 "OS 가 다크일 때"와 "data-theme=dark" 두 조건을 한 규칙으로 묶지 못해서, 1층 값(바탕·글자·원색 약 25개)을 두 번 쓴다. 2층 의미 토큰은 한 번만 쓴다. 한 번만 쓰려면 JS 로 data-theme 을 정해야 하는데 index.html 인라인 스크립트를 건드리게 되어 이번 회차에서 하지 않았다.
- 간격 의미 토큰은 역할 이름(--space-section 등) 대신 단계 이름(--space-xs…3xl)을 썼다. 한 단계 값이 여러 역할에 쓰여서다.
- 견본의 탭·칩·고정 막대 마크업은 main.js 와 같은 모양으로 적었다. main.js 를 불러오면 바로 시작하므로 export 하지 않았다.
- 스냅숏은 Chromium 만 썼다. WebKit 스냅숏은 하지 않았다.

### PR 과 병합
- PR 제목: 디자인 토큰 3층 정리, 컴포넌트 견본 페이지, 스타일 자동 점검 (화면 변화 없음)
- 병합 시각: 예약 작업 실행 시각(08:50·09:35, 11/16까지 14:50·15:35·20:50·21:35 KST) 앞뒤 30분을 피한다.

## 17회차 머리말: EN/KR 오른쪽 정렬, 후원 메뉴 간격 (2026-11-02)
- 브랜치 fix/header-align-17 (origin/main `7ef3a0b` 기준). 이 PR 은 병합하지 않는다.
- 원인: 15회차에서 `.lang-switch` 에 `align-self: center` 를 넣었다. 601px 이상에서 `.top-side` 는 세로 쌓기(`flex-direction: column`, `align-items: flex-end`)라서, 이 속성은 가로 가운데로 밀었다. EN/KR 만 칸 가운데에 떠 있었고, 아래 후원 메뉴의 오른쪽 끝과 맞지 않았다.

### 결과
| 항목 | 상태 | 내용 | 변경 |
|---|---|---|---|
| H-1 EN/KR 오른쪽 끝 | 고침 | `.lang-switch` 기본 규칙에서 `align-self: center` 삭제. 601px 이상은 `.top-side` 의 `flex-end` 를 따라 오른쪽 끝에 붙는다. 600px 이하 `.top-side .lang-switch` 에 `align-self: center` 를 옮겨 둔다 | css/style.css 2줄 |
| H-2 후원 메뉴 간격 | 고침 | 601px 이상 `.top-side` 세로 간격 `--space-s`(8) → `--space-m`(12). 600px 이하 `.top-side` 에 `gap: var(--space-s)` 를 더해 모바일 간격을 그대로 둔다 | css/style.css 2줄 |

### 측정 (Chromium, 라이트·다크, 한·영)
- 768·1280·1920: EN/KR 오른쪽 끝 = 후원 메뉴 마지막 링크 오른쪽 끝 = 본문 오른쪽 끝. 전 조합에서 차이 0. 전에는 1920 에서 KR 1362px·EN 1400px 로 본문 끝(1480px)과 어긋났다.
- 두 줄 간격(EN/KR 아래 끝 → 후원 메뉴 위 끝): 12px. 전에는 8px.
- 600px 이하: 버튼 폭 85px(120px 이하), 링크 높이 44px, 가로 넘침 없음. 전후 값이 같다(모바일 행 0 차이).
- 세로 가운데 맞춤(±2px): 375·414 의 EN 은 후원 메뉴와 같은 줄에 있고 가운데가 0px 차이다. 한국어와, 360px 의 영문은 전에도 두 번째 줄로 넘어갔다(후원 문구가 길어서). 이번 회차는 그 줄바꿈을 바꾸지 않았다.
- WebKit: 360·375·414 에서 같은 결과(폭 86px, 높이 44px, 넘침 없음).

### 스냅숏과 견본
- `style-snapshot` 비교: 아래 결과 참고.
- 견본(dev/styleguide.html)에는 머리말 견본이 없다. 17회차에서 새로 만들지 않았다.

### 열린 결정 · 알아 둘 점
- H-2 는 `--space-m` 을 골랐다. 1920 다크 스크린샷에서 간격이 적당해 `--space-l` 은 비교하지 않았다.
- 한국어 머리말의 후원 문구가 길어서 375·414 에서도 EN/KR 이 두 번째 줄로 간다(전에도 그랬다). 가운데 맞춤 기준은 같은 줄일 때만 적용된다.

### PR 과 병합
- PR 제목: 머리말: EN/KR 오른쪽 정렬, 후원 메뉴 간격 (병합하지 않음)
- 병합 시각: 예약 작업 실행 시각(08:50·09:35, 11/16까지 14:50·15:35·20:50·21:35 KST) 앞뒤 30분을 피한다.

## 18회차 영문 링크 미리보기 이미지 (og-en.png)
- 브랜치 feature/og-en (origin/main `63fc6b4` 기준). 이 PR 은 병합하지 않는다.
- 원인: 영문 페이지의 og 태그는 영문인데 `og:image` 가 한국어 `og.png` 를 가리켜, 영문 링크 공유 시 한국어 그림이 나왔다.
- 변경: `og-en.png`(1200×630, 44KB) 새로 만듦. `toLang(en)` 이 `og:image` 를 `og-en.png` 로 바꾼다. 빌드가 `og-en.png` 를 출력 루트에 복사한다. 한국어 페이지는 그대로 `og.png`.
- 그림: `og.png` 와 같은 배치·색(#F6F8F5 바탕, 진한 초록 글자, 알약 주황·초록·회색). 글자는 제목 `VALORANT VCT / Player Moves`, 설명 `Players and coaches looking for a new team, and confirmed moves, by region.`, 알약 `Looking for team` / `Joined new team` / `Left team`.
- 제작: 임시 HTML 을 Playwright(chromium)로 1200×630 캡처. 글꼴은 Segoe UI 굵게(Windows 기본). 저장소에 글꼴을 넣지 않았다.
- 차이: 사전 `meta.ogDesc` 는 "…Updated daily with source links." 까지 긴 문장이다. 그림 안 설명은 지시문 표의 짧은 문장을 썼다.
- 시험: 116 통과. 영문 `og:image` 는 `og-en.png`, 한국어 `og.png`, `og-en.png` 1200×630 PNG·44KB 이하(시험 확인). validate 오류 0.
- 배포 뒤: 카카오·X·Slack 은 이미지를 캐시한다. 새 이미지가 안 보이면 각 서비스의 링크 미리보기 도구로 `https://4nhackle.github.io/VCT-board/en/` 를 다시 읽힌다.

## 19회차 이적 병합과 한국 탭 기준 통일 (PR 1, 2026-11-08)

### 결과
- 이적 행만 있던 9명(LFT 행 없음)이 선수·코치 탭에 들어갔다. LFT 행이 있는 이적은 그 행을 이적 상태로 바꾼다(발표일이 있으면 확정).
- 한국 탭은 "국적 한국 또는 소속(이적이면 도착) 팀 국가 한국" 한 기준이다. 해외 팀의 한국인 코치가 들어간다. 개수: 23 → 29.
- 선수 144 → 150, 코치 44 → 47. 자세한 것은 `docs/sessions/2026-11-08-pr1-transfer-merge.md`.

### 열린 결정 · 알아 둘 점
- tkzin, nats 는 최근 이적이 "잔류"라 알약이 "잔류"로 바뀌었다. 확인 필요.
- 이 PR 은 `fix/transfer-merge` 에 있다. 병합은 하지 않았다.

## 20회차 계약 연도, caption 칸, 출처 경고 (PR 2, 2026-11-08)

### 결과
- 계약 만료는 숫자(시트 일련번호) 또는 연도 "yyyy" 를 받는다. 연도만 있으면 "2027년까지"로 보이고, 지난 해면 만료됨이다.
- 행에 `caption`(한 줄 요약)을 두면 목록 설명글로 쓴다. 출처 줄과 보도 시각은 비고 기준 그대로다. caption 이 없으면 화면은 이전과 같다.
- `validate.mjs`: caption 이 문자열이 아니면 오류, 120자 넘으면 경고. 출처 경고(https 아님, 홈페이지 주소, 같은 주소 중복)는 경고만 낸다. 현재 data 에는 출처 경고가 0건이다.
- 화면 비교: 이 PR 과 PR 1 커밋(`dd326c1`)의 목록(한·영)과 인물 상세가 같다.

### 열린 결정 · 알아 둘 점
- 이 PR 은 `feature/data-rules` 에 있고, 기준이 `fix/transfer-merge`(PR 1)다. PR 1 병합 뒤 기준을 `main` 으로 바꾼다.
- `style-snapshot.mjs` 는 실행하지 않았다(Playwright 미설치). 자세한 것은 `docs/sessions/2026-11-08-pr2-data-rules.md`.

## 21회차 오늘 탭과 거르기 4개 (PR 4, 2026-11-08)

### 결과
- 오늘 탭(선수 탭 뒤): 오늘(KST) 보도된 인물 행을 최근 소식순으로 보인다. 오늘 것이 없으면 가장 최근 날짜를 보이고 "오늘 소식 없음 · 최근 M/D"를 알린다.
- 거르기 4개: 포지션(선수·오늘·한국 탭), 확인 단계, 기간(오늘·3일·7일), 상위 팀만. 주소 `?pos=…&stage=…&days=…&top=1` 에 쓰이고 새로 고침·뒤로 가기에서 복원된다.
- 요약 칩 개수가 지역·검색·거르기를 반영한다(예전에는 지역·검색을 반영하지 않았다).

### 열린 결정 · 알아 둘 점
- 거르기 칩은 지시문의 "한 줄"이 아니라 그룹 4개로 나뉜다. 모양 정리는 디자인 세션.
- 포지션 "이니시에이터"(한국어 1행)는 Initiator 에 걸리지 않는다.
- 이 PR 은 `feature/today-filters` 에 있고 기준은 `main`. 병합은 하지 않았다. 자세한 것은 `docs/sessions/2026-11-08-pr4-today-filters.md`.

## 22회차 팀 소식 구역과 목록 계약 표시 (PR 5, 2026-11-08)

### 결과
- 팀 화면에 "팀 소식": 지켜볼 팀 사건(철수·파트너십 탈락·계약 만료 예정·합류 보도)과, 로스터 계약 만료 임박 인물(90일 안 또는 지난 것, 올해 이하 연도). 둘 다 없으면 구역이 없다.
- 목록 행 메타 줄에 "계약 ~2026-11-02" 또는 "계약 ~2027". 계약 값이 없으면 화면이 그대로다.

### 열린 결정 · 알아 둘 점
- 지시문의 FURIA 철수 확인은 잘못되었다. 철수 사건은 LYON(`t/lyon/`)으로 확인했다. FURIA 는 구두 합의 보도 사건만 있어 구역이 보인다.
- 계약 칸이 1명뿐이라 실데이터에서 계약 임박 목록은 비어 있다.
- 이 PR 은 `feature/team-news` 에 있고 기준은 `main`. 병합은 하지 않았다. 자세한 것은 `docs/sessions/2026-11-08-pr5-team-news.md`.

## 23회차 로스터 탭 (PR 6, 2026-11-08)

### 결과
- 로스터 탭(`#roster`, 지켜볼 팀 앞): partner·ascended 팀마다 현재 로스터, 선수 다음 코치, 이번 비시즌 +/− 인원. 지역 거르기만 적용.
- 로스터가 5명 미만이면 "로스터 정보 일부", 없으면 "정리 중"(운영 종료 팀은 "운영 종료").

### 열린 결정 · 알아 둘 점
- 커버리지(8d39e50): 34팀 중 5명 미만 21팀, 0명 4팀, 총 134명. 기준(17팀 이상)에 해당해 중단 조건이었으나 사용자가 계속하라고 했다.
- 로스터 탭의 검색 칸은 아무 작용을 하지 않는다. 숨길지 결정 필요.
- 데이터의 역할 값(한국어)이 영문 화면에도 그대로 보인다.
- 이 PR 은 `feature/roster-tab` 에 있고 기준은 `main`. 병합은 하지 않았다. 자세한 것은 `docs/sessions/2026-11-08-pr6-roster-tab.md`.

## 24회차 개인정보처리방침에 web3forms·Cloudflare 고지 (PR 7, 2026-11-08)

### 결과
- 방침(한·영)이 건의 "보내기"의 web3forms 전송과 Cloudflare Web Analytics 측정을 밝힌다. 건의 탭 보내기 아래에 안내 줄과 방침 링크를 둔다.
- Cloudflare 설명은 공식 페이지의 "쿠키·로컬 저장소를 쓰지 않는다"는 문장만 인용했다. 보관 기간과 IP 처리는 벤더 방침을 따른다고 적었다.
- 비콘은 1359/1360 HTML 페이지에 있다(예외: 구글 확인 파일 하나).

### 열린 결정 · 알아 둘 점
- web3forms 방침 원문과 DPA 는 403 으로 읽지 못했다. 보관 기간·IP 문장은 사람이 확인해야 한다.
- 이 PR 은 `docs/privacy-disclosure` 에 있고 기준은 `main`. 병합하지 않았다. 자세한 것은 `docs/sessions/2026-11-08-pr7-privacy-disclosure.md`.

## 25회차 건의 폼에 hCaptcha 추가 (PR 8, 2026-11-08)

### 결과
- 건의 탭을 열 때만 hCaptcha 를 불러온다. 토큰이 없으면 보내지 않고 안내를 보인다. 보낸 뒤 위젯을 다시 맞춘다.
- 불러오지 못하면 보내기만 끈다. 메일 앱과 복사는 그대로 쓴다.
- 방침(한·영)이 hCaptcha 를 밝힌다(IP·브라우저·기기, 마우스·키 입력 같은 확인 데이터, 쿠키 설정, 만료 뒤 최대 1년 보관).

### 열린 결정 · 알아 둘 점
- 클라이언트 확인만으로는 직접 HTTP 요청을 막지 못한다. 서버 확인은 web3forms 대시보드에서 hCaptcha 를 켜야 한다(사용자 작업).
- web3forms 문서는 자체 클라이언트 스크립트를 쓰라고 하지만, 지시문대로 hCaptcha API 를 직접 불렀다. 같은 토큰 필드(`h-captcha-response`)를 보낸다.
- 실제 테스트 메일 전송과 hCaptcha 풀이는 사용자가 한다. 자세한 것은 `docs/sessions/2026-11-08-pr8-form-captcha.md`.
## 26회차 감사 지적 4·5: 이적 병합 분리, 목록 주소 처리 결정 시험 (PR 9, 2026-11-08)

### 결과
- `buildTabs` 의 이적 병합 블록을 `mergeMoves(P0, CO0, T1, T2, PEOPLE)` 로 옮겼다(동작 변화 없음, 주석 그대로).
- 목록 주소 처리 결정을 `listAction(...)` 으로 옮기고 `renderRoute` 가 쓴다. "같은 탭의 거르기 변경" 경우에 시험이 생겼다(PR 4 버그).
- 시험 145개 통과. 시험이 물고 있는지 확인: `refilter` 분기를 지우면 "'none' !== 'refilter'" 로 실패한다.
- 빌드 HTML 차이 0(`origin/main` 대비). `js/` 파일 3개만 다르다.

### 열린 결정 · 알아 둘 점
- 감사 지적 7(색인 두 번 만들기)과 8(안 쓰는 내보내기)은 이 PR 밖이다.
- 이 PR 은 `refactor/merge-moves-route-test` 에 있고 기준은 `main`. 병합하지 않았다. 자세한 것은 `docs/sessions/2026-11-08-pr9-merge-moves-route-test.md`.

## 27회차 인물 이름 충돌은 personId 없는 소식 행이 끼면 오류 (PR 10, 2026-11-08)

### 결과
- `validate.mjs`: 인물 이름이 같은 ID 가 되고, 그 가운데 personId 없는 소식 행(players·coaches·transfers)이 있으면 오류로 멈춘다. 인물 명단끼리만의 충돌과 팀 이름 충돌은 경고 그대로다.
- 시험 5개 추가(임시 데이터 폴더에서 `validate.mjs` 실행). 현재 data 는 오류 0.
- 로컬 `docs/instructions/revised/web-publish-daily.txt`(git 에 없음)의 4단계에 같은 규칙을 넣었다. 예약 작업 쪽 반영은 사용자 작업이다.

### 열린 결정 · 알아 둘 점
- 예약 작업의 안전 검사가 `validate.mjs` 와 맞아야 한다. 맞지 않으면 커밋한 뒤 Actions 가 거부한다(PR 본문의 문구를 붙여 넣는다).
- 이 PR 은 `fix/person-id-clash` 에 있고 기준은 `main`. 병합하지 않았다. 자세한 것은 `docs/sessions/2026-11-08-pr10-person-id-clash.md`.

## D5 링크 미리보기 그림 다시 그리기 (2026-11-08)

### 결과
- 브랜치 `design/d5-og-image` (기준 `origin/main`). 병합하지 않았다. 자세한 것은 `docs/sessions/2026-11-08-D5-og-이미지.md`.
- 루트 `og.png`(한국어)·`og-en.png`(영어)를 밝은 Ink·Coral 스타일로 다시 그렸다. 1200×630, 각 40 KB·55 KB.
- 원본 템플릿 `dev/og.html`, `dev/og-en.html` 을 저장소에 두었다. 캡처 명령은 각 파일 맨 위 주석, 다시 그리는 방법은 README 에 적었다.
- 영문 설명문은 한 줄에 맞게 줄였다("Players and coaches seeking new teams, and confirmed moves."). 원문은 `meta.ogDesc`.
- 글꼴은 Malgun Gothic 으로 캡처했다(Pretendard 미설치). 제목 굵기 900 은 Malgun 의 굵은 체로 그려졌다.
## 28회차 Ink·Coral 팔레트, 경고색, 화면 테마 전환, 머리 정리 (D1, 2026-11-08)

### 결과
- 브랜치 `design/d1-palette-theme` (기준 `origin/main`). 병합하지 않았다. 자세한 것은 `docs/sessions/2026-11-08-D1-팔레트-테마.md`.
- 팔레트: 라이트·다크를 설계 문서 4.1 값으로 바꿨다. 강조는 코랄(라이트 `#C42F3B`, 다크 `#FF6B73`), 경고는 자주색 계열(라이트 `#F3E3F0`/`#7A1F5C`, 다크 `#3A1730`/`#F0A6D8`). 1층 이름 `--green-on`·`--red-*` 은 `--coral-*`·`--plum-*` 로 바꿨고, 2층 이름은 그대로다.
- 경고 세 곳(`.wk.withdraw`, `.dp-box`, `.dp-off`)에 `⚠` 를 `::before` 로 붙였다(대체 글은 비움).
- 화면 테마: 머리에 시스템·라이트·다크 전환(`.theme-switch`). 저장값은 `localStorage["vct-theme"]`, 첫 인라인 스크립트에서 적용해 깜빡임이 없다. 목록·인물·팀·404 에 전환이 있고, 개인정보·이용약관은 저장된 테마만 따른다.
- 머리: 데스크톱은 `[테마][KR|EN]` 한 줄, 600px 이하는 후원 메뉴 왼쪽·테마/언어 오른쪽(좁으면 줄바꿈).
- 확인: `node scripts/test.mjs` 153개 통과(새 시험 2개: `themeOf`, 머리 스크립트의 테마 적용), `node scripts/css-check.mjs` 통과, `node scripts/validate.mjs` 오류 0, `node scripts/build.mjs` 통과.

### 열린 결정 · 알아 둘 점
- `css/style.css` 주석은 `docs/디자인-설계-2026-11.md` 를 가리킨다. 이 문서는 메인 폴더에만 있고 아직 커밋되지 않아 이 PR 에는 없다.
- 스크린샷은 파일로 저장하지 않았다. 개발 서버 브라우저 창에서 1280·375, 라이트·다크를 확인했다.

## D2 거르기 두 줄 (2026-11-08)

### 결과
- 브랜치 `design/d2-filter-toolbar` (기준 `origin/main`, D1 병합 뒤). 병합하지 않았다. 자세한 것은 `docs/sessions/2026-11-08-D2-거르기-줄.md`.
- 거르기 줄을 두 줄로 줄였다. 1줄 상태 묶음과 검색, 2줄 지역 묶음(ALL·AMER·EMEA·PACIFIC·CN), 포지션·단계·기간 칸, VCT 파트너팀 단추, 정렬 칸. 셋째 줄 `#fx` 는 없앴다.
- 파트너팀 단추는 `tier === "partner"` 만 남긴다(승격 팀은 빠진다). 주소는 `vct=1`, 옛 `top=1` 도 받는다.
- 칸은 처음 한 번 만들고 탭마다 값·보임만 맞춘다. 쓰지 않는 칸은 자리만 두고 가린다.
- 확인: 테스트 154개 통과, css-check 통과, 빌드 통과. 1280px 둘째 줄 한 줄, 375px 가로 스크롤 한 줄.

### 열린 결정 · 알아 둘 점
- 상태 필드 이름은 `top` 그대로 두었다. URL 만 `vct` 로 바꿨다.
- `dev/styleguide` 의 칩 견본은 옛 모양이다(개발용, 이번 범위 밖).
- 1280px 다크와 375px 라이트는 확인하지 않았다. 스크린샷은 저장하지 않았다.

## D3 목록 행: 칸 정렬, 펼침 단추, 두 줄 모바일 (2026-11-08)

### 결과
- 브랜치 `design/d3-table-rows` (기준 `origin/main`, D2·D5 병합 뒤). 병합하지 않았다. 자세한 것은 `docs/sessions/2026-11-08-D3-목록-행.md`.
- 행 칸을 사람·이동·상태·날짜·펼침 순서로 나눴다. 목록마다 칸 너비 토큰을 같게 두어 목록끼리 줄이 맞는다. 목록마다 머리 행(데스크톱에서만)을 둔다.
- 설명·단체 링크·출처 줄은 펼침 영역에 넣었다. 단추의 `aria-controls` 와 영역 `id` 가 같고, 펼침은 다시 그리지 않는다.
- 모바일은 두 줄 요약(이름·상태 / 이동 / 날짜·단추). 단추 44×44.
- 확인: 테스트 157개 통과, css-check 통과, 빌드 통과. 1280px 칸 정렬, 375px 두 줄, 키보드 Enter 펼침.

### 열린 결정 · 알아 둘 점
- 계약 글은 펼침이 아니라 메타 줄에 두었다(기존 시험과 맞춤).
- 모바일 두 줄은 지시문의 한 줄 대신 셋째 줄에 날짜와 단추를 둔다.
- 1280px 다크, 375px 라이트, 최근 소식·지역 묶음 보기는 브라우저에서 따로 보지 않았다. 스크린샷은 저장하지 않았다.

## PR 11 people.json·teams.json 필수화 (2026-11-08)

### 결과
- 브랜치 `fix/required-people-teams` (기준 `origin/main` 2bb0f1e). 병합하지 않았다. 자세한 것은 `docs/sessions/2026-11-08-pr11-required-people-teams.md`.
- `scripts/validate.mjs`: 두 파일이 없으면 오류로 종료한다. 빌드·배포 전에 CI 가 멈춘다.
- `scripts/build.mjs`: 동작은 그대로(경고만), 주석만 고쳤다. 로컬 부분 빌드를 위해서다.
- `scripts/test.mjs`: 시험 헬퍼가 두 파일을 `[]` 로 쓴다. 새 시험 1개(없음·있음). 인물 전용 시험의 픽스처에 인물을 추가했다.
- 확인: 시험 158개 통과(전: 157개), 실제 데이터 검증 오류 0·경고 644(전후 같음), 빌드 통과.

### 열린 결정 · 알아 둘 점
- 빈 파일(`[]`) 검사는 하지 않았다. 후속 작업.

## PR 12 건의 메일 제목·본문 시험 (2026-11-08)

### 결과
- 브랜치 `test/suggest-mail` (기준 `origin/main` bd30f27). 병합하지 않았다. 자세한 것은 `docs/sessions/2026-11-08-pr12-suggest-mail-test.md`.
- `js/views/suggest.js`: 메일 제목·본문을 만드는 식을 `mailParts(type, text, link)` 순수 함수로 뺐다. `composed()` 는 그 호출 한 줄이다. 화면 변화는 없다.
- 시험 1개 추가(제목, 근거 링크 줄, 바닥글, 링크 없음). 기대 글은 `KO` 에서 읽는다.
- 확인: 시험 159개 통과(전 158), validate 오류 0·경고 644(전후 같음), css-check·빌드 통과. 원래 식과 네 입력에서 같음(Node 비교).

### 열린 결정 · 알아 둘 점
- 브라우저에서 `mailto:` 를 직접 보지 못했다. Obscura 가 `127.0.0.1` 을 막는다. 내장 브라우저는 허락 없이 쓰지 않았다.
## PR 13 수동 도구 문서화, 기준 시각 줄 규칙 정정 (2026-11-08)

### 결과
- 브랜치 `docs/manual-tools` (기준 `origin/main` bd30f27). 병합하지 않았다. 자세한 것은 `docs/sessions/2026-11-08-pr13-docs-manual-tools.md`.
- `README.md`: 샘플 사이트와 번역 현황표 명령을 적었다.
- `CLAUDE.md` 20번째 줄: 예약 작업이 `data/` 와 `index.html` 의 기준 시각 줄을 커밋한다고 고쳤다.
- 발견: 샘플 사이트는 목록만 열린다. 인물 상세 `p/fx-one/` 은 404다(`fixture-site.mjs` 가 빌드 파일을 빠뜨린다). 이 절의 "열기" 줄도 그렇게 고쳤다. 복구는 후속 코드 작업.
- 확인: 두 README 명령 종료 0, 시험 158개 통과, validate 오류 0·경고 644, css-check·빌드 통과.

### 열린 결정 · 알아 둘 점
- 사용자 답 없이 권장안(문서화)을 따랐다.

## PR 14 문서 클릭 처리 결정 시험 (2026-11-08)

### 결과
- 브랜치 `test/click-action` (기준 `origin/main` b9b4b78). 병합하지 않았다. 자세한 것은 `docs/sessions/2026-11-08-pr14-click-action-test.md`.
- `js/state.js`: `clickAction(target)` 을 더했다. 링크 → 행 펼침 → 단추 순서를 그대로 옮긴 순수 함수다.
- `js/main.js`: 처리기가 `kind` 로 나뉜다. 분기 본문과 주석은 그대로다.
- 시험 1개 추가(가짜 요소, 여덟 경우). 확인: 시험 160개 통과(전 159), validate 오류 0·경고 644(전후 같음), css-check·빌드 통과.

### 열린 결정 · 알아 둘 점
- 브라우저 클릭 확인은 하지 못했다. Obscura 가 `127.0.0.1` 을 막는다. 내장 브라우저는 허락 없이 쓰지 않았다.

## PR 15 개발 도구 정리, 샘플 사이트 빌드, SRI 결정 기록 (2026-11-08)

### 결과
- 브랜치 `fix/dev-tools-cleanup` (기준 `origin/main` c5cd56b). 병합하지 않았다. 자세한 것은 `docs/sessions/2026-11-08-pr15-dev-tools-cleanup.md`.
- `dev/styleguide.js`: 낡은 칩 견본을 지웠다. 지역 선택 상자는 `REGIONS` 에서 만든다.
- `scripts/fixture-site.mjs`: 빌드에 필요한 파일을 옮기고 샘플 빌드를 돌린다. 샘플 사이트에 상세 페이지 `p/fx-one/` 이 생긴다(확인: 200).
- SRI 결정: hCaptcha 스크립트는 SRI 없이 둔다(주소가 버전 없이 바뀌므로). 건의 탭에서만 돈다. 위험 수용. 주석은 `js/views/suggest.js`.
- 확인: 시험 161개 통과(전 160), validate 오류 0·경고 644(전후 같음), css-check·빌드 통과. 배포되는 파일은 `js/views/suggest.js` 주석 한 줄뿐.

### 열린 결정 · 알아 둘 점
- 견본 화면과 콘솔 오류는 브라우저로 확인하지 못했다. Obscura 가 `127.0.0.1` 을 막는다.

## PR 16 툴바 정리: 정렬·단계 칸 제거, 기간·포지션 이름 바꿈 (2026-11-08)

### 결과
- 브랜치 `feat/toolbar-trim` (기준 `origin/main` 966623f). 병합하지 않았다. 자세한 것은 `docs/sessions/2026-11-08-pr16-toolbar-trim.md`.
- 정렬 칸, "새 N" 배지, 단계 칸, 정렬 안내 문구를 지웠다. `vct-order` 는 읽지 않는다(지우지도 않는다).
- 기간·포지션 칸: 기본값은 칸 이름, 고른 값은 값 글자만 보인다(KR·EN).
- 옛 주소 `?stage=…` 는 무시되고, 거르기를 바꾸면 주소에서 빠진다.
- 확인: 시험 161 → 160(단계 `matches` 시험 블록 삭제), validate 오류 0, css-check·빌드 통과. 내장 브라우저로 KR·EN·375 폭 확인.

### 열린 결정 · 알아 둘 점
- `.chip .n.new` 규칙은 죽은 코드지만 범위 밖이라 두었다.
- Obscura 가 `localhost` 를 막아 내장 브라우저로 확인했다. 1280 폭 고정 확인은 하지 않았다.

## PR 17 화면 테마 전환 제거, OS 설정만 따르기 (2026-11-09)

### 결과
- 브랜치 `feat/theme-system-only` (기준 `origin/main` f0277a4). 병합하지 않았다. 자세한 것은 `docs/sessions/2026-11-09-pr17-theme-system-only.md`.
- 라이트·다크·시스템 전환 단추와 관련 스크립트·i18n 키를 지웠다. 사이트는 OS 설정만 따른다. 저장된 `vct-theme` 은 지우지 않고 무시한다.
- 확인: 시험 160 → 159(`themeOf` 시험 삭제), validate 오류 0, css-check·빌드 통과, `_site` 에 `vct-theme` 없음. 내장 브라우저로 저장값 무시, OS 다크 전환, 견본 다크 틀 확인.

### 열린 결정 · 알아 둘 점
- 강제 다크 CSS 블록은 견본·대비 점검용으로 남겼다.
- 1280 폭 헤더 정렬과 EN 375 폭은 확인하지 않았다.

## PR 18 지켜볼 팀 행: 긴 상황 글 접기 (2026-11-09)

### 결과
- 브랜치 `feat/watch-row-fold` (기준 `origin/main` 826fab5). 자세한 것은 `docs/sessions/2026-11-09-pr18-watch-row-fold.md`.
- 지켜볼 팀 행은 첫 조각만 보이고, 나머지와 출처는 펼침 영역에 든다. 펼침 단추와 영역 만드는 코드는 엔트리 행과 함께 쓴다(`foldHTML`).
- 확인: 시험 159 → 160 통과, validate 오류 0, css-check·빌드 통과. 1280 폭 #watch 높이 7777 → 4347px. 내장 브라우저에서 접힘 두 줄·펼침 전체, 375 폭 단추 위치 확인.

### 열린 결정 · 알아 둘 점
- 팀 링크 클릭과 키보드 조작은 자동 시험이 없고 직접 확인하지 않았다.
- EN 행 첫 조각 중 잘 읽히지 않는 것은 보고만 하고 데이터는 고치지 않았다.

## PR 19 로스터 탭: 목록 디자인 (2026-11-09)

### 결과
- 브랜치 `feat/roster-list-design` (기준 `origin/main` 66855fe), 커밋 전. 자세한 것은 `docs/sessions/2026-11-09-pr19-roster-list-design.md`.
- 로스터 탭이 선수 탭과 같은 `.rh` / `.th` / `ul.list > li.row` 모양을 쓴다. `hint.roster` 가 다시 보이고, 바로가기 상자가 지역 머리로 채워진다.
- 확인: 시험 160 통과, validate 오류 0, 빌드 통과.

### 열린 결정 · 알아 둘 점
- 화면 확인 안 함: sticky 머리, 375px, 밝은·어두운 테마, EN 의 KR 표시, `.hint + .list` 테두리. 내장 브라우저(Obscura)가 localhost 를 막아 열 수 없었다.

## 배포 기록
- Pages 설정: Source 를 GitHub Actions 로 전환(build_type `workflow`). 전환 전에 병합 때문에 legacy(main 루트) 배포가 한 번 나가, 라이브에 새 앱 코드가 잠깐 올라가 있었다(p/ 404).
- 첫 배포: run `41205403369` (main, pages.yml) 성공. build·deploy 모두 success.
- 실제 사이트 확인 (`https://4nhackle.github.io/VCT-board/`, 2026-10-31 22:4x KST):
  - `/` 200, `sitemap.xml` 200, `404.html` 200.
  - V-01~V-04 통과: 목록 필터·검색·정렬 유지, 뒤로가기 복원(스크롤 700), Ctrl·가운데 클릭 새 탭, 출처 링크 외부 이동.
  - V-03: `p/oxy/` 는 HTTP 404 지만 앱이 상세를 표시(404 대체). 제목 "OXY · VCT LFT·FA 현황".
  - V-10: `t/cloud9/` 는 404 지만 팀 상세 표시(임시 화면은 아님, 로스터 1명). 인물 → 팀 링크 이동 정상.
  - 임의 5명 상세 정상, 페이지 오류 없음.
  - V-08: people 데이터가 없어 정적 상세 페이지 0개 → 실제 사이트에서 확인 불가. 데이터 전환 후 확인.
  - V-01 픽셀 비교는 생략: 라이브 데이터가 기준과 달라 직접 비교가 안 된다(기능 확인만).
  - V-05~V-07 은 샘플 결과로 갈음.
- 체크리스트 2판 대응: 외부 코드 검토 수정 R-01~R-09 = F-01~F-09, 5-2 요청 1~4 = F-10~F-13.

## 남은 일
- S4-02: 이 PR(docs/s4-02) 병합. 병합 시각은 예약 작업 시각(08:50, 09:35 KST, 11/2~11/16 의 14:50·15:35·20:50·21:35 KST) 앞뒤 30분을 피한다.
- S4-03: 시트에 인물·팀 탭 추가와 기존 인원 채우기, 예약 작업 4개 지시문 변경(예약 작업 변경 설계서 8장 2~4번). 시트·예약 작업은 이번 구현 범위 밖(사용자 작업).
- V-08 실제 사이트 확인: people 데이터가 웹에 반영된 뒤 첫 예약 작업 실행(09:35 KST) 다음에 확인.
- 일정 날짜 검증 보강(js/views/schedule.js): 문자열 날짜("11/5–11/8" 등)의 연도 추정과 끝남·D-n 표시 시험. 범위 밖.
- 건의 폼 CAPTCHA(js/views/suggest.js): 외부 서비스로 바로 보내는 폼에 봇 방지가 없다. 범위 밖, 남용이 보이면 처리.
- 알려진 제한: 정적 페이지가 없는 상세 주소는 HTTP 404 로 열리고, 공유 미리보기는 people 데이터가 생긴 뒤에만 선수 이름으로 나온다(설계노트 S3-04 주의).

## 다음 회차에 알릴 점
- renderRoute() 는 상세일 때 #tabs·#summary·#filters·#fresh·#sgview·.notes 를 숨기고, 목록으로 돌아오면 #tabs·.notes 를 되살린 뒤 renderChrome·renderView 가 나머지를 정한다. 목록 → 목록(같은 탭) 이동은 기존처럼 다시 그리지 않는다. 상세 → 목록은 같은 탭이어도 다시 그린다.  스크롤 복원은 2회차 S1-05 에서 추가했다(목록 항목의 history.state).
- 데이터는 아직 `fetch("data/...")` 상대 경로다. 처음 로드 때만 쓰므로 지금은 문제없다(직접 진입은 dev-server·404.html 의 base 가 맞춰 준다). 상세 화면에서 다시 불러올 일이 생기면 BASE 를 붙인다.
- buildIndex 는 데이터 로드 뒤 main.js 에서 한 번 만들어 IDX 에 둔다(2회차부터).
- 임시 팀 ID `sentinels` 충돌(TenZ 행)은 위 "결정·변경" 참고.
- docs/ 의 docx 4개와 지시문 .md 파일들은 커밋하지 않았다(S4-02).
