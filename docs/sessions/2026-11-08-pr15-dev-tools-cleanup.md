# 2026-11-08 · PR 15 개발 도구 정리, 샘플 사이트 빌드, SRI 결정 기록

## 목적

감사 2026-11-08c 발견 1·3·4. 배포되는 사이트는 바꾸지 않는다.
- 발견 1: 스타일 견본이 없는 지역("Korea")과 없어진 정렬 칩을 그린다.
- 발견 3: 샘플 사이트가 상세 페이지(`p/fx-one/`)를 만들지 못한다.
- 발견 4: hCaptcha 스크립트에 SRI 가 없다. 위험을 받아들이고 기록한다.

지시문 `docs/instructions/PR15-dev-tools-cleanup.md`.

## 작업 위치

- 브랜치 `fix/dev-tools-cleanup`, 기준 `origin/main`(c5cd56b, PR 14 병합 뒤). worktree `C:\Users\idisi\coding\VCT-board-pr15`.
- 병합하지 않는다.

## 바꾼 파일

- `dev/styleguide.js`:
  - 손으로 그린 `chips` 블록(지역 4개 중 "Korea", 정렬 그룹)을 지웠다. 주석은 탭·고정 막대만 설명하도록 고쳤다.
  - 섹션 제목 "탭과 칩" → "탭".
  - 고정 막대의 지역 선택 상자 옵션을 `REGIONS`(`js/model.js`)에서 만든다. `REGIONS` 를 import 했다.
- `scripts/fixture-site.mjs`: 빌드에 필요한 파일을 모두 옮긴다(루트 파일 `index.html`, `og.png`, `og-en.png`; 폴더 `css`, `js`, `en`, `privacy`, `terms`, `scripts` 전체(`fixtures` 제외)). 샘플 데이터는 `data/` 로 넣는다. 그다음 샘플 폴더의 `scripts/build.mjs` 를 돌린다. 빌드가 실패하면 이 명령도 실패한다(종료 1).
- `scripts/test.mjs`: 시험 1개. 임시 폴더에서 `fixture-site.mjs` 를 돌려 종료 0과 `p/fx-one/index.html` 이 생기는지 본다. 끝나면 임시 폴더를 지운다.
- `js/views/suggest.js`: hCaptcha 스크립트 줄 위에 주석 한 줄(SRI 를 쓰지 않는 까닭). 코드는 바뀌지 않았다.
- `README.md` 23번째 줄: 샘플 사이트가 상세 페이지까지 든다고 고쳤다. 서버 명령은 `_site` 를 가리킨다. 주소는 `p/fx-one/`.
- `docs/PROGRESS.md`: "샘플 사이트로 시험하는 법" 절의 명령과 주소를 고쳤다. 이 세션 요약 한 절.

## 결정과 이유

- SRI 는 쓰지 않는다. hCaptcha 주소는 버전이 없고 파일이 계속 바뀌므로 해시를 고정할 수 없다. 이 스크립트는 건의 탭에서만 돈다. 공개 개인정보처리방침은 hCaptcha 를 이미 밝히고 있어 바꾸지 않았다(지시문). 위험 수용은 여기 기록한다.
- 샘플 복사 목록은 `build.mjs` 가 읽는 것으로 정했다. 전부 복사하지 않는 까닭은 `dev/`, `docs/`, `data/`(실제 데이터) 가 필요 없고 크기만 늘리기 때문이다.

## 확인 결과

- `node scripts/test.mjs` → 단위 시험 161개 통과(전 160, 새 1). 종료 코드 0.
- `node scripts/validate.mjs` → 오류 0, 경고 644(변화 없음).
- `node scripts/css-check.mjs` → 통과.
- `node scripts/build.mjs <scratchpad>\_site-pr15` → 빌드 완료(인물 330쪽, 팀 350쪽).
- `node scripts/fixture-site.mjs <임시>` → 종료 0. 샘플 빌드: 인물 6쪽(`p/`), 팀 4쪽(`t/`). `p/fx-one/index.html` 존재.
- `node scripts/dev-server.mjs 8705 <임시>/_site` 후 `curl`: `http://127.0.0.1:8705/VCT-board/` → 200, `.../p/fx-one/` → 200. 서버는 끝내 종료했다.
- `node --check dev/styleguide.js` → 문법 통과. "Korea" 글자 0개.
- `git diff --stat origin/main -- index.html css js privacy terms en`: `js/views/suggest.js` 한 줄(주석)뿐. 배포되는 파일은 바뀌지 않았다.
- 브라우저 확인: 하지 못했다. Obscura 가 `127.0.0.1` 을 막는다. 내장 브라우저는 허락 없이 쓰지 않았다. 견본 화면과 콘솔 오류 확인은 빠졌다(문법 확인과 HTTP 확인으로 대신).

## 남은 일

- 견본 페이지 화면과 콘솔 오류 확인(사용자가 내장 브라우저 사용을 허락하면).
- 임시 폴더는 확인 뒤 지운다.
