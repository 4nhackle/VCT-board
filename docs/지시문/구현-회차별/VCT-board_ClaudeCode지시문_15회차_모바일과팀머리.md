# VCT-board 15회차 지시문 — 팀 머리 키우기, 후원 문구, 모바일 전환 버튼·정렬 줄바꿈

## 요청과 현재 상태 (main `c889494`, 2026-11-02 17:00 확인)

| # | 요청 | 지금 코드 | 재현 |
|---|---|---|---|
| 1 | 팀 이름(Cloud9, ENVY)이 선수 이름보다 작아 구역이 안 나뉜다 | `.th`: `--fs-2`(14px), `--mute` 색. 선수 이름 `.name`: `--fs-4`(17px)/700. 지역 머리 `.rh h2`: `--fs-4`(17px)/800 | 팀 머리가 선수 이름보다 3px 작고 흐린 색이다 |
| 2 | "카페인이 필요해요"가 낯설다. 후원임이 바로 보이게 | `support.label` = ko "카페인이 필요해요", en "Caffeine fund". `index.html` 31행에도 같은 글 | — |
| 3 | 한/영 전환 버튼이 모바일에서 가로로 늘어나 깨져 보인다 | `.lang-switch`는 `inline-flex`지만 600px 이하에서 `.top-side`가 `flex-wrap` 행이 되고, 버튼이 그 안의 flex 항목이 된다(계산된 display는 `flex`). `margin-left: auto`도 붙어 있다 | Chromium 375px에서는 폭 88px로 정상이다. 사용자 기기(모바일 Safari로 추정)에서 늘어난다 → WebKit에서 재현해야 한다 |
| 4 | "팀별로 / 최근 소식순" 정렬 버튼이 모바일에서 한 줄에 안 들어간다. 줄바꿈되게 | 600px 이하에서 `.bar.b2`(지역 칩 + 정렬 칩)가 `nowrap` + 가로 스크롤이다 | 375px에서 정렬 칩이 x=506에 있어 화면 밖이다. 줄 폭 756px. 옆으로 밀어야만 보인다 |

## 0. 지킬 것

- `main` 최신에서 브랜치 `fix/mobile-polish-15`를 만든다. 항목마다 커밋을 하나씩 만들고, 커밋 메시지 앞에 `U-1:` 같은 번호를 붙인다.
- 다음은 건드리지 않는다.
  - `data/`
  - `index.html`의 `<p class="lede">`와 기준 시각 형식
  - `<script type="module" src="js/main.js">`
  - 번역 키·검사 규칙
  - 판정 정규식
- 토큰만 쓴다(`--fs-*`, `--sp-*`, `--r-*`, `--tap`, 색 변수). 새 크기가 꼭 필요하면 `:root`에 토큰 하나를 만들고 design-brief에 적는다.
- 같은 선택자를 css 끝에 덧붙이지 않는다. 기존 규칙을 고치고, 모바일은 기존 `@media (max-width: 600px)` 안에서 고친다.
- 한국어·영문 화면을 같이 확인한다.
- 단계마다 아래 세 명령이 통과해야 한다.
  - `node scripts/test.mjs`
  - `node scripts/validate.mjs`(오류 0)
  - `node scripts/build.mjs _site`
- **브라우저 확인은 Chromium과 WebKit 둘 다** 한다. Playwright `webkit`을 쓰고, 모바일은 `devices['iPhone 13']`, `devices['iPhone SE']`, `devices['Pixel 7']`로 띄운다. WebKit을 실행할 수 없으면 그 사실을 보고하고 Chromium 결과만 적는다.
- 병합은 예약 작업 실행 시각 앞뒤 30분을 피한다. 실행 시각은 08:50·09:35, 11/16까지 14:50·15:35·20:50·21:35 KST다. 이 내용을 PR 설명에 적는다.

## U-1. 팀 머리 키우기 (구역 구분)

- **목표 위계**: 지역 머리 > 팀 머리 > 선수 이름이 크기와 굵기로 바로 구분돼야 한다.

