// 시험: 검증·빌드·출력 폴더·CSS·정적 페이지 점검(scripts/*.mjs 도구).
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import vm from "node:vm";
import { inlineScript, checkSitePath } from "../inline-script.mjs";
import { checkCss } from "../css-check.mjs";
import { fileURLToPath } from "node:url";
import { pillOf } from "../../js/model.js";
import { gapsOf } from "../gaps.mjs";
import { refuseReason, prepareOut, MARK } from "../out-dir.mjs";
import { toLang } from "../i18n-html.mjs";
import { T, t } from "./helpers.mjs";

const VALIDATE = fileURLToPath(new URL("../validate.mjs", import.meta.url));
const FIX = fileURLToPath(new URL("../fixtures", import.meta.url));

// PR 10: 인물 이름 충돌은 personId 없는 소식 행이 끼면 오류, 인물 명단끼리만이면 경고. 임시 데이터 폴더에서 validate.mjs 를 돌린다.

function runValidate(name, { players = [], coaches = [], people = [], teams = [] }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vct-pr10-" + name + "-"));
  const put = (f, v) => fs.writeFileSync(path.join(dir, f + ".json"), JSON.stringify(v));
  put("sources", { s1: ["VLR", "https://www.vlr.gg/1/x"] });
  put("transfers", { players: [], coaches: [] });
  put("players", players);
  put("coaches", coaches);
  put("watch", []);
  put("people", people);
  put("teams", teams);
  return spawnSync(process.execPath, [VALIDATE, dir], { encoding: "utf8" });
}

const vrow = (team, name, extra = {}) => ({ region: "EMEA", team, name, status: "FA 진입 예정", date: T, conf: "C", src: "s1", ...extra });

const vperson = (id, name) => ({ id, name, role: "Duelist", nationality: "Japan" });

t("validate: 소식 행끼리 ZYZZ·zyzz(personId 없음)는 오류 종료 1", () => {
  const r = runValidate("rows", { players: [vrow("A", "ZYZZ"), vrow("B", "zyzz")] });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /인물 이름 충돌/);
});

t("validate: 소식 행 ZYZZ(personId 없음)와 인물 명단 zyzz 는 오류", () => {
  const r = runValidate("row-people", { players: [vrow("A", "ZYZZ")], people: [vperson("zyzz-x", "zyzz")] });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /인물 이름 충돌/);
});

t("validate: 인물 명단끼리만 ZYZZ·zyzz 는 경고만(종료 0)", () => {
  const r = runValidate("people-only", { people: [vperson("zyzz", "ZYZZ"), vperson("zyzz-2", "zyzz")] });
  assert.equal(r.status, 0);
  assert.match(r.stderr, /같은 ID 'zyzz'/);
  assert.doesNotMatch(r.stderr, /인물 이름 충돌/);
});

t("validate: personId 가 있는 행끼리 같은 철자는 충돌이 아니다", () => {
  const r = runValidate("ids", { players: [vrow("A", "ZYZZ", { personId: "zyzz-a" }), vrow("B", "zyzz", { personId: "zyzz-b" })], people: [vperson("zyzz-a", "Alpha"), vperson("zyzz-b", "Beta")] });
  assert.equal(r.status, 0);
  assert.doesNotMatch(r.stderr, /같은 ID 'zyzz'/);
});

t("validate: people.json 또는 teams.json 이 없으면 오류로 종료 1, 둘 다 있으면 통과", () => {
  const folder = (skip) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vct-req-"));
    const put = (f, v) => fs.writeFileSync(path.join(dir, f + ".json"), JSON.stringify(v));
    put("sources", { s1: ["VLR", "https://www.vlr.gg/1/x"] });
    put("transfers", { players: [], coaches: [] });
    put("players", []);
    put("coaches", []);
    put("watch", []);
    if (skip !== "people") put("people", []);
    if (skip !== "teams") put("teams", []);
    return dir;
  };
  const noPeople = spawnSync(process.execPath, [VALIDATE, folder("people")], { encoding: "utf8" });
  assert.equal(noPeople.status, 1);
  assert.match(noPeople.stderr, /people\.json 이 없습니다/);
  const noTeams = spawnSync(process.execPath, [VALIDATE, folder("teams")], { encoding: "utf8" });
  assert.equal(noTeams.status, 1);
  assert.match(noTeams.stderr, /teams\.json 이 없습니다/);
  const both = spawnSync(process.execPath, [VALIDATE, folder(null)], { encoding: "utf8" });
  assert.equal(both.status, 0);
  assert.doesNotMatch(both.stderr, /이 없습니다/);
});

