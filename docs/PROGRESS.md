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
- [ ] S2-01 계산 함수
- [ ] S2-02 머리부분 보강
- [ ] S2-03 이번 이동 카드
- [ ] S2-04 팀 카드
- [ ] S2-05 경력 타임라인
- [ ] S2-06 검증용 샘플 데이터
- [ ] S2-07 검증 스크립트 확장
- [ ] S2-08 2단계 완료 확인

### 3단계: 팀 상세·정적 페이지·배포 (S3)
- [ ] S3-01 팀 상세
- [ ] S3-02 정적 페이지 생성
- [ ] S3-03 사이트맵
- [ ] S3-04 404 대체 진입점
- [ ] S3-05 배포 워크플로
- [ ] S3-06 Pages 배포 방식 변경
- [ ] S3-07 3단계 완료 확인

### 마무리 (S4)
- [ ] S4-01 main 병합과 배포
- [ ] S4-02 문서 커밋
- [ ] S4-03 예약 작업 전환 준비 완료 알림

## 결정·변경
- (1회차) pandoc 이 설치돼 있지 않아 docx 는 python(zipfile + XML)으로 본문을 추출해 읽었다. 문서 내용에는 영향 없음.
- (1회차, S0-02) 기준 캡처는 `python -m http.server` 로 저장소 루트(/)를 열어 Playwright 로 찍었다. 위치: 저장소 밖 /tmp/vct-baseline/ (Windows: %TEMP%\vct-baseline). 탭 6개 + 선수 탭 최근 소식순, 폭 390·1280, 각 .png 와 .page DOM(.html).
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
- (2회차, 알려진 한계) 팀 임시 ID 충돌 때문에 TenZ 행의 팀 링크("(은퇴 · 전 Sentinels)")가 /t/sentinels/ 로 간다. 시트 teamId 가 채워지기 전까지 그대로다. 3회차 팀 상세 전에 결정 필요.

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

## 다음 회차에 알릴 점
- (1회차 항목은 2회차에서 처리됨: 인물 상세 화면 구현, 제목 변경.) 팀 상세는 아직 임시 화면이다(js/main.js showDetail, TEMP). 3단계 S3-01 에서 교체.
- renderRoute() 는 상세일 때 #tabs·#summary·#filters·#fresh·#sgview·.notes 를 숨기고, 목록으로 돌아오면 #tabs·.notes 를 되살린 뒤 renderChrome·renderView 가 나머지를 정한다. 목록 → 목록(같은 탭) 이동은 기존처럼 다시 그리지 않는다. 상세 → 목록은 같은 탭이어도 다시 그린다.  스크롤 복원은 2회차 S1-05 에서 추가했다(목록 항목의 history.state).
- 데이터는 아직 `fetch("data/...")` 상대 경로다. 처음 로드 때만 쓰므로 지금은 문제없다(직접 진입은 dev-server·404.html 의 base 가 맞춰 준다). 상세 화면에서 다시 불러올 일이 생기면 BASE 를 붙인다.
- buildIndex 는 데이터 로드 뒤 main.js 에서 한 번 만들어 IDX 에 둔다(2회차부터).
- 임시 팀 ID `sentinels` 충돌(TenZ 행)은 위 "결정·변경" 참고.
- docs/ 의 docx 4개와 지시문 .md 파일들은 커밋하지 않았다(S4-02).
