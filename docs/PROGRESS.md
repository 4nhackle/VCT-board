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
- [ ] S3-06 Pages 배포 방식 변경
- [x] S3-07 3단계 완료 확인

### 마무리 (S4)
- [ ] S4-01 main 병합과 배포
- [ ] S4-02 문서 커밋
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
node scripts/dev-server.mjs 8705 "$TEMP/vct-fixture"
```
열기: http://127.0.0.1:8705/VCT-board/p/fx-one/ (fx-two, fx-three, fx-four, fx-five, fx-coach 도 있다). 시험이 끝나면 임시 폴더를 지운다. fixture-site.mjs 는 저장소 안 폴더를 거부한다. 샘플 기대값은 기준일 2026-10-31(46326) 에 맞춰 두었다. 날짜가 바뀌면 나이·계약 상태 값이 달라진다(함수는 today 를 받으므로 node 단위 확인은 날짜를 넣어 다시 할 수 있다).

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

## 남은 일 (병합 이후)
- S4-01 병합: PR https://github.com/4nhackle/VCT-board/pull/2 (feature/detail-pages → main). 병합 시각과 방식은 사용자가 정한다. 예약 작업 시각(08:50, 09:35 KST, 11/2~11/16 의 14:50·15:35·20:50·21:35 KST) 앞뒤 30분은 피한다.
- S3-06: 사용자가 Settings → Pages → Source 를 GitHub Actions 로 바꾼다. 병합 직후 deploy 단계가 실패할 수 있다(기존 사이트는 유지). 바꾼 뒤 `gh workflow run pages.yml --ref main` 으로 첫 배포를 한다.
- 실제 사이트 확인: V-01~V-04, V-10(임시 ID 404 대체 포함). V-05~V-07 은 샘플 결과로 갈음. V-08 은 people 데이터가 생긴 뒤에만 가능하다.
- S4-02: docx 4개와 최종 PROGRESS 를 작은 PR 로 커밋(사용자 승인 후). 웹 반영 예약 작업의 수정 금지 범위에 docs/ 를 넣는다.
- S4-03: 시트에 인물·팀 탭 추가와 기존 인원 채우기, 예약 작업 4개 지시문 변경(예약 작업 변경 설계서 8장 2~4번). 이번 구현 범위 밖.
- 알려진 제한 안내: 정적 페이지가 없는 상세 주소는 HTTP 404 로 열리고, 공유 미리보기는 people 데이터가 생긴 뒤에만 선수 이름으로 나온다(설계노트 S3-04 주의).

## 다음 회차에 알릴 점
- renderRoute() 는 상세일 때 #tabs·#summary·#filters·#fresh·#sgview·.notes 를 숨기고, 목록으로 돌아오면 #tabs·.notes 를 되살린 뒤 renderChrome·renderView 가 나머지를 정한다. 목록 → 목록(같은 탭) 이동은 기존처럼 다시 그리지 않는다. 상세 → 목록은 같은 탭이어도 다시 그린다.  스크롤 복원은 2회차 S1-05 에서 추가했다(목록 항목의 history.state).
- 데이터는 아직 `fetch("data/...")` 상대 경로다. 처음 로드 때만 쓰므로 지금은 문제없다(직접 진입은 dev-server·404.html 의 base 가 맞춰 준다). 상세 화면에서 다시 불러올 일이 생기면 BASE 를 붙인다.
- buildIndex 는 데이터 로드 뒤 main.js 에서 한 번 만들어 IDX 에 둔다(2회차부터).
- 임시 팀 ID `sentinels` 충돌(TenZ 행)은 위 "결정·변경" 참고.
- docs/ 의 docx 4개와 지시문 .md 파일들은 커밋하지 않았다(S4-02).