t("validate: 팀 이름 Leviatán·LEVIATÁN 은 경고만(종료 0)", () => {
  const r = runValidate("teams", { players: [vrow("Leviatán", "P1"), vrow("LEVIATÁN", "P2")] });
  assert.equal(r.status, 0);
  assert.match(r.stderr, /같은 ID 'leviatan'/);
});



// 임시 데이터 폴더에 행 하나를 두고 validate.mjs 를 돌린다. 실제 data/ 는 건드리지 않는다.
function validateFixture(name, { row = {}, sources = { s1: ["VLR", "https://www.vlr.gg/777970/x"] }, teams = [] } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vct-v2-" + name + "-"));
  const base = { region: "EMEA", team: "Team X", name: "Alpha", status: "FA 진입 예정", date: T, conf: "C", src: "s1" };
  fs.writeFileSync(path.join(dir, "sources.json"), JSON.stringify(sources));
  fs.writeFileSync(path.join(dir, "transfers.json"), JSON.stringify({ players: [], coaches: [] }));
  fs.writeFileSync(path.join(dir, "players.json"), JSON.stringify([{ ...base, ...row }]));
  fs.writeFileSync(path.join(dir, "coaches.json"), "[]");
  fs.writeFileSync(path.join(dir, "watch.json"), "[]");
  fs.writeFileSync(path.join(dir, "people.json"), "[]");
  fs.writeFileSync(path.join(dir, "teams.json"), JSON.stringify(teams));
  return spawnSync(process.execPath, [VALIDATE, dir], { encoding: "utf8" });
}

t("validate: 날짜 칸이 글자(\"2026-10-25\")면 오류 종료 1, 숫자면 통과", () => {
  const bad = validateFixture("text-date", { row: { date: "2026-10-25" } });
  assert.equal(bad.status, 1, bad.stderr);
  assert.match(bad.stderr, /날짜가 숫자\(시트 일련번호\)가 아닙니다/);
  assert.equal(validateFixture("num-date", { row: { date: T } }).status, 0);
});

t("validate: 선수·코치 이름이 비면 오류 종료 1, 이름이 있으면 통과", () => {
  const bad = validateFixture("no-name", { row: { name: "" } });
  assert.equal(bad.status, 1, bad.stderr);
  assert.match(bad.stderr, /이름이 비어 있습니다/);
  assert.equal(validateFixture("with-name", { row: { name: "Beta" } }).status, 0);
});

t("validate: 선수 상태가 없거나 비면 오류 종료 1, 글이 있으면 통과", () => {
  const nul = validateFixture("status-null", { row: { status: null } });
  assert.equal(nul.status, 1, nul.stderr);
  assert.match(nul.stderr, /상태가 비어 있습니다/);
  const blank = validateFixture("status-blank", { row: { status: "  " } });
  assert.equal(blank.status, 1, blank.stderr);
  assert.match(blank.stderr, /상태가 비어 있습니다/);
  assert.equal(validateFixture("status-ok", { row: { status: "구직 중" } }).status, 0);
});

t("validate: 팀 등급은 아는 값·\"other\"·없음만 통과, 모르는 값은 오류 종료 1", () => {
  const legend = validateFixture("tier-legend", { teams: [{ id: "x", name: "X", tier: "legend" }] });
  assert.equal(legend.status, 1, legend.stderr);
  assert.match(legend.stderr, /등급 "legend" 을\(를\) 알 수 없습니다/);
  assert.equal(validateFixture("tier-other", { teams: [{ id: "x", name: "X", tier: "other" }] }).status, 0);
  assert.equal(validateFixture("tier-none", { teams: [{ id: "x", name: "X" }] }).status, 0);
});

