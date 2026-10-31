// 출력 폴더를 지우기 전 안전 확인. build.mjs 와 fixture-site.mjs 가 함께 쓴다.
// 저장소 루트, 저장소의 상위 폴더, 저장소 안 폴더는 거부한다. 단 build 가 쓰는 저장소 안 _site 만 예외다.
// 비어 있지 않은 폴더는 이 파일이 만든 표시 파일(MARK)이 있을 때만 지운다.
import fs from "node:fs";
import path from "node:path";

export const MARK = ".vct-build-output";

// 경로 비교용: 절대 경로, 끝 구분자 제거, Windows 는 대소문자 무시.
function norm(p) {
  let s = path.resolve(p).replace(/[\\/]+$/, "");
  if (process.platform === "win32") s = s.toLowerCase();
  return s;
}

// 거부 이유를 돌려준다. 거부하지 않으면 null. 파일 시스템은 건드리지 않는다.
export function refuseReason(out, root, { allowSite = false } = {}) {
  const o = norm(out), r = norm(root), sep = path.sep;
  if (o === r) return "저장소 루트";
  if (r.startsWith(o + sep)) return "저장소의 상위 폴더";
  if (o.startsWith(r + sep)) {
    if (allowSite && o === norm(path.join(root, "_site"))) return null;
    return "저장소 안의 폴더";
  }
  return null;
}

// 출력 폴더를 비우고 표시 파일을 쓴다. 거부 대상이거나 표시 파일 없이 비어 있지 않으면 아무것도 지우지 않고 던진다.
export function prepareOut(out, root, opts) {
  const why = refuseReason(out, root, opts);
  if (why) throw new Error("출력 폴더를 쓸 수 없습니다(" + why + "): " + out);
  if (fs.existsSync(out) && fs.readdirSync(out).length) {
    if (!fs.existsSync(path.join(out, MARK))) throw new Error("비어 있지 않고 표시 파일이 없어 지우지 않습니다: " + out);
    fs.rmSync(out, { recursive: true, force: true });
  }
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, MARK), "scripts 가 만든 출력 폴더입니다. 지워도 됩니다.\n");
}
