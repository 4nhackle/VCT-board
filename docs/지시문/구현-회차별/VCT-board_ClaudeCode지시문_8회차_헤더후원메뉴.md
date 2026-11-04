# VCT-board 8회차 지시문 — 머리말 간격 정리와 후원 메뉴 문구 변경

## 목적

1. 머리말(`header.top`)의 간격을 바로잡는다. 사이트 제목, 기준 시각 문장, 후원 메뉴 사이의 간격이 들쭉날쭉하다.
2. 후원 링크가 어떤 화면 폭과 확대에서도 가려지지 않고 모두 보이게 한다.
3. 문구를 바꾼다.
   - Ko-fi 링크 옆의 "I need Caffeine"(`span.support-note`)을 지운다. 링크 글자는 "Ko-fi"만 남는다.
   - 메뉴 앞 라벨 "후원"(`span.support-label`)을 "카페인이 필요해요"로 바꾼다.

## 현재 상태 (main `eea1088` 기준, 로컬에서 재현함)

- `index.html` 20~27행: `<header class="top">` 안에 다음 세 요소가 형제로 있다.
  - `h1#site.site`
  - `p.lede`
  - `nav.support-menu`(`span.support-label` + 링크 2개)
- `css/style.css` 80행: `.top { display:flex; flex-wrap:wrap; align-items:baseline; gap:0 var(--sp-3); }`
  - 세로 간격(row-gap)이 0이다.
- `css/style.css` 86~90행: `.support-menu`가 `margin-left:auto`로 오른쪽에 붙는다.
- 1280px 이상에서 측정한 결과:
  - 제목과 문장이 한 줄에 놓인다.
  - 후원 메뉴는 다음 줄 오른쪽 끝으로 밀린다. 문장 아래 끝(y=52)과 메뉴 위 끝(y=52) 사이 간격이 0이다.
  - 그 결과 메뉴가 문장 밑에 혼자 매달린 모양이 된다.
- 375px에서 측정한 결과:
  - 메뉴가 `margin-left:auto` 때문에 왼쪽 정렬이 아니라 오른쪽으로 밀린다(x=34, 본문 왼쪽 끝은 x=16).
  - 문장과 붙어 있다(간격 0).
- 사용자 스크린샷의 상태:
  - "후원" 알약만 보이고 링크가 가려져 있다. 이는 PR #9의 이전 구현(`<details class="support-menu">` 펼침 상자)과 같은 모양이다.
  - 배포가 최신이 아니거나 브라우저 캐시일 수 있다.
  - 작업 전에 GitHub Actions에서 `eea1088`의 pages 배포가 success인지 확인하고 결과를 보고한다. 실패했거나 실행이 없으면 고치기 전에 원인부터 보고한다.

## 0. 지킬 것

- `main` 최신에서 브랜치 `fix/header-support-8`을 만든다.
- 다음은 건드리지 않는다.
  - `data/`
  - `index.html`의 머리말 시각 텍스트("2026-… 기준입니다." 부분은 예약 작업이 매일 바꾼다)
  - `og.png`, `.github/`
- `scripts/build.mjs` 76행은 `<h1 class="site" id="site">…</h1>`를 정규식으로 찾아 상세 페이지에서 `<p>`로 바꾼다.
  - 이 h1 태그의 속성 순서와 모양을 바꾸지 않는다.
  - 감싸는 요소를 추가하는 것은 괜찮다.
- `js/main.js`는 `.lede`를 클래스로 찾고(181, 222행), `#site`를 `replaceWith`로 바꾼다. 이 동작이 그대로 되어야 한다.
- 푸터의 후원 문단(`p.support`), `terms/`, `privacy/`의 "후원" 문구는 바꾸지 않는다.
- 단계마다 아래 세 명령이 통과해야 한다.
  - `node scripts/test.mjs`
  - `node scripts/validate.mjs`
  - `node scripts/build.mjs _site`

## 1. 문구 변경 (`index.html`)

```html
<nav class="support-menu" aria-labelledby="support-label">
  <span class="support-label" id="support-label">카페인이 필요해요</span>
  <a href="https://ko-fi.com/4nhackle" rel="noopener noreferrer">Ko-fi</a>
  <a href="https://qr.kakaopay.com/FXLsPVOnG" rel="noopener noreferrer">카카오페이 송금</a>
</nav>
```

- `span.support-note`를 지우고, `css/style.css`의 `.support-note` 규칙도 지운다.
- 접근성 이름은 보이는 라벨과 같게 `aria-labelledby`로 연결한다.
  - 원래 이름이 "후원"이라 화면낭독기에서 무엇인지 알기 쉬웠다.
  - 사용자 결정으로 보이는 글을 바꾼다. 다만 링크 목적이 드러나게 각 링크에 `aria-label`을 붙인다: "Ko-fi로 후원", "카카오페이로 송금해 후원".
- 저장소 전체에서 `I need Caffeine`, `support-note`가 남아 있지 않은지 grep으로 확인한다. 정적 빌드 결과(`_site/p/*`, `_site/t/*`, `404.html`)도 확인한다.

## 2. 머리말 배치 (`index.html`, `css/style.css`)

목표 모양:

- **601px 이상**: 왼쪽 칸에 제목과 문장이 위아래로 쌓이고, 오른쪽 칸에 후원 메뉴가 세로 가운데로 붙는다.
  - 제목과 문장 사이 간격은 `var(--sp-1)`이다.
  - 왼쪽 칸과 오른쪽 칸 사이는 `var(--sp-4)`다.
  - 문장이 길어 줄이 바뀌어도 메뉴는 자기 칸을 지킨다. 겹치거나 아래로 밀리지 않는다.
