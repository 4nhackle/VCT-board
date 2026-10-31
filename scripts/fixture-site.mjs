// 샘플 데이터로 사이트를 만든다(시험용, 배포에는 쓰지 않음). 저장소 밖 폴더만 받는다.
// 실행: node scripts/fixture-site.mjs <출력 폴더>
// 다음: node scripts/dev-server.mjs 8705 <출력 폴더>  →  http://127.0.0.1:8705/VCT-board/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
if (!process.argv[2]) { console.error("출력 폴더를 인자로 주세요. 예: node scripts/fixture-site.mjs %TEMP%\\vct-fixture"); process.exit(2); }
const out = path.resolve(process.argv[2]);
if (out === root.slice(0, -1) || out.startsWith(root)) { console.error("저장소 안 폴더에는 만들지 않습니다: " + out); process.exit(2); }

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const f of ["index.html", "og.png"]) fs.copyFileSync(path.join(root, f), path.join(out, f));
for (const d of ["css", "js"]) fs.cpSync(path.join(root, d), path.join(out, d), { recursive: true });
// data/ 자리에 샘플을 넣는다. 배포 코드에는 이런 분기가 없다.
fs.cpSync(path.join(root, "scripts", "fixtures"), path.join(out, "data"), { recursive: true });
console.log("샘플 사이트:", out);
