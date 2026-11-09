// 시험: 화면 조각(js/views/*, js/components/*).
import assert from "node:assert/strict";
import fs from "node:fs";
import { teamNameOf, buildIndex, rosterCards } from "../../js/model.js";
import { rosterHTML } from "../../js/views/roster.js";
import { splitNote, newsRow } from "../../js/views/common.js";
import { sortSchedule } from "../../js/views/schedule.js";
import { mailParts } from "../../js/views/suggest.js";
import { setLang, setEnTable } from "../../js/i18n.js";
import { KO } from "../../js/i18n/ko.js";
import { birthText, personHTML } from "../../js/views/person.js";
import { routeHTML } from "../../js/components/route.js";
import { rowHTML, resetFolds, colsHTML } from "../../js/components/row.js";
import { T, t, RT, serialOf } from "./helpers.mjs";

t("rowHTML: 계약 칸이 있으면 메타 줄 끝에 '계약 ~…'(연도는 그대로, 날짜는 ISO), 없으면 메타 줄 그대로", () => {
  setLang("ko");
  const tab = { mode: "entry", teamObj: {}, shared: new Map() };
  const base = { region: "EMEA", team: "Team", name: "Alpha", sub: "Duelist", status: "FA 진입 예정", date: T, conf: "C", note: "", src: null, pid: "alpha", tid: "team" };
  resetFolds();
  const none = rowHTML(base, tab, {});
  assert.doesNotMatch(none, /계약 ~/);
  assert.match(rowHTML({ ...base, contract: "2027" }, tab, {}), /계약 ~2027/);
  assert.match(rowHTML({ ...base, contract: T + 30 }, tab, {}), /계약 ~\d{4}-\d{2}-\d{2}/);
  resetFolds();
  assert.equal(rowHTML({ ...base, contract: "bad" }, tab, {}), none, "형식이 아니면 메타 줄을 바꾸지 않는다");
});

t("rosterHTML: 지역 거르기는 카드를 거르고, 5명 미만은 일부 표시, +·− 인원을 쓴다", () => {
  setLang("ko");
  const cards = rosterCards(buildIndex(RT), T);
  const all = rosterHTML(cards, { region: "all" });
  assert.match(all, /로스터 정보 일부/);
  assert.match(all, /<span class="in">\+0<\/span> <span class="out">−0<\/span>/, "팀 머리 +i −o 는 색 칸(.in·.out)");
  const emea = rosterHTML(cards, { region: "EMEA" });
  assert.match(emea, /Mid/);
  assert.doesNotMatch(emea, /Alpha/);
  // 목록 모양(rh·th·row roster)을 쓰고 상세 블록(dp-sec)은 쓰지 않는다.
  assert.match(all, /class="rh"/);
  assert.match(all, /class="th"/);
  assert.match(all, /class="row roster"/);
  assert.doesNotMatch(all, /dp-sec/);
  // REGIONS 밖 지역은 "기타" 머리 아래에 모인다.
  const other = rosterHTML([{ team: { id: "x1", name: "Xteam", region: "Mars" }, roster: [], inCount: 0, outCount: 0, partial: false }], { region: "all" });
  assert.match(other, /<h2>기타<\/h2>/);
});

// 로스터 검색(PR 22): 팀 이름이면 팀 전체, 인물 이름·실명이면 그 인물만, 없으면 빈 문구, 대소문자 무관.
const SR = [
  { team: { id: "t-a", name: "Alpha Esports", short: "AE", region: "EMEA", active: true }, roster: [{ id: "p1", name: "Zed", realName: "Kim Min", role: "Duelist", kind: "player" }, { id: "p2", name: "Yolo", role: "Sentinel", kind: "player" }], inCount: 1, outCount: 2, partial: true },
  { team: { id: "t-b", name: "Beta Team", region: "EMEA", active: true }, roster: [{ id: "p3", name: "Quinn", role: "Initiator", kind: "player" }], inCount: 0, outCount: 0, partial: true },
];