t("validate: contractUntil 은 숫자 또는 yyyy 만 통과, '2027-05' 와 caption 5 는 오류", () => {
  assert.equal(validateFixture("num", { row: { contractUntil: T + 30 } }).status, 0);
  assert.equal(validateFixture("year", { row: { contractUntil: "2027" } }).status, 0);
  const bad = validateFixture("bad-year", { row: { contractUntil: "2027-05" } });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /contractUntil 은 시트 일련번호\(숫자\) 또는 yyyy/);
  const cap = validateFixture("cap-num", { row: { caption: 5 } });
  assert.equal(cap.status, 1);
  assert.match(cap.stderr, /caption 은 문자열이어야 합니다/);
});

t("validate: caption 이 120자를 넘으면 경고만(종료 0)", () => {
  const r = validateFixture("cap-long", { row: { caption: "가".repeat(121) } });
  assert.equal(r.status, 0);
  assert.match(r.stderr, /caption 이 120자를 넘습니다/);
});

t("validate: 출처 경고 — https 아님, 홈페이지 주소, 같은 주소 중복은 경고만 낸다", () => {
  const http = validateFixture("src-http", { sources: { s1: ["VLR", "http://www.vlr.gg/777970/x"] } });
  assert.equal(http.status, 0);
  assert.match(http.stderr, /https:\/\/ 로 시작하지 않습니다/);
  const home = validateFixture("src-home", { sources: { s1: ["VLR", "https://www.vlr.gg/"] } });
  assert.equal(home.status, 0);
  assert.match(home.stderr, /홈페이지 주소입니다/);
  const dup = validateFixture("src-dup", { sources: { s1: ["VLR", "https://www.vlr.gg/1/x"], s2: ["VLR 2", "https://www.vlr.gg/1/x"] } });
  assert.equal(dup.status, 0);
  assert.match(dup.stderr, /같은 주소가 출처 s1, s2 에 있습니다/);
});

t("gapsOf: 빈 칸·'-'·빈 경력은 빈 항목, 계약은 숫자나 yyyy 면 채운 것(그 밖의 글은 빈 항목)", () => {
  assert.deepEqual(gapsOf({ name: "x", birth: "-", role: "-", nationality: "", realName: "-", career: [], links: { vlr: "-" }, contractUntil: "2026-05" }),
    ["birth", "role", "nationality", "realName", "career", "vlr", "liquipedia", "contract"]);
  assert.deepEqual(gapsOf({ name: "x", birth: "-", role: "-", nationality: "", realName: "-", career: [], links: { vlr: "-" }, contractUntil: "2026" }),
    ["birth", "role", "nationality", "realName", "career", "vlr", "liquipedia"]);
  assert.deepEqual(gapsOf({ birth: "2001", role: "Duelist", nationality: "Japan", realName: "A", career: [{ team: "t", from: "2024-01", to: null }], links: { vlr: "https://v", liquipedia: "https://l" }, contractUntil: 46326 }), []);
});

t("gaps.mjs: --json 은 빈 항목 많은 순 배열, 표는 항목 여덟 줄", () => {
  const GAPS = fileURLToPath(new URL("../gaps.mjs", import.meta.url));
  const j = spawnSync(process.execPath, [GAPS, "--json"], { encoding: "utf8" });
  assert.equal(j.status, 0, j.stderr);
  const rows = JSON.parse(j.stdout);
  assert.ok(Array.isArray(rows) && rows.length > 0);
  for (const r of rows) assert.deepEqual(Object.keys(r), ["id", "name", "kind", "team", "missing", "vlr", "liquipedia"]);
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i - 1].missing.length >= rows[i].missing.length, "정렬 순서");
  const table = spawnSync(process.execPath, [GAPS], { encoding: "utf8" });
  assert.equal(table.status, 0, table.stderr);
  assert.equal(table.stdout.trim().split("\n").length, 10); // 요약 줄 + 머리 줄 + 항목 여덟 줄
  const v = spawnSync(process.execPath, [fileURLToPath(new URL("../validate.mjs", import.meta.url))], { encoding: "utf8" });
  assert.equal(v.status, 0, v.stderr);
  assert.match(v.stdout, /정보 빈 칸: 생년월일 \d+, 포지션 \d+, 국적 \d+, 계약 \d+/);
});

