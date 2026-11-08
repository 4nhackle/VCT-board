// 샘플 데이터로 사이트를 만든다(시험용, 배포에는 쓰지 않음). 저장소 밖 폴더만 받는다.
// 실행: node scripts/fixture-site.mjs <출력 폴더>   (끝에 상세 페이지까지 든 샘플 사이트가 <출력 폴더>/_site 에 만들어진다)
// 다음: node scripts/dev-server.mjs 8705 <출력 폴더>/_site  →  http://127.0.0.1:8705/VCT-board/p/fx-one/
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { prepareOut } from "./out-dir.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
if (!process.argv[2]) { console.error("출력 폴더를 인자로 주세요. 예: node scripts/fixture-site.mjs %TEMP%\\vct-fixture"); process.exit(2); }
const out = path.resolve(process.argv[2]);
try { prepareOut(out, root); } catch (e) { console.error(e.message); process.exit(2); }
// build.mjs 가 읽는 파일과 폴더를 그대로 옮긴다. 샘플 데이터만 data/ 자리에 넣는다. 배포 코드에는 이런 분기가 없다.
for (const f of ["index.html", "og.png", "og-en.png"]) fs.copyFileSync(path.join(root, f), path.join(out, f));
for (const d of ["css", "js", "en", "privacy", "terms"]) fs.cpSync(path.join(root, d), path.join(out, d), { recursive: true });
fs.cpSync(path.join(root, "scripts"), path.join(out, "scripts"), { recursive: true, filter: (src) => path.basename(src) !== "fixtures" });
fs.cpSync(path.join(root, "scripts", "fixtures"), path.join(out, "data"), { recursive: true });
// 샘플 폴더의 build.mjs 를 돌려 상세 페이지까지 만든다. 빌드가 실패하면 이 명령도 실패한다.
const b = spawnSync(process.execPath, [path.join(out, "scripts", "build.mjs")], { cwd: out, stdio: "inherit" });
if (b.status !== 0) { console.error("샘플 사이트 빌드 실패(위 오류를 확인하세요)"); process.exit(1); }
console.log("샘플 사이트:", path.join(out, "_site"));