| 요소 | 지금 | 바꿀 값 |
|---|---|---|
| 지역 머리 `.rh h2` | 17px / 800 | `--fs-5`(22px) / 800. 모바일 20px |
| 팀 머리 `.th` | 14px / 700 / `--mute` | 새 토큰 `--fs-team: 19px`(모바일 18px) / 800 / `--ink` |
| 팀 인원 `.th .n` | 13px | 그대로(`--fs-1`, `--mute`, 400) |
| 선수 이름 `.name` | 17px / 700 | 그대로 |

- **구분선**: 팀 머리 위에 `border-top: 1px solid var(--line-strong)`을 두고, 위 여백은 `var(--sp-5)`, 아래 여백은 `var(--sp-2)`로 한다.
  - 구역의 첫 팀(지역 머리 바로 다음)에는 선을 두지 않는다. 기존 `.th + .list > .row:first-child` 규칙과 함께 확인한다.
- **팀 링크**(`.th a`)는 `--ink`를 유지하고, 밑줄은 hover와 focus에서만 보인다.
- **모바일**: 팀 이름이 길면 줄을 바꾼다(`overflow-wrap: anywhere`). 인원 수는 같은 줄 끝에 baseline으로 맞춘다.
- **같은 머리를 쓰는 다른 화면도 맞춘다**: 최근 소식순의 날짜 머리, 지켜볼 팀 카드의 팀 이름, 팀 상세의 섹션 제목. 같은 클래스를 쓰는지 확인하고, 다른 클래스면 위계가 어긋나지 않는지만 본다.
- **sticky 지역 머리 높이가 바뀐다**:
  - 바로가기 이동 위치(`scroll-margin-top`)
  - `--tabs-h`와 겹치지 않는지
  - 뒤로가기 스크롤 복원
  - 위 셋이 여전히 맞는지 측정한다(9회차·12회차 방식). 375·1280에서 바로가기로 각 지역에 이동했을 때 지역 머리가 탭 바로 아래에 온전히 보여야 한다.

## U-2. 후원 문구

- `js/i18n/ko.js` `support.label`: "개발자 커피 사주기"
- `js/i18n/en.js` `support.label`: "Buy the developer a coffee"
- `index.html` 31행 `span.support-label`의 글자도 ko 값과 똑같이 바꾼다. 11회차 시험이 index 정적 글자와 ko 사전이 같은지 본다.
- 링크 `aria-label`("Ko-fi로 후원" 등)은 그대로 둔다.
- 모바일에서 라벨과 링크 칩이 한 줄에 안 들어가면 라벨이 칩 위 줄로 가도 된다. 다만 라벨이 칩 사이에 끼지 않게 한다(라벨 `flex: 0 0 100%` 또는 칩 묶음 래핑). 375·360px, 한국어·영문에서 확인한다.
  - 영문은 카카오페이가 없어 짧다.
- `docs/PROGRESS.md`의 예전 기록("카페인이 필요해요")은 고치지 않는다. 이번 회차 기록에 바뀐 문구를 적는다.

## U-3. 한/영 전환 버튼이 늘어나는 문제

- **먼저 재현한다.** WebKit `iPhone 13`·`iPhone SE`, 한국어·영문, 세로 방향에서 `.lang-switch`의 폭·높이와 두 링크의 폭을 잰다.
  - 정상: 폭이 내용(KR·EN 두 칸) 크기 정도다. Chromium 기준 약 88px.
  - 재현되면 스크린샷을 남긴다.
- **수정**(재현 여부와 상관없이 넣는다):
  - `.lang-switch`: `display: inline-flex; flex: 0 0 auto; width: auto; max-width: max-content; align-self: center;`
  - `.lang-switch a`: `flex: 0 0 auto;`
  - 모바일 `.top-side .lang-switch`: `order: 2; margin-left: auto;`는 유지한다. 폭은 위 값이 지키게 한다.
  - `.top-side`의 `justify-content: space-between`이 버튼을 늘리지 않는지 확인한다. 필요하면 `.top-side`를 `justify-content: flex-start`로 바꾸고 버튼만 `margin-left: auto`로 보낸다.