t("fixture-site: 샘플 폴더에서 build 가 돌아 p/fx-one 상세 페이지가 생긴다(실패하면 종료 코드 0 아님)", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vct-fixture-"));
  try {
    const r = spawnSync(process.execPath, [fileURLToPath(new URL("../fixture-site.mjs", import.meta.url)), path.join(dir, "site")], { encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr);
    assert.ok(fs.existsSync(path.join(dir, "site", "_site", "p", "fx-one", "index.html")));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

t("out-dir: 저장소 루트·상위·안쪽 폴더 거부, _site 만 예외(R-01, 판정만, 파일은 안 건드림)", () => {
  const R = "C:/Users/KDB/Coding/VCT-board";
  assert.equal(refuseReason(R, R), "저장소 루트");
  assert.equal(refuseReason(R + "/js", R), "저장소 안의 폴더");
  assert.equal(refuseReason(R + "/..", R), "저장소의 상위 폴더");
  assert.equal(refuseReason(R + "/_site", R, { allowSite: true }), null);
  assert.equal(refuseReason(R + "/_site", R), "저장소 안의 폴더");
});





// 견본 데이터(fixtures/styleguide)는 폴더라서 빼고, 시험 데이터 파일만 복사한다.
const fixFiles = () => fs.readdirSync(FIX).filter((f) => fs.statSync(path.join(FIX, f)).isFile());

const tmp = (name) => fs.mkdtempSync(path.join(os.tmpdir(), "vct-test-" + name + "-"));

t("validate: career 의 to 가 from 보다 앞서면 오류 종료 1(이전 검토 요청 3)", () => {
  const dir = tmp("career");
  for (const f of fixFiles()) fs.copyFileSync(path.join(FIX, f), path.join(dir, f));
  const people = JSON.parse(fs.readFileSync(path.join(dir, "people.json"), "utf8"));
  people[0].career[0] = { team: "fx-alpha", from: "2026-10", to: "2025-01" };
  fs.writeFileSync(path.join(dir, "people.json"), JSON.stringify(people));
  const r = spawnSync(process.execPath, [VALIDATE, dir], { encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /career\.to "2025-01" 은\(는\) from 보다 앞설 수 없습니다/);
  fs.rmSync(dir, { recursive: true, force: true });
});

t("validate: 정상 경력(시작과 끝이 같은 달 포함)은 통과", () => {
  const dir = tmp("ok");
  for (const f of fixFiles()) fs.copyFileSync(path.join(FIX, f), path.join(dir, f));
  const people = JSON.parse(fs.readFileSync(path.join(dir, "people.json"), "utf8"));
  people[0].career[0] = { team: "fx-alpha", from: "2026-10", to: "2026-10" };
  fs.writeFileSync(path.join(dir, "people.json"), JSON.stringify(people));
  const r = spawnSync(process.execPath, [VALIDATE, dir], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  fs.rmSync(dir, { recursive: true, force: true });
});

t("out-dir 실제 동작: 표시 파일 없는 폴더는 그대로 남고, 표시 파일 있는 폴더만 비워짐(임시 폴더에서만)", () => {
  const root = tmp("root"); // 저장소가 아닌 임시 폴더를 기준으로 삼는다
  const noMark = tmp("nomark"), withMark = tmp("withmark");
  fs.writeFileSync(path.join(noMark, "keep.txt"), "keep");
  assert.throws(() => prepareOut(noMark, root), /표시 파일이 없어/);
  assert.equal(fs.readFileSync(path.join(noMark, "keep.txt"), "utf8"), "keep");
  fs.writeFileSync(path.join(withMark, MARK), "x");
  fs.writeFileSync(path.join(withMark, "old.html"), "old");
  prepareOut(withMark, root);
  assert.ok(!fs.existsSync(path.join(withMark, "old.html")));
  assert.ok(fs.existsSync(path.join(withMark, MARK)));
  prepareOut(withMark, root); // 같은 폴더 재실행은 정상
  assert.ok(fs.existsSync(path.join(withMark, MARK)));
  for (const d of [root, noMark, withMark]) fs.rmSync(d, { recursive: true, force: true });
});

t("이적 빈 도착 팀: validate 오류, 잔류의 빈 도착은 통과, pillOf 는 '새 팀 합류'(앞 공백 없음)", () => {
  const dir = tmp("blankto");
  for (const f of fixFiles()) fs.copyFileSync(path.join(FIX, f), path.join(dir, f));
  const file = path.join(dir, "transfers.json");
  const tr = JSON.parse(fs.readFileSync(file, "utf8"));
  tr.players[0].to = "";
  fs.writeFileSync(file, JSON.stringify(tr));
  const bad = spawnSync(process.execPath, [VALIDATE, dir], { encoding: "utf8" });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /transfers\.players\[0\] .*새 팀\(to\)이 비어 있습니다/);
  tr.players[0].type = "잔류(재계약)";
  fs.writeFileSync(file, JSON.stringify(tr));
  const stay = spawnSync(process.execPath, [VALIDATE, dir], { encoding: "utf8" });
  assert.equal(stay.status, 0, stay.stderr);
  fs.rmSync(dir, { recursive: true, force: true });
  assert.equal(pillOf({ moved: true, status: "이적", next: "", team: "X", conf: "C", date: T }).slice(1, 2)[0], "새 팀 합류");
});

t("validate: 비고의 없는 날짜(2/30)는 '없는 날짜' 경고", () => {
  const dir = tmp("baddate");
  for (const f of fixFiles()) fs.copyFileSync(path.join(FIX, f), path.join(dir, f));
  const file = path.join(dir, "players.json");
  const rows = JSON.parse(fs.readFileSync(file, "utf8"));
  rows[0].note = "테스트 (Sheep 2/30 12:00 UTC)";
  fs.writeFileSync(file, JSON.stringify(rows));
  const r = spawnSync(process.execPath, [VALIDATE, dir], { encoding: "utf8" });
  assert.match(r.stderr, /보도 시각 2\/30 는 없는 날짜입니다/);
  fs.rmSync(dir, { recursive: true, force: true });
});

t("테마 전환 없음: 다섯 쪽 머리와 본문에 vct-theme·data-theme-set 이 없다(저장된 값은 무시된다)", () => {
  for (const f of ["index.html", "privacy/index.html", "terms/index.html", "en/privacy/index.html", "en/terms/index.html"]) {
    const html = fs.readFileSync(new URL("../../" + f, import.meta.url), "utf8");
    assert.equal(/vct-theme|data-theme-set|theme-switch/.test(html), false, f);
  }
});

t("언어 이동 스크립트(index.html 인라인): 저장값·주소별 이동, ?stay·영문 주소 그대로, 저장소 예외는 아무것도 안 함", () => {
  const html = fs.readFileSync(new URL("../../index.html", import.meta.url), "utf8");
  const code = inlineScript(html);
  const run = (stored, pathname, search = "", hash = "") => {
    const calls = [];
    const storage = { getItem: () => { if (stored === "THROW") throw new Error("denied"); return stored; } };
    vm.runInNewContext(code, { location: { pathname, search, hash, replace: (u) => calls.push(u) }, localStorage: storage });
    return calls;
  };
  assert.deepEqual(run(null, "/VCT-board/"), []);
  assert.deepEqual(run("en", "/VCT-board/", "", "#coaches"), ["/VCT-board/en/#coaches"]);
  assert.deepEqual(run("en", "/VCT-board/p/oxy/"), ["/VCT-board/en/p/oxy/"]);
  assert.deepEqual(run("ko", "/VCT-board/en/t/cloud9/"), ["/VCT-board/t/cloud9/"]);
  assert.deepEqual(run("en", "/VCT-board/", "?stay"), []);
  assert.deepEqual(run("en", "/VCT-board/en/"), []);
  assert.deepEqual(run("THROW", "/VCT-board/p/oxy/"), []);
});

t("사이트 경로: build.mjs·dev-server.mjs·index.html 인라인 스크립트가 같은 경로를 쓴다", () => {
  const read = (f) => fs.readFileSync(new URL("../../" + f, import.meta.url), "utf8");
  const site = /const SITE_PATH = "([^"]+)"/.exec(read("scripts/build.mjs"))[1];
  const prefix = /const PREFIX = "([^"]+)"/.exec(read("scripts/dev-server.mjs"))[1];
  assert.equal(prefix, site);
  checkSitePath(read("index.html"), site);
});

