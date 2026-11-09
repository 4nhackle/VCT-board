// 단위 시험 실행기: 시험 파일 여섯 개를 정해진 순서로 읽어 돌리고 합계를 낸다. 실행: node scripts/test.mjs (실패하면 종료 코드 1).
import { count } from "./test/helpers.mjs";
import "./test/format.test.mjs";
import "./test/model.test.mjs";
import "./test/state.test.mjs";
import "./test/views.test.mjs";
import "./test/i18n.test.mjs";
import "./test/tools.test.mjs";

console.log(`\n단위 시험 ${count()}개 통과`);
