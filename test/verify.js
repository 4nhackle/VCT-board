// usage: node test/verify.js [path-to-index.html]
const fs = require("fs"), path = require("path"), assert = require("assert");
const html = fs.readFileSync(process.argv[2] || path.join(__dirname, "..", "index.html"), "utf8");
const m = /<script>([\s\S]*)<\/script>/.exec(html.slice(html.lastIndexOf("<script")).replace(/^<script[^>]*>/, "<script>"));
let js = m[1];
const tailRe = /renderChrome\(\);\s*renderView\(\);\s*\}\)\(\);\s*$/;
assert(tailRe.test(js), "script tail not found");
js = js.replace(tailRe, "globalThis.T={pillOf,regionsHTML,srcHTML,rowHTML,TABS,P,CO,T1,T2,W,cls,REGIONS};})();");
const el = () => ({ addEventListener(){}, querySelector(){return null}, setAttribute(){}, dataset:{}, style:{} });
globalThis.document = { getElementById: el, addEventListener(){}, title:"" };
globalThis.window = { addEventListener(){} };
globalThis.location = { hash: "" };
globalThis.localStorage = { getItem(){return null}, setItem(){} };
globalThis.history = { pushState(){} };
eval(js);
const T = globalThis.T;

// 1. status
for (const s of ["은퇴", "공식 발표 대기"])
  assert.deepStrictEqual(T.pillOf({ status: s }), ["unknown", "확인 필요"], s);
for (const s of ["LFT 선언", "FA(11/2) · 협상 가능", "구직 중", "FA", "lft", "fa 탐색", "LFT(계약 중)", "FA 진입 예정",
  "탐색 허가", "탐색 허가(계약 중)", "탐색 허가(비활성 로스터)", "탐색 허가(벤치)", "계약 만료·타팀 탐색(협상 중)"])
  assert.strictEqual(T.pillOf({ status: s })[0], "open", s);
assert.strictEqual(T.pillOf({ status: "팀 이탈(예정)" })[0], "left");
assert.strictEqual(T.pillOf({ status: "계약 완료(Fnatic)" })[0], "signed");

// real data: nothing falls into unknown
const all = [].concat(T.P, T.CO);
const unk = all.filter(it => T.cls(it) === "unknown");
assert.strictEqual(unk.length, 0, "real data has unknown: " + [...new Set(unk.map(i => i.status))]);
const cnt = {}; all.forEach(it => cnt[T.cls(it)] = (cnt[T.cls(it)] || 0) + 1);
console.log("real data status counts:", cnt);

// 2. region
const tab = T.TABS[0];
const fake = [
  { region: "Americas", team: "A", name: "n1", sub: "", status: "LFT", date: 1, note: "" },
  { region: "LATAM", team: "B", name: "n2", sub: "", status: "LFT", date: 1, note: "" },
  { region: "오타", team: "B", name: "n3", sub: "", status: "은퇴", date: 1, note: "" },
];
const out = T.regionsHTML(fake, tab);
assert(out.includes("기타"), "no 기타");
assert(!out.includes("undefined"), "undefined printed");
assert.strictEqual((out.match(/<li class="row">/g) || []).length, fake.length, "row count");
assert(out.includes("확인 필요"));
// real data: every row rendered
const realOut = T.regionsHTML(T.P, tab);
assert.strictEqual((realOut.match(/<li class="row">/g) || []).length, T.P.length);
assert(!realOut.includes("기타"), "real data should have no 기타");
assert(!T.rowHTML(fake[1], tab, { region: true }).includes("undefined"));
assert(!T.rowHTML({ region: "EMEA", team: "A", name: "n", sub: "-, Canada", status: "LFT", date: 1, note: "" }, tab).includes(">-"));

// 3. href
assert(!T.srcHTML(["X", "javascript:alert(1)"]).includes("<a"));
assert(!T.srcHTML(["X", " java\tscript:alert(1)"]).includes("<a"));
assert(T.srcHTML(["X", "https://a.b/c?d=1&e=2"]).includes('<a href="https://a.b/c?d=1&amp;e=2"'));
assert(T.srcHTML(["X", "HTTP://a.b"]).includes("<a"));
assert.strictEqual(T.srcHTML(undefined), "");
console.log("ALL OK");
