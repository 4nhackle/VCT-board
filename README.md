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