t("rosterHTML 검색: 팀 이름은 팀 전체, 인물 이름·실명은 그 인물만, 없으면 빈 문구, 대소문자 무관", () => {
  setLang("ko");
  const team = rosterHTML(SR, { region: "all", q: "alpha esports" });
  assert.match(team, /Yolo/, "팀이 맞으면 전체 로스터");
  assert.match(team, /<span class="in">\+1<\/span> <span class="out">−2<\/span>/, "인원 수는 팀 기준");
  assert.doesNotMatch(team, /Beta Team/);
  const person = rosterHTML(SR, { region: "all", q: "zed" });
  assert.match(person, /Zed/);
  assert.doesNotMatch(person, /Yolo/, "인물 검색은 그 인물만");
  assert.doesNotMatch(person, /Beta Team/);
  assert.match(rosterHTML(SR, { region: "all", q: "KIM MIN" }), /Zed/, "실명으로도 찾고 대소문자 무관");
  assert.match(rosterHTML(SR, { region: "all", q: "ZED" }), /Zed/);
  const none = rosterHTML(SR, { region: "all", q: "nobody-here" });
  assert.match(none, /class="empty"/);
  assert.doesNotMatch(none, /class="rh"/);
  assert.match(rosterHTML(SR, { region: "all", q: "zed" }), /<span class="n">1팀<\/span>/, "지역 머리 개수는 거른 카드 기준");
  assert.equal(rosterHTML(SR, { region: "all", q: "" }), rosterHTML(SR, { region: "all" }), "빈 검색은 거르지 않는다");
});

t("rowHTML(D3): 펼침 단추의 aria-controls 는 영역 id 와 같고, 상태 글은 영역 밖, 출처 링크는 영역 안", () => {
  setLang("ko");
  const tab = { mode: "entry", teamObj: {}, shared: new Map() };
  const it = { region: "EMEA", team: "Team", name: "Alpha", sub: "Duelist", status: "FA 진입 예정", date: T, conf: "C", note: "메모", src: ["VLR", "https://www.vlr.gg/1/x"], pid: "alpha", tid: "team" };
  resetFolds();
  const html = rowHTML(it, tab, {});
  const id = /aria-controls="([^"]+)"/.exec(html)[1];
  assert.ok(html.includes('id="' + id + '" hidden'), "펼침 영역은 같은 id 로 처음엔 숨김");
  assert.match(html, /class="lead"[^>]*>[^<]*FA 진입 예정/, "상태 글이 있다");
  assert.ok(html.indexOf('class="lead"') < html.indexOf('id="' + id + '"'), "상태 글은 펼침 영역 앞에 있다");
  assert.ok(html.indexOf("https://www.vlr.gg/1/x") > html.indexOf('id="' + id + '"'), "출처 링크는 펼침 영역 안에 있다");
});

t("rowHTML(D3): 최근 소식은 메타 줄 앞에 지역 짧은 이름, 팀별 보기에서 이동 없는 행은 —, 팀별이 아니면 팀 이름", () => {
  setLang("ko");
  const tab = { mode: "entry", teamObj: {}, shared: new Map() };
  const it = { region: "Americas", team: "Team", name: "Alpha", sub: "Duelist", status: "구직 중", date: T, conf: "C", note: "", src: null, pid: "alpha", tid: "team" };
  resetFolds();
  assert.match(rowHTML(it, tab, { region: true }), /class="meta">AMER · Duelist/);
  assert.match(rowHTML(it, tab, { noTeam: true }), /class="move"><span class="none">—<\/span><\/div>/);
  assert.match(rowHTML(it, tab, {}), /class="move"><a class="team"/, "팀별이 아니면 팀 이름");
});

t("colsHTML: 목록 머리 행은 aria-hidden 이고 사람·이동·상태·날짜 칸 이름을 가진다", () => {
  setLang("ko");
  assert.match(colsHTML(), /^<li class="cols" aria-hidden="true">/);
  assert.match(colsHTML(), /사람.*이동.*상태.*날짜/);
});

