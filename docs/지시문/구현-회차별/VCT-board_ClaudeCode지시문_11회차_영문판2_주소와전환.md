# VCT-board 11회차 지시문 — 영문판 2: 상태 영문, `/en/` 주소, EN/KR 전환

## 이번 회차의 위치

| 단계 | 내용 | 회차 |
|---|---|---|
| 1·2 | 문구 사전 분리, 언어별 표기 형식 | 10 (PR #14) |
| **3** | 상태 문구·역할·이적 구분의 영문(용어집), 번역 없는 원문 표시 | **11** |
| **4** | `/VCT-board/en/` 주소, 영문 정적 페이지·og·hreflang·사이트맵, EN/KR 전환 | **11** |
| 5 | 예약 작업이 비고·상황·일정 제목을 번역해 `*_en` 필드에 씀 | 12 |
| 6 | 건의 폼 안내, 약관·개인정보 영문 요약 | 12 |

10회차에서 정한 결정은 그대로 따른다.

- 언어는 주소로만 정한다.
- 전환할 때는 페이지를 실제로 이동한다.
- 데이터 원문(한국어)은 바꾸지 않는다.
- 판정용 정규식은 번역하지 않는다.
- GoatCounter는 같은 사이트 코드를 쓴다.

## 0. 시작 전 확인과 지킬 것

- **PR #14(`feature/i18n-1`)가 `main`에 병합됐는지 확인한다.**
  - 병합 전이면 아무것도 바꾸지 말고 보고한다.
  - 2026-11-02 기준으로 PR #14는 최신 `main`(데이터 커밋 포함)과 충돌 없이 합쳐진다. 그 상태에서 시험 77개 통과, 검증 오류 0, 빌드(인물 139, 팀 334, sitemap 476)를 확인했다.
- `main` 최신에서 브랜치 `feature/i18n-2`를 만든다.
- **예약 작업(웹 반영)과의 약속**: 예약 작업은 `index.html`에서 두 가지에 기댄다.
  - `<p class="lede">` 안의 `YYYY-MM-DD HH:mm 기준입니다.` 날짜·시각만 고친다.
  - 커밋 뒤 `<script type="module" src="js/main.js">`가 그대로 있는지 확인한다.
  - 그래서 이 두 곳의 글자와 태그 모양(`<p class="lede">`에 속성 추가 금지, 문장 형식 유지)을 바꾸지 않는다.
  - `index.html`의 다른 곳은 이번 회차에 고쳐도 된다.
- 다음은 건드리지 않는다.
  - `data/`
  - `terms/`, `privacy/`(6단계)
  - `og.png`(영문판도 같은 이미지)
  - `.github/`
- 단계마다 아래 세 명령이 통과해야 한다.
  - `node scripts/test.mjs`
  - `node scripts/validate.mjs`
  - `node scripts/build.mjs _site`
- 시작 전 기준선 `node scripts/build.mjs /tmp/before_site`를 만든다.

## 1. 상태와 역할의 영문 (3단계)

### 1-1. 용어집 번역기

- `js/i18n/glossary.js`를 만든다. 한국어 데이터 문구를 정해진 규칙으로 영문으로 바꾼다. 자유 번역이 아니다.
- **입력**: 상태(`status`), 이적 구분(`type`), 역할(`role`, `position`), 지켜볼 팀의 종류 문구
- **방법**:
  - 문구를 " · "로 나눈 조각마다 패턴 표를 적용한다.
  - 괄호 안의 팀 이름·연도·날짜는 그대로 옮긴다.
  - **어느 조각에든 한글이 남으면 그 문구 전체를 번역하지 않는다.** 반쪽 번역을 만들지 않는다. 이때는 null을 돌려준다.
- **패턴 예**: 현재 데이터의 상태 61종을 모두 뽑아 표를 채운다. 아래는 출발점이다.

| 한국어 | 영문 |
|---|---|
| 계약 완료({팀}) | Signed with {팀} |
| 탐색 허가 / 탐색 허가(계약 중) / 탐색 허가(계약 {연도}까지) | Free to explore / … (under contract) / … (contract through {연도}) |
| FA / FA 선언 / FA 탐색 / FA({M/D}) / 제한적 FA | Free agent / Declared FA / Exploring FA / Free agent from {Mon D} / Restricted FA |
| LFT / LFT 선언 / LFT 게시 / LFT(계약 해지) | LFT / Declared LFT / Posted LFT / LFT (contract terminated) |
| 방출 / 방출(로스터 전원) | Released / Released (entire roster) |
| 팀 이탈 / 팀 이탈(비활성) / {팀} 이탈(본인 확인) | Left team / Left team (inactive) / Left {팀} (self-confirmed) |
| 공식 결별 발표 / {팀} 공식 결별 발표 | Departure announced / {팀} announced departure |
| {팀} 합류 보도 / 구두 합의 보도 / 협상 가능 | Reported to join {팀} / Verbal agreement reported / Open to talks |
| {팀} 철수 확정 | {팀} exit confirmed |
| 이적 / 이적(복귀) / 이적({A}→{B}) / 잔류(재계약) | Transfer / Transfer (return) / Transfer ({A}→{B}) / Stayed (re-signed) |
| 헤드 코치 / 어시스턴트 코치 / 코치 / 퍼포먼스 코치 / 애널리스트 / (예정) | Head Coach / Assistant Coach / Coach / Performance Coach / Analyst / (incoming) |
| 보조 / 보조 콜러 | secondary / secondary caller |

- 표는 데이터 쪽 판정 정규식과 별개다. 판정 코드는 손대지 않는다.
- **커버리지 보고**: 현재 `data/`의 상태·구분·역할 문구 중 몇 %가 완전히 번역되는지 숫자로 보고한다. 번역되지 않은 문구는 목록으로 붙인다. 목표는 상태 90% 이상이다. 남는 것은 5단계(예약 작업 번역)로 넘긴다.
- **데이터 필드 우선순위**: 5단계에서 `status_en` 같은 필드가 생기면 그것을 먼저 쓴다. 이번에는 필드 읽기 자리만 만든다. 순서는 `*_en` 필드 → 용어집 → 원문 + KR 표시다.

### 1-2. 원문 표시 (번역이 없을 때)

- 영문 화면에서 한국어 데이터 글자를 그대로 보여 줄 때는 `<span lang="ko" class="kr-src">…</span>`로 감싼다. 그 뒤에 작은 표시 `<span class="kr-tag" aria-hidden="true">KR</span>`을 붙인다.
- 대상:
  - 비고 본문, 지켜볼 팀 상황, 일정 제목
  - 번역 안 된 상태·역할
  - 한글이 든 팀 칸(예: "(은퇴 · 전 Sentinels)", "팀명 미정")
- 한국어 본명(`realName`)은 사람 이름이라 `lang="ko"`만 붙이고 KR 표시는 하지 않는다.
- KR 표시는 토큰만 쓴다(`--fs-1`, `--mute`, `--line` 테두리, `--r-1`). 다크·라이트를 둘 다 확인한다.
- 화면 하단 안내(`.notes`)에 영문으로 한 줄을 넣는다: "Items marked KR are shown in the original Korean."

### 1-3. 10회차에서 남긴 것

- **`row.js` 줄 머리 `lead = esc(it.status) + ". "`**: 1-1 → 1-2 순서로 바꾼다. 판정 정규식(`/^(팀 이탈|계약 완료|방출|이탈 보도)/`)은 원문 기준 그대로 둔다.
- **`person.js` 이번 이동 제목의 대체 글(`val(it.status)`)**: 같은 방식으로 바꾼다.
- **`routeHTML` 어순**: 영문은 "from A → B"처럼 자연스럽게 읽혀야 한다. 화면낭독기용 `.sr` 글도 영문에서 "from A to B"가 되게, 문구를 `{from}`·`{to}` 매개변수 하나로 만든다. 한국어 출력은 지금과 같아야 한다.
- **`recent.js` 날짜 머리**: 영문 분기가 `dateWord`를 쓰는지 확인한다(예: "Mon, Oct 25").
- `TABS`의 hint 중 "국적이 South Korea인 선수…" 같은 문장이 영문 사전에 있는지 확인한다.

## 2. `/en/` 주소와 화면 (4단계)

### 2-1. 경로 기준 나누기 (`js/state.js`)

- 파일 기준 `BASE`(`/VCT-board/`)는 그대로 둔다. css, js, data를 읽는 데 쓴다.
- 새로 `ROUTE_BASE = BASE + (LANG === "en" ? "en/" : "")`를 둔다.
  - `personUrl`, `teamUrl`, `listUrl`, `parseRoute` 호출이 이것을 쓴다.
  - 영문 화면의 모든 사이트 안 링크는 `/VCT-board/en/`으로 시작하고, 한국어 화면은 지금과 같다.
- 시험에 `parseRoute`의 en 기준을 추가한다.
  - `/VCT-board/en/p/oxy/` → person
  - `/VCT-board/en/#coaches` → list
  - `/VCT-board/en/p/BAD/` → notfound
- 데이터 `fetch("data/...")`는 상세 주소에서 `<base href>`가 있어 동작한다. `/en/` 목록 페이지에도 `<base href="/VCT-board/">`가 들어가는지 확인한다(2-3).
- **주의**: base가 있으면 `href="#…"` 같은 해시 링크가 사이트 루트로 풀린다. 영문 페이지 안에 상대·해시 링크가 남아 있지 않은지 grep과 시험으로 확인한다. 예: 바로가기, 탭, 건너뛰기 링크.

### 2-2. EN/KR 전환 (`index.html`, `js/main.js`, `css/style.css`)

- 머리말 오른쪽, 후원 메뉴 앞에 둔다.
  ```html
  <nav class="lang-switch" aria-label="Language / 언어">
    <a href="./" hreflang="ko" lang="ko" data-lang="ko">KR</a>
    <a href="en/" hreflang="en" lang="en" data-lang="en">EN</a>
  </nav>
  ```
  - 현재 언어 링크에 `aria-current="true"`를 붙이고 시각적으로 구분한다. 색만으로 구분하지 않는다(굵기·밑줄 등).
  - 높이는 `--tap`, 모서리는 `--r-pill`, 간격은 `--sp-*`다. 8회차 머리말 배치(넓은 화면 2칸, 모바일 한 칸)를 깨지 않는다. 375px에서 가로 넘침이 없어야 한다.
- **링크 주소**: JS가 화면을 그릴 때마다 두 링크의 `href`를 지금 화면의 같은 위치로 고친다.
  - 목록 `#coaches` ↔ `en/#coaches`
  - `p/oxy/` ↔ `en/p/oxy/`
  - `t/cloud9/` ↔ `en/t/cloud9/`
  - 없는 주소는 각 언어의 목록으로 보낸다.
  - JS가 없을 때도 기본 `href`로 목록에 갈 수 있다.
- **이동 방식**: 페이지를 실제로 불러온다.
  - `main.js`의 링크 가로채기(`document.addEventListener("click", …)`, 약 110행)가 `[data-lang]` 링크는 건너뛰게 한다(`preventDefault` 금지).
  - 이유: GoatCounter는 페이지 로드마다 세고, `lang`, og, 정적 문구가 언어별로 맞아야 한다.
- **기억**: 클릭 때 `localStorage("vct-lang")`에 고른 언어를 저장한다. 저장 실패는 무시한다(try/catch).
- **저장된 선택이 있을 때만 이동**:
  - `<head>` 맨 앞에 작은 인라인 스크립트를 둔다. 저장값이 있고 지금 페이지 언어와 다르면 `location.replace`로 같은 위치의 다른 언어 주소로 보낸다.
  - 저장값이 없으면(첫 방문, 검색 로봇) 아무것도 하지 않는다. 브라우저 언어로 자동 이동하지 않는다.
  - 이 스크립트는 GoatCounter와 `main.js`보다 먼저 실행돼야 한다.
  - 주소에 `?stay`가 있으면 이동하지 않는다. 공유 링크 미리보기 확인과 시험에 쓴다.

### 2-3. 정적 문구와 영문 정적 페이지 (`scripts/build.mjs` 외)

- **`index.html`의 정적 문구 표시**:
  - 요소에 `data-i18n="키"`(글자), `data-i18n-attr="placeholder:키;aria-label:키"`(속성)를 붙인다.
  - 대상: 탭 nav, 요약·지역·정렬 aria-label, 검색 placeholder, `.notes` 목록, 푸터 문단, 후원 라벨, 전환 버튼 aria-label
  - `<p class="lede">`에는 속성을 붙이지 않는다(0장).
  - 키는 ko.js·en.js에 둔다. ko 값은 지금 `index.html` 글자와 같아야 하고, 시험으로 확인한다.
- **변환 함수 하나**: `scripts/i18n-html.mjs`에 `toLang(html, lang)`을 둔다.
  - `<html lang>`, `title`, description, og(title, description, url, `og:locale` en_US / ko_KR, `og:locale:alternate`), canonical을 바꾼다.
  - `data-i18n` 글자와 속성을 바꾼다.
  - **lede**: `<p class="lede">…</p>` 전체를 영문 문장으로 바꾼다. 기준 시각은 원문에서 정규식으로 뽑아 끼운다. 예: "Players and coaches leaving teams or looking for a new one after the 2026 season. Updated 2026-11-02 08:50 KST."
  - 상세 페이지의 `h1→p` 바꾸기와 base 넣기는 지금처럼 한다.
  - `build.mjs`와 `dev-server.mjs`가 같은 함수를 쓴다.
- **런타임 보정**: GitHub Pages의 404 대체 진입점(`404.html`)은 한국어 틀 하나뿐이다. 그래서 `/en/…`의 없는 주소로 들어오면 정적 문구가 한국어로 남는다.
  - `main.js`가 시작할 때 `LANG === "en"`이고 `document.documentElement.lang !== "en"`이면, 같은 사전으로 `data-i18n`을 적용하고 `lang`과 lede를 바꾼다.
  - 정상 영문 페이지에서는 아무것도 하지 않는다.
- **빌드 출력**:
  - `en/index.html`
  - `en/p/<id>/index.html`, `en/t/<id>/index.html`: 제목 "OXY · VCT LFT·FA Tracker", 영문 설명
  - 한국어 쪽 출력(`index.html`, `p/`, `t/`)에도 아래 `hreflang` 세 줄을 넣는다. 원본 `index.html`이 아니라 빌드 결과에 넣는다.
    ```html
    <link rel="alternate" hreflang="ko" href="…/VCT-board/…">
    <link rel="alternate" hreflang="en" href="…/VCT-board/en/…">
    <link rel="alternate" hreflang="x-default" href="…/VCT-board/…">
    ```
  - `sitemap.xml`에 영문 주소를 추가하고, 각 주소에 `xhtml:link` 대응을 단다.
  - 기대 수: 인물·팀 페이지가 두 배, sitemap 주소도 약 두 배. 약관·개인정보는 영문이 없으니 한 번만 넣는다.
- **`dev-server.mjs`**:
  - `SERVED`에 `en/`을 추가한다.
  - `/VCT-board/en/`과 `/VCT-board/en/p|t/*`를 `toLang(…, "en")`과 base로 돌려준다(배포와 같은 모양).
- **영문 화면의 링크**: 푸터의 약관·개인정보는 한국어 페이지로 가므로 영문 라벨 끝에 "(Korean)"을 붙인다. 정정 요청 mailto 제목도 영문으로 바꾼다(주소는 그대로).

## 3. 확인

10회차에서 스크린샷 픽셀 비교가 흔들려 쓸 수 없었다. 이번에는 아래로 판정하고, 스크린샷은 사람이 보는 자료로만 남긴다.

- **화면 캡처 조건 고정**: Playwright에서 다음을 지킨다.
  - `page.clock.setFixedTime`으로 날짜를 고정한다.
  - `prefers-reduced-motion: reduce`
  - `document.fonts.ready`를 기다린다.
  - 캐럿 숨김
  - 같은 화면을 두 번 찍어 같으면 픽셀 비교를 시도하고, 다르면 생략한다고 적는다.
- **한국어 화면 불변**:
  - 목록 7탭, 인물, 팀, 없는 주소 × 375·1280 × 라이트·다크로 렌더된 DOM(`#view`와 머리말)을 기준선과 비교한다.
  - 차이는 새 전환 버튼과 `data-i18n` 속성뿐이어야 한다.
  - `_site`의 한국어 정적 HTML 차이는 `hreflang` 세 줄, 전환 버튼, `data-i18n` 속성뿐이어야 한다.
- **영문 화면의 한글**: 같은 조합을 `/en/`으로 열어, 보이는 텍스트 노드 중 한글이 든 것이 모두 `[lang="ko"]` 안에 있는지 확인한다. 밖에 있는 한글은 0이어야 한다. 실패하면 노드 위치와 글자를 보여 준다.
- **링크**:
  - 영문 페이지의 사이트 안 `<a href>`는 모두 `/VCT-board/en/`으로 시작해야 한다. 예외는 css·js·data, 약관·개인정보, 외부 링크다.
  - 한국어 페이지에는 `/en/` 링크가 전환 버튼 말고 없어야 한다.
- **전환**:
  - 목록 `#coaches`, 인물 `p/oxy/`, 팀 `t/cloud9/`, 없는 주소에서 EN과 KR을 각각 눌러 같은 위치로 실제 페이지 이동이 일어나는지 본다(`page.waitForNavigation`).
  - 저장값이 생긴 뒤 다른 언어 주소로 직접 들어가면 저장된 언어로 옮겨지는지 본다.
  - `?stay`로는 옮겨지지 않는지 본다.
  - 저장값이 없을 때는 옮겨지지 않는지 본다.
- **정적 페이지**: `_site/en/p/<임의 5명>/index.html`에서 확인한다.
  - `<html lang="en">`, 영문 title·og·canonical
  - `hreflang` 세 줄이 서로를 가리킨다.
  - 한국어 쪽 대응 페이지도 같은 세 줄을 갖는다.
- **404 대체**: dev-server와 `_site`의 `404.html`로 `/en/p/없는id/`를 열었을 때 영문 머리말과 "not found" 문구가 나와야 한다.
- **용어집 커버리지 수치**와 번역되지 않은 상태 목록
- **예약 작업 약속**: `index.html`에서 `<p class="lede">`가 정확히 한 번 나오고, 그 안의 "YYYY-MM-DD HH:mm 기준입니다." 형식과 `<script type="module" src="js/main.js">`가 그대로인지 시험으로 고정한다.
- **시험·검증·빌드**: 시험 3종이 통과한다. 빌드 수(인물·팀 페이지, sitemap)를 보고한다. 콘솔 오류는 0이다.

## 4. 보고와 마무리

1. 3장 결과를 항목별로 적는다(통과·실패, 수치).
2. 다음을 첨부한다.
   - 용어집 표 전체와 커버리지
   - 번역되지 않은 문구 목록(12회차 5단계 입력)
   - 대표 스크린샷: 영문 목록 375·1280 다크, 영문 인물 상세, KR 표시가 있는 행, 전환 버튼 확대
3. `docs/PROGRESS.md`에 이번 회차를 기록한다.
4. `docs/디자인/design-brief.md`에 다음 규칙을 추가한다.
   - 전환 버튼의 위치와 모양
   - KR 표시 규칙
   - "영문 화면의 한글은 `lang="ko"` 안에만"
5. PR 제목은 "영문판 2: 상태 용어집, /en/ 주소와 EN/KR 전환"으로 연다. 병합하지 않는다.
6. 병합 뒤 배포되면 사용자가 할 일을 보고 끝에 적는다.
   - GoatCounter 대시보드에서 `/en/` 경로 필터로 영문 방문을 확인하는 방법(새 등록 없음)
   - Search Console을 쓴다면 sitemap 다시 제출

## 하지 않는 것

- 비고·상황·일정 제목의 자유 번역, 데이터와 예약 작업 변경(12회차)
- 약관·개인정보 영문, 건의 폼 안내 문단(12회차)
- 브라우저 언어 감지로 자동 이동
- 화면 안에서만 언어를 바꾸는 방식
- og 이미지 영문판
