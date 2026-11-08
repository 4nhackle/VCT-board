# PR 17 화면 테마 전환 제거, OS 설정만 따르기 (2026-11-09)

## 목적
지시문 `docs/instructions/PR17-theme-switch-removal.md` 대로 라이트·다크·시스템 전환 단추를 없앤다. 사이트는 항상 `prefers-color-scheme` 을 따르고, 저장된 `vct-theme` 값은 지우지 않고 무시한다.

## 기준
- 기준: `origin/main` f0277a4 (PR 16 #48 병합 뒤). 지시문의 기준 c5cd56b 는 그 전 커밋이다.
- 작업 자리: `git worktree` `C:\Users\idisi\coding\VCT-board-pr17`, 브랜치 `feat/theme-system-only`.

## 바꾼 파일
- `index.html`: `.theme-switch` 묶음 삭제(`.lang-switch` 유지), 머리 인라인 스크립트에서 테마 부분만 삭제(언어 이동 IIFE 는 그대로).
- `privacy/index.html`, `terms/index.html`, `en/privacy/index.html`, `en/terms/index.html`: 머리 인라인 스크립트가 테마뿐이라 `<script>…</script>` 전체 삭제.
- `js/main.js`: `THEME_BG`, `storedTheme`, `setTheme`, `syncTheme` 삭제, `data-theme-set` 클릭 분기 삭제, 시작 시 `syncTheme(storedTheme())` 삭제, `themeOf` import 삭제.
- `js/state.js`: `themeOf` 와 주석 삭제.
- `css/style.css`: `.theme-switch` 선택자 삭제(`.lang-switch` 규칙은 그대로). 강제 다크 블록(`:root[data-theme="dark"]`)의 주석만 갱신. 블록 자체는 유지(견본 틀과 `css-check` 대비 점검이 쓴다).
- `dev/styleguide.js`: 테마 전환 견본 상수와 "화면 테마 전환" 절 삭제. 14행 `dataset.theme = mode` 는 유지(견본 틀의 라이트·다크).
- `js/i18n/ko.js`, `js/i18n/en.js`: `theme.label`, `theme.system`, `theme.light`, `theme.dark` 삭제.
- `scripts/test.mjs`: `themeOf` import·시험 삭제, 테마 인라인 스크립트 시험을 "다섯 쪽에 `vct-theme`·`data-theme-set`·`theme-switch` 가 없다" 시험으로 바꿈. 언어 이동 스크립트 시험은 그대로.

## 결정과 이유
- `vct-theme` 은 지우지 않는다. 읽는 코드가 없으므로 무시된다. 지시문대로.
- `theme-color` 메타 두 개는 OS 따라 그대로 둔다.
- `:root[data-theme="dark"]` 블록은 지우지 않는다. 견본 틀(`?mode=dark`)과 `css-check` 가 쓴다.

## 확인 결과 (직접 실행)
- `node scripts/test.mjs`: 시험 160 → 159 통과. 줄어든 1개는 `themeOf` 시험이다. 테마 스크립트 시험은 같은 자리에서 "없음" 시험으로 바뀌었다.
- `node scripts/validate.mjs`: 종료 0, 오류 0, 경고 644(이전과 같음, `data/` 미변경).
- `node scripts/css-check.mjs`: 통과.
- `node scripts/build.mjs _site`: 빌드 완료. `grep -rl "vct-theme\|data-theme-set\|theme-switch" _site`: 결과 없음.
- 내장 브라우저(`dev-server.mjs 8081`):
  - 머리: `.theme-switch` 없음, `KR EN` 만 있음. 375 폭 가로 넘침 없음.
  - `localStorage["vct-theme"]="dark"`, OS 라이트: 페이지 밝음(`#F4F5F7`), `data-theme` 없음.
  - OS 다크(색 설정 에뮬레이션): 페이지 어두움(`#0F1318`), 다시 불러오기 없이 바뀜.
  - `privacy/`, `en/privacy/`: 저장값 `dark` 여도 OS 라이트면 밝음. 전환 단추 없음.
  - `dev/styleguide.html?mode=dark`: `data-theme=dark`, `--neutral-0 #181D24`, 나머지 절 정상.
  - 콘솔 오류 없음.
- 1280 폭 헤더 정렬과 EN 375 폭은 따로 확인하지 않았다.

## 남은 일
- PR 18(watch 줄 접기)은 이 PR 병합 뒤 시작한다(지시문: "Open after PR 17 is merged").
- 1280 폭 헤더 정렬, EN 375 폭 확인.
