// 시험: 주소 읽기·거르기 값·클릭 동작(js/state.js).
import assert from "node:assert/strict";
import { cls } from "../../js/model.js";
import { parseRoute, filtersOf, queryOf, listAction, clickAction, applyButton } from "../../js/state.js";
import { t } from "./helpers.mjs";

t("주소: 거르기 값은 ?뒤에서 읽고, 잘못된 값은 기본으로 돌아가며, 기본값은 주소에 쓰지 않는다", () => {
  const B = "/VCT-board/";
  assert.deepEqual(parseRoute({ pathname: B, hash: "#today?pos=Duelist&days=3" }, B), { view: "list", tab: "today" });
  assert.deepEqual(filtersOf({ hash: "#today?pos=Duelist&days=3&top=1" }), { pos: "Duelist", days: "3", top: true, order: "team" });
  assert.deepEqual(filtersOf({ hash: "#today?pos=Bogus&days=5&top=0" }), { pos: "all", days: "all", top: false, order: "team" });
  assert.deepEqual(filtersOf({ hash: "#players" }), { pos: "all", days: "all", top: false, order: "team" });
  assert.equal(queryOf({ pos: "all", days: "all", top: false }), "");
  assert.equal(queryOf({ pos: "Flex", days: "0", top: true }), "?pos=Flex&days=0&vct=1");
  assert.deepEqual(filtersOf({ hash: "#players?vct=1" }), { pos: "all", days: "all", top: true, order: "team" });
  assert.deepEqual(filtersOf({ hash: "#players?top=1&days=3" }), { pos: "all", days: "3", top: true, order: "team" }, "옛 주소 top=1 도 켠다");
  assert.deepEqual(filtersOf({ hash: "#players?vct=0&top=junk" }), { pos: "all", days: "all", top: false, order: "team" }, "엉뚱한 값은 무시");
  assert.equal(queryOf({ pos: "all", days: "all", top: true }), "?vct=1", "top=1 은 쓰지 않는다");
  assert.deepEqual(filtersOf({ hash: "#players?stage=confirmed&days=3" }), { pos: "all", days: "3", top: false, order: "team" }, "옛 stage 주소는 무시");
  assert.equal(queryOf({ pos: "all", days: "all", top: false, stage: "confirmed" }), "", "stage 는 주소에 쓰지 않는다");
  // 최근 소식순(sort=recent): 주소에 있으면 recent, 그 밖은 team. 쓸 때는 vct 뒤에 붙고, team 이면 붙지 않는다.
  assert.equal(filtersOf({ hash: "#players?sort=recent" }).order, "recent");
  assert.equal(filtersOf({ hash: "#players?sort=junk" }).order, "team", "엉뚱한 값은 팀별");
  assert.equal(queryOf({ pos: "all", days: "all", top: false, order: "recent" }), "?sort=recent");
  assert.equal(queryOf({ pos: "Flex", days: "3", top: true, order: "recent" }), "?pos=Flex&days=3&vct=1&sort=recent");
  assert.equal(queryOf({ pos: "all", days: "all", top: false, order: "team" }), "", "팀별은 주소에 쓰지 않는다");
});

t("listAction: 상세 복귀·다른 탭은 full, 같은 탭·같은 거르기는 none, 같은 탭·거르기 변경은 refilter, 없는 탭은 none", () => {
  const cur = { pos: "all", days: "all", top: false };
  const same = { ...cur };
  const duel = { ...cur, pos: "Duelist" };
  assert.equal(listAction("person", "players", "players", true, cur, same), "full");
  assert.equal(listAction("list", "players", "coaches", true, cur, same), "full");
  assert.equal(listAction("list", "players", "players", true, cur, same), "none");
  assert.equal(listAction("list", "players", "players", true, cur, duel), "refilter");
  assert.equal(listAction("list", "players", "players", true, { ...cur, order: "team" }, { ...cur, order: "recent" }), "refilter", "정렬만 바뀌어도 다시 그린다");
  assert.equal(listAction("list", "players", "nope", false, cur, same), "none");
});

// 가짜 요소: clickAction 이 쓰는 선택자(a[href], li.row, .row-x, button, select, input, .row-fold, :scope > .row-x)만 안다.
const fakeEl = (tag, cls = [], parent = null, attrs = {}) => {
  const el = { tag, cls, attrs, parent, kids: [] };
  if (parent) parent.kids.push(el);
  const match = (n, s) => { const m = /^([a-z]*)(?:\.([\w-]+))?(?:\[(\w+)\])?$/.exec(s); return !!m && (!m[1] || n.tag === m[1]) && (!m[2] || n.cls.includes(m[2])) && (!m[3] || m[3] in n.attrs); };
  el.closest = (sels) => { for (let n = el; n; n = n.parent) if (sels.split(",").some((s) => match(n, s.trim()))) return n; return null; };
  el.querySelector = (s) => el.kids.find((k) => match(k, s.replace(":scope > ", ""))) || null;
  return el;
};

