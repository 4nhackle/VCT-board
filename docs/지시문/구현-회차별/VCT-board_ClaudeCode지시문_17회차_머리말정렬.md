# VCT-board 17회차 지시문 — 머리말 오른쪽 칸: EN/KR 오른쪽 정렬, 후원 메뉴 간격

## 문제 (main `7ef3a0b`, 1920px 다크 스크린샷으로 확인)

- 머리말 오른쪽 칸에서 EN/KR 전환 버튼이 오른쪽 끝에 붙지 않고 칸 가운데로 들어가 있다. 아래 후원 메뉴의 오른쪽 끝(카카오페이 송금)과 줄이 맞지 않는다.
- 전환 버튼과 후원 메뉴 사이가 붙어 보인다.

**원인**: 15회차에서 `.lang-switch`에 `align-self: center`를 넣었다. 원래 의도는 모바일 한 줄 배치에서 세로 가운데 정렬이었다.
- 601px 이상에서 `.top-side`는 `flex-direction: column; align-items: flex-end`(세로 쌓기, 오른쪽 정렬)다.
- 이 배치에서 `align-self: center`는 **가로** 가운데 정렬이 된다. 그래서 버튼 하나만 가운데로 갔다.

## 0. 지킬 것

- `main` 최신에서 브랜치 `fix/header-align-17`을 만든다.
- 바꾸는 곳은 `css/style.css`의 머리말 규칙(`.top-side`, `.lang-switch`, `.support-menu`)뿐이다.
  - 마크업, data/, `<p class="lede">`, 번역, 판정 규칙은 건드리지 않는다.
- 16회차 규칙을 따른다.
  - 의미 토큰만 쓴다(`--space-*`). 날것의 px 값을 쓰지 않는다.
  - 같은 선택자를 새로 덧붙이지 않고 기존 규칙을 고친다.
  - 모바일은 기존 `@media (max-width: 600px)` 안에서 고친다.
- 아래 세 명령과 `css-check`(중복, 날것의 값, 대비)가 통과해야 한다.
  - `node scripts/test.mjs`
  - `node scripts/validate.mjs`(오류 0)
  - `node scripts/build.mjs _site`
- 병합은 예약 작업 실행 시각 앞뒤 30분을 피한다. 실행 시각은 08:50·09:35, 11/16까지 14:50·15:35·20:50·21:35 KST다. 이 내용을 PR 설명에 적는다.

## H-1. EN/KR를 오른쪽 끝에 맞춘다

- 기본 규칙 `.lang-switch`에서 `align-self: center`를 지운다.
  - `display: inline-flex; flex: 0 0 auto; width: auto; max-width: max-content`는 15회차 모바일 늘어남 방지용이라 유지한다.
- 601px 이상에서는 `.top-side`의 `align-items: flex-end`를 따라 오른쪽 끝에 붙는다. 필요하면 `align-self: flex-end`를 명시한다.
- 600px 이하 미디어 블록의 `.top-side .lang-switch`에는 `align-self: center`를 둔다. 행 배치에서 세로 가운데 정렬이 필요하기 때문이다. `order: 2; margin-left: auto`는 유지한다.

## H-2. 후원 메뉴를 조금 아래로

- 601px 이상에서 `.top-side`의 세로 간격을 `--space-s`에서 한 단계 큰 `--space-m`으로 바꾼다.
  - 칸 전체의 세로 가운데 정렬(`.top`의 `align-items: center`)은 그대로 둔다. 그래서 전환 버튼과 후원 메뉴가 같이 조금씩 위아래로 벌어진다.
  - 결과적으로 후원 메뉴가 지금보다 아래로 내려간 것처럼 보이면 된다.
  - 이 값으로 부족하거나 너무 벌어지면 `--space-m`과 `--space-l` 중 하나로 정한다. 두 값의 스크린샷을 함께 보고한다. 그 사이 값이 필요하면 의미 토큰을 새로 만들지 말고 보고한다.
- 600px 이하는 지금 간격을 유지한다(한 줄 배치, 줄을 바꿀 때 `--space-s`).

## 확인

`scripts/style-snapshot.mjs`와 측정 스크립트로 확인한다.

- **601px 이상**(768·1280·1920, 라이트·다크, 한국어·영문):
  - EN/KR 오른쪽 끝 = 후원 메뉴 마지막 링크 오른쪽 끝 = 본문 오른쪽 끝(±1px)
  - 전환 버튼 아래 끝과 후원 메뉴 위 끝 사이 = H-2에서 정한 토큰 값
  - 영문은 후원 링크가 Ko-fi 하나다. 이때도 오른쪽 끝이 같다.
- **600px 이하**(360·375·414, Chromium·WebKit):
  - 15회차 측정을 다시 통과한다: 버튼 폭 120px 이하, 높이 `--tap`, 가로 넘침 없음
  - EN/KR 세로 가운데가 후원 메뉴 줄의 세로 가운데와 같다(±2px)
- **스냅숏 비교**: `style-snapshot` 비교에서 머리말 요소(`.top-side`, `.lang-switch`, `.support-menu`) 외 차이가 0이다.
- 견본 페이지(`dev/styleguide.html`)의 머리말 견본도 같은 모양인지 본다.
- 1920·1280 다크, 한국어·영문 전후 스크린샷을 PR에 넣는다.

## 마무리

- `docs/디자인/design-brief.md` 머리말 규칙에 "601px 이상: 오른쪽 칸 두 요소 모두 오른쪽 끝 정렬, 사이 간격 `--space-m`"을 적는다.
- `docs/PROGRESS.md`에 이번 회차와 원인(15회차 `align-self` 문제)을 기록한다.
- PR 제목은 "머리말: EN/KR 오른쪽 정렬, 후원 메뉴 간격"으로 연다. 병합하지 않는다.
- 끝나면 `/ponytail-audit`을 실행한다. 새 지적은 목록으로만 붙인다.