t("사이트 경로 검사: 스크립트 안 경로를 바꾸고 다른 곳에 같은 글자를 두면 실패한다", () => {
  const ok = '<html><head><script>var B="/VCT-board/";</script></head><body></body></html>';
  checkSitePath(ok, "/VCT-board/");
  const moved = '<html><head><script>var B="/other/";</script></head><body>"/VCT-board/"</body></html>';
  assert.throws(() => checkSitePath(moved, "/VCT-board/"), /사이트 경로 \/VCT-board\/ 가 없습니다/);
  assert.throws(() => inlineScript("<html><body></body></html>"), /인라인 스크립트가 없습니다/);
});

t("이적 이전 팀(from) '-': 경고만 내고 오류 0", () => {
  const dir = tmp("fromdash");
  for (const f of fixFiles()) fs.copyFileSync(path.join(FIX, f), path.join(dir, f));
  const file = path.join(dir, "transfers.json");
  const tr = JSON.parse(fs.readFileSync(file, "utf8"));
  tr.players[0].from = "-";
  fs.writeFileSync(file, JSON.stringify(tr));
  const r = spawnSync(process.execPath, [VALIDATE, dir], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stderr, /transfers\.players\[0\] .*이전 팀\(from\)이 비어 있습니다/);
  assert.doesNotMatch(r.stdout + r.stderr, /오류  transfers/);
  fs.rmSync(dir, { recursive: true, force: true });
});