t("clickAction: 행 안의 링크는 링크, 행의 빈 곳·펼침 단추는 펼침, 펼침 영역의 단추는 단추, 나머지는 기존대로", () => {
  const row = fakeEl("li", ["row"]);
  const rowX = fakeEl("button", ["row-x"], row);
  const name = fakeEl("a", [], row, { href: "/p/x/" });
  const sel = fakeEl("select", [], row);
  const plain = fakeEl("div", [], row);
  const fold = fakeEl("div", ["row-fold"], row);
  const foldBtn = fakeEl("button", [], fold);
  const rowNoX = fakeEl("li", ["row"]);
  const rowNoXText = fakeEl("div", [], rowNoX);
  const tab = fakeEl("button", ["tab"]);
  const text = fakeEl("span", []);
  const kind = (el) => { const r = clickAction(el); return r ? r.kind : null; };
  assert.equal(kind(name), "link", "행 안의 링크는 링크(행 펼침 아님)");
  assert.equal(kind(plain), "row", "펼침 단추가 있는 행의 빈 곳은 펼침");
  assert.equal(kind(rowX), "row", "펼침 단추 자체는 펼침(단추 아님)");
  assert.equal(kind(foldBtn), "button", "펼침 영역 안의 단추는 단추");
  assert.equal(kind(sel), null, "행 안의 선택 칸은 아무 것도 아님");
  assert.equal(kind(rowNoXText), null, "펼침 단추가 없는 행의 빈 곳은 아무 것도 아님");
  assert.equal(kind(tab), "button", "행 밖의 탭 단추는 단추");
  assert.equal(kind(text), null, "행 밖 글자는 아무 것도 아님");
  assert.equal(clickAction(name).el, name, "고른 요소를 그대로 돌려준다");
});

// 상태 단추(applyButton): 화면을 그리지 않고 상태 규칙만 본다. data 는 버튼의 dataset 모양이다.
t("applyButton: 탭 단추는 탭을 바꾸고, 같은 탭이면 tabChanged 가 거짓", () => {
  const s = { tab: "players", region: "all", status: "all", top: false, order: "team" };
  assert.deepEqual(applyButton(s, { tab: "coaches" }), { tabChanged: true, filterChanged: false });
  assert.equal(s.tab, "coaches");
  assert.deepEqual(applyButton(s, { tab: "coaches" }), { tabChanged: false, filterChanged: false });
});

t("applyButton: 지역·상태 단추는 그 값을 쓰고 filterChanged 는 거짓", () => {
  const s = { tab: "players", region: "all", status: "all", top: false, order: "team" };
  assert.deepEqual(applyButton(s, { region: "EMEA" }), { tabChanged: false, filterChanged: false });
  assert.equal(s.region, "EMEA");
  assert.deepEqual(applyButton(s, { status: "open" }), { tabChanged: false, filterChanged: false });
  assert.equal(s.status, "open");
});

t("applyButton: 파트너 단추는 top 을 뒤집고, 정렬 단추는 recent 와 team 을 오가며, 둘 다 filterChanged 가 참", () => {
  const s = { tab: "players", region: "all", status: "all", top: false, order: "team" };
  assert.deepEqual(applyButton(s, { partner: "1" }), { tabChanged: false, filterChanged: true });
  assert.equal(s.top, true);
  assert.deepEqual(applyButton(s, { order: "1" }), { tabChanged: false, filterChanged: true });
  assert.equal(s.order, "recent");
  assert.deepEqual(applyButton(s, { order: "1" }), { tabChanged: false, filterChanged: true });
  assert.equal(s.order, "team");
});

t("applyButton: 맨 위로 단추(top)와 빈 dataset 은 null 을 돌리고 상태를 그대로 둔다", () => {
  const s = { tab: "players", region: "all", status: "all", top: false, order: "team" };
  const before = JSON.stringify(s);
  assert.equal(applyButton(s, { top: "1" }), null);
  assert.equal(applyButton(s, {}), null);
  assert.equal(JSON.stringify(s), before);
});

t("parseRoute: 목록·인물·팀·끝 슬래시 없음·잘못된 ID", () => {
  const B = "/VCT-board/";
  assert.deepEqual(parseRoute({ pathname: B, hash: "#players" }, B), { view: "list", tab: "players" });
  assert.deepEqual(parseRoute({ pathname: B + "p/oxy/", hash: "" }, B), { view: "person", id: "oxy" });
  assert.deepEqual(parseRoute({ pathname: B + "t/sentinels", hash: "" }, B), { view: "team", id: "sentinels" });
  assert.deepEqual(parseRoute({ pathname: B + "p/OXY/", hash: "" }, B), { view: "notfound" });
  assert.deepEqual(parseRoute({ pathname: B + "p/a%E0%A4%A/", hash: "" }, B), { view: "notfound" });
  assert.deepEqual(parseRoute({ pathname: B + "p/oxy/extra/", hash: "" }, B), { view: "notfound" });
});

t("주소: 영문 주소(en/ 기준)도 인물·팀·목록·없는 주소로 읽는다", () => {
  const base = "/VCT-board/en/";
  assert.deepEqual(parseRoute({ pathname: "/VCT-board/en/p/oxy/", hash: "" }, base), { view: "person", id: "oxy" });
  assert.deepEqual(parseRoute({ pathname: "/VCT-board/en/t/cloud9", hash: "" }, base), { view: "team", id: "cloud9" });
  assert.deepEqual(parseRoute({ pathname: "/VCT-board/en/", hash: "#coaches" }, base), { view: "list", tab: "coaches" });
  assert.deepEqual(parseRoute({ pathname: "/VCT-board/en/p/BAD/", hash: "" }, base), { view: "notfound" });
});