t("rowHTML: caption 이 있으면 설명글로 쓰고 출처 줄은 남김, 없거나 빈 값이면 메모 본문 그대로", () => {
  setLang("ko");
  const tab = { mode: "entry", teamObj: {}, shared: new Map() };
  const base = { region: "EMEA", team: "Team", name: "Alpha", sub: "Duelist", status: "FA 진입 예정", date: T, conf: "C", note: "긴 메모 본문", src: ["VLR", "https://www.vlr.gg/1/x"], pid: "alpha", tid: "team" };
  const withCap = rowHTML({ ...base, caption: "한 줄 요약" }, tab, {});
  assert.match(withCap, /한 줄 요약/);
  assert.doesNotMatch(withCap, /긴 메모 본문/);
  assert.match(withCap, /https:\/\/www\.vlr\.gg\/1\/x/, "출처 링크는 그대로");
  resetFolds();
  const noCap = rowHTML(base, tab, {});
  assert.match(noCap, /긴 메모 본문/);
  resetFolds();
  assert.equal(rowHTML({ ...base, caption: "" }, tab, {}), noCap, "빈 caption 은 없는 것과 같다");
  resetFolds();
  assert.equal(rowHTML({ ...base, caption: "-" }, tab, {}), noCap, "'-' caption 은 빈 칸이다");
});

t("rowHTML(지켜볼 팀): 첫 조각만 보이고 나머지와 출처는 펼침 영역에, 조각도 출처도 없으면 단추가 없다", () => {
  setLang("ko");
  resetFolds();
  const tab = { mode: "watch", teams: new Set() };
  const html = rowHTML({ team: "Team A", name: "대상", note: "A 갱신 / B 이전 (확인 11/8)", src: ["출처", "https://example.com/x"] }, tab, {});
  const [visible, fold] = html.split('<div class="row-fold"');
  assert.ok(visible.includes("A 갱신") && !visible.includes("B 이전"), "첫 조각만 보인다");
  assert.ok(fold.includes("B 이전") && fold.includes("https://example.com/x"), "나머지와 출처는 펼침 영역");
  assert.equal((html.match(/class="row-x"/g) || []).length, 1, "단추는 하나");
  resetFolds();
  const one = rowHTML({ team: "Team A", name: "대상", note: "A 만", src: null }, tab, {});
  assert.ok(!one.includes("row-x") && !one.includes("row-fold"), "조각도 출처도 없으면 단추와 영역이 없다");
});

t("personHTML: 연도만 있는 계약 만료는 날짜 없이 '2027년까지'", () => {
  setLang("ko");
  const D = { sources: {}, players: [], coaches: [], transfers: { players: [], coaches: [] }, watch: [], teams: [], people: [{ id: "p1", name: "Alpha", kind: "player", role: "Duelist", nationality: "Japan", contractUntil: "2027" }] };
  const { html } = personHTML("p1", buildIndex(D));
  assert.match(html, /2027년까지/);
});

t("birthText: 날짜·연도만·미성년 경계(만 18세 생일 어제·당일·내일), 빈 값, 영문 표기", () => {
  setLang("ko");
  assert.equal(birthText("2002-05-21", T), "2002-05-21 (24세)");
  assert.equal(birthText("2002", T), "2002년 (약 24세)");
  assert.equal(birthText("2008-10-31", T), "2008-10-31 (18세)"); // 만 18세 생일 당일: 날짜 공개
  assert.equal(birthText("2008-10-30", T), "2008-10-30 (18세)"); // 어제가 생일: 날짜 공개
  assert.equal(birthText("2008-11-01", T), "2008년 (17세)"); // 내일이 생일: 미성년, 연도만
  assert.equal(birthText("2009", T), "2009년 (약 17세)");
  assert.equal(birthText("", T), "");
  assert.equal(birthText(undefined, T), "");
  setLang("en");
  assert.equal(birthText("2002-05-21", T), "May 21, 2002 (age 24)");
  assert.equal(birthText("2002", T), "2002 (about 24)");
  assert.equal(birthText("2008-11-01", T), "2008 (age 17)");
  setLang("ko");
});

