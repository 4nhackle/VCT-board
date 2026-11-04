# VCT-board 18회차 지시문 — 영문 링크 미리보기 이미지 (og-en.png)

## 배경

- `/en/` 페이지의 og 태그는 영문인데 `og:image`는 한국어 `og.png`를 그대로 가리킨다. 영문 링크를 공유하면 한국어 이미지가 뜬다.
- 현재 `og.png`: 1200×630, 밝은 배경(#F6F8F5 계열), 진한 초록 글자. 제목 2줄, 구분선, 한 줄 설명, 상태 알약 3개(구직 중 / 새 팀 합류 / 팀 떠남).

## 0. 지킬 것

- `main` 최신에서 브랜치 `feature/og-en`을 만든다.
- 바꾸는 곳은 `og-en.png`(새 파일), `scripts/i18n-html.mjs`, `scripts/build.mjs`, `scripts/test.mjs`뿐이다. `og.png`, `data/`, 한국어 페이지, `<p class="lede">`는 건드리지 않는다.
- 외부 패키지를 저장소에 추가하지 않는다. 이미지는 Playwright(수동)나 기존 도구로 한 번 만들어 PNG만 커밋한다.
- test·validate(오류 0)·build가 통과해야 한다. 병합은 예약 작업 실행 시각(08:50·09:35, 11/16까지 14:50·15:35·20:50·21:35 KST) 앞뒤 30분을 피한다.

## 1. 이미지 만들기

- 파일: `og-en.png`(저장소 루트, `og.png` 옆), 1200×630, 용량 100KB 이하
- `og.png`와 같은 배치·색·글꼴 느낌으로 영문판을 만든다. 그림 안의 글자는 en 사전 문구를 그대로 쓴다.

| 자리 | 영문 |
|---|---|
| 제목(2줄) | `VALORANT VCT` / `Player Moves` |
| 설명 | `Players and coaches looking for a new team, and confirmed moves, by region.` |
| 알약 | `Looking for team` / `Joined new team` / `Left team` |

- 제목은 지금 영문 페이지 제목("VALORANT VCT Player Moves")과 같아야 한다. 다르면 사전 값을 따른다.
- 글꼴은 `og.png`와 비슷한 굵은 고딕 계열로 하고, 만든 방법(도구, 글꼴 이름)을 PR 설명에 적는다. 글꼴은 저장소에 넣지 않는다.
- 설명 글이 한 줄에 안 들어가면 두 줄로 줄이지 말고 문장을 짧게 줄인다. 글자가 가장자리에서 80px 이상 떨어져 있어야 한다(공유 카드 잘림 방지).
- 알약 색은 `og.png`의 세 색(주황·초록·회색 계열)을 그대로 쓴다.
- 이미지를 만들어 직접 눈으로 확인하고, 라이트·다크 앱에서 배경이 흰색에 묻히지 않는지(밝은 배경이라 가장자리가 보이는지) 본다.

## 2. 배선

- `scripts/build.mjs`: `og-en.png`를 `og.png`처럼 출력 폴더 루트로 복사한다.
- `scripts/i18n-html.mjs`의 `toLang(html, "en")`:
  - `og:image` 주소를 `…/VCT-board/og-en.png`로 바꾼다.
  - 이미지 설명 태그(`og:image:alt`)가 있으면 영문으로 바꾸고, 없으면 새로 만들지 않는다.
  - `og:image:width`·`og:image:height`는 1200·630 그대로다.
- 영문 상세 페이지(`en/p/<id>/`, `en/t/<id>/`)도 같은 이미지를 쓴다. 한국어 쪽은 그대로 `og.png`다.
- `twitter:image` 태그가 따로 있으면 함께 바꾼다.

## 3. 시험

- `en/index.html`과 `en/p/<임의 1명>/index.html`의 `og:image`가 `og-en.png`, 한국어 `index.html`·`p/…`는 `og.png`이다.
- 빌드 출력 루트에 `og-en.png`가 있고 크기가 1200×630 PNG이다(헤더 바이트로 확인).
- `og-en.png`가 100KB 이하다.

## 마무리

- `og-en.png` 미리보기 이미지를 PR에 첨부한다.
- `docs/PROGRESS.md`에 이번 회차를 기록한다. `docs/디자인/design-brief.md`에는 "공유 이미지는 언어별(og.png, og-en.png), 글자는 사전 문구와 같게"를 한 줄 추가한다.
- PR 제목은 "영문 링크 미리보기 이미지(og-en.png)"로 연다. 병합하지 않는다.
- 끝나면 `/ponytail-audit`을 실행한다. 새 지적은 목록으로만 붙인다.
- **병합·배포 뒤 사용자가 할 일**: 카카오톡·X·Slack 등은 이미지를 캐시한다. 새 이미지가 안 보이면 각 서비스의 링크 미리보기 새로고침 도구(예: X Card Validator, 카카오 공유 디버거)로 `https://4nhackle.github.io/VCT-board/en/`를 한 번 다시 읽히면 된다.