- **확인**: WebKit·Chromium × 360·375·414 × 한국어·영문에서 아래 셋을 본다.
  - 버튼 폭이 120px 이하다.
  - 두 링크 높이가 `--tap`(44px)이다.
  - 가로 넘침(`scrollWidth > clientWidth`)이 없다.
  - 12회차 머리말 측정(링크 겹침 없음, 왼쪽 끝 정렬)도 다시 통과해야 한다.

## U-4. 정렬 버튼 줄바꿈 (모바일)

- **지금**: 600px 이하에서 `.tabs, .chips, .bar.b2`가 한 줄 가로 스크롤이다(약 335행). `.bar.b2` 안에서 지역 칩 다음에 정렬 칩이 붙어, 정렬 칩이 화면 밖에 있다.
- **바꿀 모양**(600px 이하):
  - `.bar.b2`는 줄바꿈 컨테이너로 바꾼다(`flex-wrap: wrap; overflow: visible; mask 없음; margin·padding 0`).
  - 지역 칩(`#regions`)은 첫 줄에서 지금처럼 한 줄 가로 스크롤을 유지한다. 폭은 100%, 화면 끝까지 bleed, 오른쪽 흐림은 그대로다.
  - 정렬 칩(`#order`)은 다음 줄에 놓이고, 칩이 많아 넘치면 줄을 바꾼다(`flex-wrap: wrap; overflow: visible; mask 없음`). 왼쪽 끝은 본문 왼쪽 선과 같게 한다.
  - "최근 소식순" 칩 안의 "새 N" 배지가 잘리지 않게 한다.
- 탭 줄(`.tabs`)과 상태 요약 칩(`#summary`)의 가로 스크롤은 그대로 둔다.
- 601px 이상은 바꾸지 않는다(정렬 칩은 오른쪽 끝).
- 정렬 칩을 누른 뒤 목록과 칩 상태(aria-pressed)가 그대로 동작하는지, 줄바꿈 때문에 sticky·필터 영역 높이가 바뀌어 바로가기 위치가 어긋나지 않는지 확인한다.
- **확인**: 360·375·414 × 한국어·영문 × Chromium·WebKit에서 아래를 본다.
  - 정렬 칩 두 개의 사각형이 모두 viewport 안에 있다.
  - `.bar.b2`의 `scrollWidth`가 `clientWidth`를 넘지 않는다. 단, 지역 칩 줄 자체의 가로 스크롤은 허용한다.
  - 가로 넘침이 없다.

## 확인과 마무리

1. 다음 조합으로 전후 스크린샷을 남긴다.
   - 폭: 360·375·414·768·1280
   - 모드: 라이트·다크
   - 언어: 한국어·영문
   - 브라우저: Chromium, WebKit(모바일)
   - 사람이 보는 자료로 남긴다. 판정은 위 측정값으로 한다.
2. 한국어·영문 화면 DOM을 기준선(main)과 비교한다. 차이는 다음뿐이어야 한다.
   - U-2 문구
   - U-1·U-3·U-4는 CSS만 바뀌므로 DOM 차이 없음. 마크업을 바꿨다면 그 이유를 적는다.
3. `docs/디자인/design-brief.md`를 고친다.
   - 위계(지역 22 > 팀 19 > 이름 17)
   - `--fs-team` 토큰
   - 후원 문구
   - 모바일 정렬 칩 줄바꿈 규칙
4. `docs/PROGRESS.md`에 이번 회차를 기록한다.
5. PR 제목은 "팀 머리 키우기, 후원 문구 변경, 모바일 전환 버튼·정렬 칩 줄바꿈"으로 연다. 병합하지 않는다.
6. 수정이 끝나면 `/ponytail-audit`을 실행한다. 새 지적은 목록으로만 붙인다.

## 하지 않는 것

- 색 체계·글꼴 변경, 새 기능
- 601px 이상의 머리말·필터 배치 변경(U-1 글자 크기 제외)
- data/와 예약 작업 변경