t("mailParts: 제목은 접두어+유형, 본문은 글·근거 링크·바닥글 순서, 링크가 없으면 근거 줄 없음", () => {
  setLang("ko");
  const withLink = mailParts("정보 오류", "본문", "https://x.test/a");
  assert.equal(withLink.subject, KO["form.subjectPrefix"] + "정보 오류");
  assert.ok(withLink.body.startsWith("본문"));
  assert.ok(withLink.body.includes("\n\n" + KO["form.linkLabel"] + "https://x.test/a"));
  assert.ok(withLink.body.endsWith("\n\n" + KO["form.footer"]));
  const bare = mailParts("정보 오류", "본문", "");
  assert.equal(bare.body, "본문\n\n" + KO["form.footer"]);
  assert.ok(!bare.body.includes(KO["form.linkLabel"]));
});

t("rosterHTML: 로스터 행에는 보도(pill·reported) 표시가 없다", () => {
  setLang("ko");
  const html = rosterHTML([{ team: { id: "b", name: "B", region: "EMEA", active: true }, roster: [{ id: "p1", name: "P1", kind: "player", role: "Duelist" }], inCount: 1, outCount: 0, partial: true }], { region: "all" });
  assert.doesNotMatch(html, /pill|보도|reported/);
});

t("splitNote: 끝의 출처·시각(UTC→KST)과 교차 확인을 떼고 본문은 남김", () => {
  const r = splitNote("Sentinels 공식 X 방출 발표(VLR·Strafe 원문 확인). 2026.3 G2에서 합류, 8개월 만에 이탈. 교차 확인: VLR, Strafe, Liquipedia 이적 로그(10/30) (Sentinels X 10/31 00:15 UTC)");
  assert.equal(r.body, "Sentinels 공식 X 방출 발표(VLR·Strafe 원문 확인). 2026.3 G2에서 합류, 8개월 만에 이탈.");
  assert.deepEqual(r.src, { name: "Sentinels X", when: "10/31 오전 9:15" });
  assert.deepEqual(r.cross, ["VLR", "Strafe", "Liquipedia 이적 로그(10/30)"]);
});

t("splitNote: 날짜 넘김·연말·KST 그대로·문장 가운데 교차 확인", () => {
  assert.equal(splitNote("a (Sentinels X 10/30 20:31 UTC)").src.when, "10/31 오전 5:31");
  assert.equal(splitNote("a (X 12/31 20:00 UTC)").src.when, "1/1 오전 5:00");
  assert.equal(splitNote("a (GM X 10/25 18:35 KST)").src.when, "10/25 오후 6:35");
  const r = splitNote("LOUD 챔피언. 교차 확인: Sheep(10/28), TheSpike. 팀 공식 발표 전 (TheSpike 10/29 16:13 UTC)");
  assert.equal(r.body, "LOUD 챔피언. 팀 공식 발표 전");
  assert.deepEqual(r.cross, ["Sheep(10/28)", "TheSpike"]);
});

t("splitNote: 규칙에 안 맞는 글은 원문 그대로, 빈 값", () => {
  const raw = "Barça 2027 합류 보도(Sheep), 공식 발표 전 (갱신 10/31 23:58 UTC, 보도 시각 미확인)";
  assert.deepEqual(splitNote(raw), { body: raw, src: null, cross: null });
  assert.deepEqual(splitNote("Sheep 10/25 15:44 UTC / 결별"), { body: "Sheep 10/25 15:44 UTC / 결별", src: null, cross: null });
  assert.equal(splitNote("a (X 13/40 25:00 UTC)").src, null);
  assert.deepEqual(splitNote(undefined), { body: "", src: null, cross: null });
});

// P2 일정: 시작일 순. 기준일 2026-11-01(46327)로 고정한다.
const S0 = 46327;

const sch = (date, title) => ({ date, title, source: "s" });