t("이적 빈 도착 팀(코치 쪽): validate 오류", () => {
  const dir = tmp("blankto-coach");
  for (const f of fixFiles()) fs.copyFileSync(path.join(FIX, f), path.join(dir, f));
  const file = path.join(dir, "transfers.json");
  const tr = JSON.parse(fs.readFileSync(file, "utf8"));
  tr.coaches = [{ ...tr.players[0], name: "코치테스트", to: "" }];
  fs.writeFileSync(file, JSON.stringify(tr));
  const r = spawnSync(process.execPath, [VALIDATE, dir], { encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /transfers\.coaches\[0\] .*새 팀\(to\)이 비어 있습니다/);
  fs.rmSync(dir, { recursive: true, force: true });
});

t("validate: 인물 국적 ' ' 은 빈 칸 경고", () => {
  const dir = tmp("nat-blank");
  for (const f of fixFiles()) fs.copyFileSync(path.join(FIX, f), path.join(dir, f));
  const file = path.join(dir, "people.json");
  const rows = JSON.parse(fs.readFileSync(file, "utf8"));
  rows[0].nationality = " ";
  fs.writeFileSync(file, JSON.stringify(rows));
  const r = spawnSync(process.execPath, [VALIDATE, dir], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stderr, /국적 또는 역할이 빈 칸/);
  fs.rmSync(dir, { recursive: true, force: true });
});

t("validate: 날짜 칸과 맞지 않는 비고 시각은 '날짜 칸과 맞지 않거나 그 해에 없는 날짜' 경고", () => {
  const dir = tmp("stamp-mismatch");
  for (const f of fixFiles()) fs.copyFileSync(path.join(FIX, f), path.join(dir, f));
  const file = path.join(dir, "players.json");
  const rows = JSON.parse(fs.readFileSync(file, "utf8"));
  rows[0].note = "테스트 (Sheep 10/24 16:30 UTC)";
  rows[0].date = 46300;
  fs.writeFileSync(file, JSON.stringify(rows));
  const r = spawnSync(process.execPath, [VALIDATE, dir], { encoding: "utf8" });
  assert.match(r.stderr, /보도 시각 10\/24 가 날짜 칸과 맞지 않거나 그 해에 없는 날짜입니다/);
  fs.rmSync(dir, { recursive: true, force: true });
});

t("css-check: css/style.css 가 네 가지 점검(중복·날것의 값·대비·터치)을 통과한다", () => {
  const f = checkCss(fs.readFileSync(fileURLToPath(new URL("../../css/style.css", import.meta.url)), "utf8"));
  assert.deepEqual(f, []);
});

t("css-check: 나쁜 예는 걸린다(중복 선택자, 날것의 색·px, 기본값 토큰, 낮은 대비, 작은 터치)", () => {
  const bad = (css) => checkCss(css).join("\n");
  assert.match(bad(".a{color:#fff} .a{margin:0}"), /중복 선택자: "\.a"/);
  assert.match(bad(".b{color:#fff}"), /날것의 색/);
  assert.match(bad(".b{gap:6px}"), /날것의 px/);
  assert.match(bad(".b{padding:var(--sp-2)}"), /기본값 토큰/);
  assert.match(bad(":root{--neutral-900:#FFFFFF;--neutral-50:#F7F6F2;--color-ink:var(--neutral-900);--color-bg:var(--neutral-50);--surface:var(--neutral-50);--color-mute:var(--neutral-50);--color-line-strong:var(--neutral-50);--color-accent:var(--neutral-50);--color-on-accent:var(--neutral-50);--status-open-bg:var(--neutral-50);--status-open-fg:var(--neutral-50)} @media (max-width: 600px){:root{--tap:30px}}"), /대비 부족|터치 크기/);
  // 테두리 두께 1~3px 과 컴포넌트 토큰 선언은 허용한다
  assert.deepEqual(checkCss(".c{border:2px solid var(--color-line); --gap-x: 6px; text-underline-offset: var(--link-underline-offset)} :root{--link-underline-offset:3px}").filter((x) => !/대비|터치/.test(x)), []);
});

t("견본 데이터: scripts/fixtures/styleguide/extra.json 은 시험 데이터의 모양을 따른다", () => {
  const x = JSON.parse(fs.readFileSync(fileURLToPath(new URL("../fixtures/styleguide/extra.json", import.meta.url)), "utf8"));
  for (const k of ["players", "coaches", "transfers", "watch"]) assert.ok(Array.isArray(x[k]) && x[k].length > 0, k);
  assert.ok(x.players.some((p) => p.team === ""), "빈 팀 칸");
  assert.ok(x.players.some((p) => /[가-힣]/.test(p.team)), "한글 팀 칸");
});

t("build: 배포 출력에 dev/ 가 없다", () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "vct-dev-out-"));
  const r = spawnSync(process.execPath, [fileURLToPath(new URL("../build.mjs", import.meta.url)), out], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(fs.existsSync(path.join(out, "dev")), false);
  fs.rmSync(out, { recursive: true, force: true });
});

