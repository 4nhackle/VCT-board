# VCT-board

Valorant LFT·FA 현황 정적 사이트. 데이터는 `data/` 의 JSON 에서 읽고, 빌드는 Node 만 쓴다.

## 로컬에서 실행

```bash
node scripts/dev-server.mjs 8080
```

- 사이트: http://localhost:8080/VCT-board/
- 컴포넌트 견본(개발용, 배포하지 않음): http://localhost:8080/VCT-board/dev/styleguide.html
- 시험·점검·빌드:

```bash
node scripts/test.mjs
node scripts/validate.mjs
node scripts/css-check.mjs
node scripts/build.mjs _site
```

- 화면 불변 확인 스냅숏(수동, Playwright 필요. 설치: `npm i -D playwright && npx playwright install chromium`): `node scripts/style-snapshot.mjs out.json` 로 저장하고, `--compare before.json` 을 붙이면 다른 값만 보인다.
- 샘플 사이트(수동, 배포하지 않음): `scripts/fixtures/` 의 샘플 데이터로 저장소 밖 폴더에 목록 화면을 만든다. `node scripts/fixture-site.mjs "$TEMP/vct-fixture"`, 이어서 `node scripts/dev-server.mjs 8705 "$TEMP/vct-fixture"` 로 열면 http://127.0.0.1:8705/VCT-board/ 가 보인다. 인물·팀 상세 페이지는 이 샘플에서 만들어지지 않는다. 자세한 내용은 `docs/PROGRESS.md` 의 "샘플 사이트로 시험하는 법".
- 번역 현황표(수동): 대상 필드별 원문·번역·누락 수를 출력한다. `node scripts/i18n-report.mjs`. 예약 작업 점검과 같은 기준이다.

## 링크 미리보기 그림

- 루트 `og.png`(한국어)와 `og-en.png`(영어)는 `dev/og.html`, `dev/og-en.html` 을 헤드리스 Chrome 으로 캡처해 만든다. 명령은 각 파일 맨 위 주석에 있다. 파일 이름은 바꾸지 않는다(`scripts/build.mjs` 와 메타 태그가 이 이름을 쓴다).