- **600px 이하**: 한 칸으로 제목, 문장, 후원 메뉴 순서로 쌓인다.
  - 각 사이 간격은 `var(--sp-2)`다.
  - 메뉴는 본문과 같은 왼쪽 선에 맞춘다.
  - 라벨과 링크 칩이 한 줄에 다 들어가지 않으면 줄을 바꾼다. 줄 간격도 `var(--sp-2)`다.
  - 가로 스크롤이나 잘림이 생기면 안 된다.
- **상세 화면**(`.lede`가 hidden, 제목이 작은 `p.site`): 왼쪽 칸이 한 줄짜리가 된다. 메뉴는 그 줄과 세로 가운데로 맞는다.

구현 방법(권장):

- 제목과 문장을 `<div class="top-text">`로 감싼다.
- `.top`을 grid로 바꾼다.
  - `grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: var(--sp-2) var(--sp-4);`
  - `.top-text`는 `display:flex; flex-direction:column; gap:var(--sp-1);`
- `.support-menu`의 `margin-left:auto`와 `align-self`를 지운다. 칸 배치는 grid가 맡는다.
  - 메뉴 안은 `display:flex; flex-wrap:wrap; align-items:center; gap:var(--sp-2);`
  - 데스크톱에서는 라벨과 칩이 한 줄에 있게 `flex-wrap:nowrap`, 모바일에서만 `wrap`으로 한다.
- 모바일 미디어쿼리(600px 이하): `.top { grid-template-columns: minmax(0,1fr); }`
- 새 숫자를 쓰지 않는다. 간격은 `--sp-*`, 높이는 `--tap`, 모서리는 `--r-pill` 토큰만 쓴다.
  - 기존 `.support-menu a` 칩 모양(테두리 `--line`, 면 `--surface`)은 유지한다.
  - 라벨은 `--mute` 색, 굵기 700을 유지한다.
- `.top` 뒤에 오는 sticky `.tabs`와의 간격이 다른 구역 간격(`.page`의 gap)과 같은지 확인한다. 머리말만 붙거나 벌어지지 않아야 한다.

## 3. 확인

Playwright(Chromium)로 `scripts/dev-server.mjs` 사이트를 연다. 조합마다 고치기 전과 후 스크린샷을 `/tmp/hdr/before|after/<폭>-<모드>-<확대>.png`로 남긴다.

- **폭**: 375, 600, 601, 768, 1040, 1280, 1920
- **모드**: 라이트, 다크
- **확대**: 100%, 150%, 200%. 150%·200%는 `deviceScaleFactor`가 아니라 viewport를 그만큼 줄여 CSS 픽셀 기준으로 본다.
- **화면**: 목록, 인물 상세(`p/<id>/`), 팀 상세, 없는 주소

측정으로 통과를 판정한다(`getBoundingClientRect`):

- 후원 라벨과 링크 2개가 모두 viewport 안에 있다. 다른 요소와 사각형이 겹치지 않고 `overflow`로 잘리지 않는다. `elementFromPoint`로 각 링크 가운데를 찍었을 때 그 링크가 나와야 한다.
- 601px 이상:
  - 메뉴의 세로 가운데와 `.top-text`의 세로 가운데 차이가 2px 이하다.
  - 메뉴가 문장 아래 줄로 내려가지 않는다.
- 600px 이하:
  - 제목→문장, 문장→메뉴 간격이 `--sp-2` 값(8px) ±1px이다.
  - 메뉴 왼쪽 끝이 제목 왼쪽 끝과 같다.
- 문서 가로 스크롤 폭이 viewport 폭을 넘지 않는다.
- 링크 높이가 `--tap`(데스크톱 36px, 모바일 44px) 이상이다.
- Tab 순서: 제목 다음에 Ko-fi, 카카오페이 송금, 탭 순서로 간다. 초점 테두리가 잘리지 않는다.
- 상세 화면에서 `p.site`로 바뀐 뒤에도 배치가 깨지지 않는다. 목록으로 돌아왔을 때도 같다.
- 시험 3종이 통과해야 한다. `_site`의 상세 페이지 수와 sitemap 항목 수가 작업 전과 같아야 한다. 콘솔 오류는 0이다.

## 4. 보고와 마무리

1. 배포 상태 확인 결과를 적는다: 사용자 스크린샷이 이전 버전으로 보이는 이유.
2. 바꾼 파일과 줄을 적는다.
3. 측정 결과를 표로 만든다. 열은 폭, 모드, 확대, 통과 여부, 실패 항목이다.
4. 핵심 전후 비교 스크린샷을 붙인다: 375, 1280 다크, 1920 다크, 200% 확대.
5. `docs/디자인/design-brief.md`의 머리말 규칙에 한 줄을 추가한다: "왼쪽 제목·문장 / 오른쪽 후원 메뉴, 모바일은 한 칸".
6. `docs/PROGRESS.md`에 이번 회차를 기록한다.
7. PR 제목은 "머리말 간격 정리, 후원 메뉴 문구 변경('카페인이 필요해요')"으로 연다. 병합하지 않는다.

## 하지 않는 것

- 후원 링크 주소, 링크 개수, 푸터와 정책 페이지 문구 변경
- 머리말 외 영역의 디자인 변경
- 펼침 상자(`details`)로 되돌리는 것. 링크는 항상 보이게 둔다.