t("영문 공유 이미지: toLang 은 og:image 를 og-en.png 로, 한국어 틀은 og.png 로 둔다", () => {
  const ko = fs.readFileSync(fileURLToPath(new URL("../../index.html", import.meta.url)), "utf8");
  assert.match(ko, /<meta property="og:image" content="https:\/\/4nhackle\.github\.io\/VCT-board\/og\.png">/);
  assert.match(toLang(ko, "en"), /<meta property="og:image" content="https:\/\/4nhackle\.github\.io\/VCT-board\/og-en\.png">/);
  assert.doesNotMatch(toLang(ko, "en"), /og\.png">/);
});

t("영문 공유 이미지: 빌드 출력에 og-en.png 가 있고 1200x630 PNG, 100KB 이하다", () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "vct-og-"));
  const r = spawnSync(process.execPath, [fileURLToPath(new URL("../build.mjs", import.meta.url)), out], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  const png = fs.readFileSync(path.join(out, "og-en.png"));
  assert.equal(png.subarray(1, 4).toString("ascii"), "PNG");
  assert.equal(png.readUInt32BE(16), 1200, "가로");
  assert.equal(png.readUInt32BE(20), 630, "세로");
  assert.ok(png.length <= 100 * 1024, "용량 " + png.length);
  const en = fs.readFileSync(path.join(out, "en", "index.html"), "utf8");
  assert.match(en, /og:image" content="[^"]*\/og-en\.png"/);
  const ko2 = fs.readFileSync(path.join(out, "p", "absol", "index.html"), "utf8");
  assert.match(ko2, /og:image" content="[^"]*\/og\.png"/);
  const enP = fs.readFileSync(path.join(out, "en", "p", "absol", "index.html"), "utf8");
  assert.match(enP, /og:image" content="[^"]*\/og-en\.png"/);
  fs.rmSync(out, { recursive: true, force: true });
});