t("sortSchedule: 현재 일정과 같은 꼴 10행이 시작일 순(Pacific 1/11 이 4개 지역 1/14 보다 앞)", () => {
  const rows = [sch("2027-01-14 ~ 02-07", "4개 지역 Kickoff"), sch("2027-01-11 ~ 01-31", "VCT Pacific Kickoff"), sch(46328, "2026 시즌 종료"),
    sch("11/5 ~ 11/8", "Americas 오픈 예선"), sch("11/25 ~ 12/5", "유럽 예선"), sch(46329, "FA 본격 개시"), sch("12/1", "12월 행사"),
    sch("미정", "날짜 미정"), sch(46328, "Cloud9 발표"), sch("2026-12-20 ~ 12-22", "연말 행사")];
  assert.deepEqual(sortSchedule(rows, S0).map(r => r.title), ["2026 시즌 종료", "Cloud9 발표", "FA 본격 개시", "Americas 오픈 예선", "유럽 예선", "12월 행사", "연말 행사", "VCT Pacific Kickoff", "4개 지역 Kickoff", "날짜 미정"]);
});

t("sortSchedule: 연도 없는 11/2 와 2027 연도 있는 날짜가 섞여도 순서가 맞음", () => {
  const rows = [sch("2027-01-11 ~ 01-31", "b"), sch("11/2", "a")];
  assert.deepEqual(sortSchedule(rows, S0).map(r => r.title), ["a", "b"]);
});

t("sortSchedule: 날짜를 못 읽은 행은 맨 뒤, 같은 시작일은 끝일 순·원래 순서", () => {
  const rows = [sch("미정", "A"), sch(46330, "B"), sch("11/2 ~ 11/3", "C"), sch(46330, "D")];
  assert.deepEqual(sortSchedule(rows, S0).map(r => r.title), ["C", "B", "D", "A"]);
});

t("splitNote: 출처 이름·시각 분리, 교차 확인 분리, 범위 밖 시각은 원문 그대로", () => {
  const a = splitNote("LFT 게시. 교차 확인: VLR, Rib. (Sheep 10/24 16:30 UTC)");
  assert.deepEqual(a.src, { name: "Sheep", when: "10/25 오전 1:30" });
  assert.deepEqual(a.cross, ["VLR", "Rib"]);
  assert.equal(a.body, "LFT 게시.");
  const b = splitNote("메모 (A 13/1 10:00 UTC)");
  assert.equal(b.src, null);
  assert.equal(b.body, "메모 (A 13/1 10:00 UTC)");
  assert.equal(splitNote("").body, "");
});

t("newsRow (F-01): 같은 보도 시각이 날짜 줄과 출처 줄에 두 번 나오지 않는다", () => {
  const count = (html) => html.split("오전 1:30").length - 1;
  const withSrc = newsRow({ kind: "player", item: { name: "A", team: "Sentinels", date: serialOf(2026, 10, 25), note: "LFT 게시 (Sheep 10/24 16:30 UTC)", status: "LFT 게시", src: ["Sheep", null], conf: "R" } }, false);
  assert.equal(count(withSrc), 1);
  assert.match(withSrc, /Sheep <time>10\/25 오전 1:30<\/time>/);
  const noSrc = newsRow({ kind: "player", item: { name: "A", team: "Sentinels", date: serialOf(2026, 10, 25), note: "발표 10/24 16:30 UTC", status: "LFT 게시", src: null, conf: "R" } }, false);
  assert.equal(count(noSrc), 1);
});

t("경로 줄: 한국어 출력은 예전과 같고, 영문은 낭독 글 'from A to B' 순서로 읽힌다", () => {
  const r = { kind: "move", from: "A", fromId: "", to: "B", toId: "", stage: "confirmed" };
  assert.equal(routeHTML(r), '<span class="route"><span class="r-from">A</span><span class="r-next"><span class="sr">에서</span><span class="r-arrow" aria-hidden="true">→</span> <span class="r-to">B</span><span class="sr">로</span></span></span>');
  setLang("en");
  try {
    const en = routeHTML(r);
    assert.ok(en.includes('<span class="sr">from </span><span class="r-from">A</span>'));
    assert.ok(en.includes('<span class="sr">to </span><span class="r-to">B</span>'));
  } finally {
    setLang("ko");
  }
});

