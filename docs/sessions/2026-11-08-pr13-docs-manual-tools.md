# 2026-11-08 · PR 13 수동 도구 문서화, 기준 시각 줄 규칙 정정

## 목적

감사 2026-11-08b 발견 3·4(문서만): `fixture-site.mjs`·`i18n-report.mjs` 가 README 에 없고, CLAUDE.md 의 `data/` 규칙이 예약 작업의 `index.html` 기준 시각 줄 수정을 빠뜨렸다. 지시문 `docs/instructions/PR13-docs-manual-tools.md`.

## 작업 위치

- 브랜치 `docs/manual-tools`, 기준 `origin/main`(bd30f27). worktree `C:\Users\idisi\coding\VCT-board-pr13`.
- 병합하지 않는다.

## 결정: 문서화(권장안)

지시문은 사용자 답을 먼저 물으라고 했다. 사용자는 "PR13 진행"이라고만 답했으므로 지시문의 기본값(문서화)을 따랐다. 두 도구를 지우면 `PROGRESS.md` 의 샘플 사이트 절과 PR5 지시문이 깨진다.

## 바꾼 파일

- `README.md`: "로컬에서 실행" 구역, 스냅숏 줄 아래에 두 줄.
  - 샘플 사이트: `node scripts/fixture-site.mjs "$TEMP/vct-fixture"` 와 `node scripts/dev-server.mjs 8705 "$TEMP/vct-fixture"`. 열면 http://127.0.0.1:8705/VCT-board/ 목록이 보인다. 인물·팀 상세 페이지는 이 샘플에서 만들어지지 않는다고 적었다.
  - 번역 현황표: `node scripts/i18n-report.mjs`.
- `CLAUDE.md` 20번째 줄 한 문장만: "`data/` 와 `index.html` 의 기준 시각 줄은 예약 작업이 커밋한다. 코드 작업에서 둘 다 손으로 바꾸지 않는다."
- `docs/PROGRESS.md`: "샘플 사이트로 시험하는 법" 절의 "열기" 줄을 바로잡았다(`p/fx-one/` 은 404, 목록만 열린다). 이 세션 요약 한 절.

## 발견: 샘플 사이트는 상세 페이지를 만들지 못한다

- `fixture-site.mjs` 는 `index.html`, `og.png`, `css`, `js`, `build.mjs`, `out-dir.mjs` 와 샘플 데이터만 복사한다.
- 그 샘플 폴더에서 `build.mjs` 를 돌리면 `scripts/i18n-html.mjs` 를 찾지 못해 실패한다(`ERR_MODULE_NOT_FOUND`, 종료 1).
- 그래서 `PROGRESS.md` 가 말한 `p/fx-one/` 은 404다. 목록(`/VCT-board/`)은 200이다.
- 고치려면 `fixture-site.mjs` 가 빌드에 필요한 파일을 더 복사해야 한다(코드 변경). 이 PR 은 문서만 바꾼다. 후속 작업으로 남긴다.

## 확인 결과

- README 명령 두 개를 저장소 밖 임시 폴더에서 한 번 실행:
  - `node scripts/fixture-site.mjs "$TEMP/vct-fixture"` → 샘플 사이트 생성, 종료 0.
  - `node scripts/dev-server.mjs 8705 "$TEMP/vct-fixture"` → `http://127.0.0.1:8705/VCT-board/` 200, `.../p/fx-one/` 404(위 발견).
  - `node scripts/i18n-report.mjs` → 표 출력, 종료 0(합계 465 / 444 / 21, 번역 표 항목 371개, 쓰이는 키 392개).
- 임시 폴더 `$TEMP/vct-fixture` 와 `$TEMP/vct-devserver.log` 는 지웠다.
- `node scripts/test.mjs` → 158개 통과(변화 없음).
- `node scripts/validate.mjs` → 오류 0, 경고 644(변화 없음).
- `node scripts/css-check.mjs` → 통과.
- `node scripts/build.mjs <scratchpad>\_site-pr13` → 빌드 완료(인물 330쪽, 팀 350쪽).
- `git status`: `CLAUDE.md`, `README.md`, `docs/PROGRESS.md` 와 이 세션 기록만 바뀌었다.

## 남은 일

- 샘플 사이트 상세 페이지 복구는 `fixture-site.mjs` 코드 변경이 필요하다(후속).
- 지시문의 "Done when: 두 README 명령이 적힌 그대로 작동" 은 명령 자체는 작동한다(종료 0). 다만 적힌 URL 은 목록 화면만 가리킨다. 이 점을 PR 본문에 적었다.