t("영문 행: 한글은 lang=ko 안에만 있다(비고·상태·팀 칸)", () => {
  setLang("en");
  try {
    const tab = { mode: "entry", teamObj: {}, shared: new Map() };
    const rows = [
      { region: "Americas", team: "(은퇴 · 전 Sentinels)", name: "TenZ", sub: "-", status: "LFT 게시", date: T - 1, conf: "C", note: "2024 은퇴, 현재 T1 콘텐츠 크리에이터. 복귀 확정 아님", src: ["Inven Global", "https://example.com"], pid: "tenz", tid: "" },
      { region: "Americas", team: "Cloud9", name: "OXY", sub: "Duelist, United States", status: "계약 완료(Sentinels)", date: T - 1, conf: "R", note: "C9 3년 만에 이탈, SEN 합류 보도.", src: ["Sheep Esports", null], pid: "oxy", tid: "cloud9" },
      { region: "Americas", team: "FURIA", name: "eeiu", sub: "-", status: "팀 이탈(PRX 공식 발표) · 새 팀 미발표", date: T - 1, conf: "R", note: "", src: null, pid: "eeiu", tid: "furia" }
    ];
    for (const it of rows) {
      const html = rowHTML(it, tab, {});
      const outside = html.replace(/<span lang="ko"[^>]*>[^<]*<\/span>/g, "").replace(/<[^>]+>/g, "");
      assert.equal(/[가-힣]/.test(outside), false, "lang=ko 밖의 한글: " + outside);
    }
  } finally {
    setLang("ko");
  }
});

t("영문 행: 번역된 비고는 한글 없이 나온다(lang=ko 밖의 한글 0)", () => {
  const key = "C9 3년 만에 이탈, SEN 합류 보도. 계약은 C9 2028까지. 공식 발표 전 (Sheep 10/24 16:30 UTC)";
  setEnTable(JSON.parse(fs.readFileSync(new URL("../../data/i18n-en.json", import.meta.url), "utf8")));
  setLang("en");
  try {
    const html = rowHTML({ region: "Americas", team: "Cloud9", name: "OXY", sub: "Duelist", status: "계약 완료(Sentinels)", date: T - 1, conf: "R", note: key, src: ["Sheep Esports", null], pid: "oxy", tid: "cloud9" }, { mode: "entry", teamObj: {}, shared: new Map() }, {});
    assert.ok(html.includes("Left C9 after 3 years"), "번역 문장이 나와야 한다");
    const outside = html.replace(/<span lang="ko"[^>]*>[^<]*<\/span>/g, "").replace(/<[^>]+>/g, "");
    assert.equal(/[가-힣]/.test(outside), false, "lang=ko 밖의 한글: " + outside);
  } finally {
    setLang("ko");
    setEnTable({});
  }
});

t("빈 칸 일괄: 국적 ' ' 인 행의 메타에 ' · ' 가 남지 않고, 이름 ' ' 인 팀의 제목은 팀 id", () => {
  const html = rowHTML({ region: "Americas", team: "Cloud9", name: "X", sub: "Duelist,  ", status: "구직 중", date: T, conf: "C", note: "", src: null, pid: "x", tid: "cloud9" }, { mode: "entry", teamObj: {}, shared: new Map() }, {});
  assert.ok(html.includes('<span class="meta">Duelist</span>'), "메타: " + html.slice(html.indexOf('class="meta"'), html.indexOf('class="meta"') + 60));
  assert.equal(teamNameOf("fx-id", [{ kind: "player", item: { team: " " } }]), "fx-id");
  assert.equal(teamNameOf("fx-id", [{ kind: "player", item: { team: "Cloud9" } }]), "Cloud9");
});
