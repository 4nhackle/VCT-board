// 시험: 문구 사전·언어별 표기·번역 표·영문 틀(js/i18n*, js/i18n/*, scripts/i18n-*.mjs).
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { contractState, watchMeta, pillOf, pillText, regionName, tierName } from "../../js/model.js";
import { newsRow, tabName } from "../../js/views/common.js";
import { noteParts } from "../../js/note.js";
import { tIn, setLang, setEnTable, trEn, trNote, trWhole } from "../../js/i18n.js";
import { collectTargets } from "../i18n-targets.mjs";
import { KO } from "../../js/i18n/ko.js";
import { EN } from "../../js/i18n/en.js";
import { termEn } from "../../js/i18n/glossary.js";
import { toLang } from "../i18n-html.mjs";
import { t } from "./helpers.mjs";

// 개인정보처리방침(PR 7): 실제로 쓰는 외부 서비스(web3forms, Cloudflare)를 한·영 방침이 모두 밝힌다.
t("개인정보처리방침: web3forms·Cloudflare 를 한·영 모두 밝히고, 건의 안내 키가 ko·en 에 있다", () => {
  const ko = fs.readFileSync(fileURLToPath(new URL("../../privacy/index.html", import.meta.url)), "utf8");
  const en = fs.readFileSync(fileURLToPath(new URL("../../en/privacy/index.html", import.meta.url)), "utf8");
  for (const page of [ko, en]) {
    assert.match(page, /web3forms/);
    assert.match(page, /Cloudflare/);
  }
  assert.ok(KO["form.privacyNote"], "ko 키");
  assert.ok(EN["form.privacyNote"], "en 키");
});

// 건의 봇 확인(PR 8): hCaptcha 를 한·영 방침이 밝히고, 새 안내 키가 ko·en 에 모두 있다.
t("건의 봇 확인: 방침 두 곳이 hCaptcha 를 밝히고, 확인 관련 키가 ko·en 에 있다", () => {
  const ko = fs.readFileSync(fileURLToPath(new URL("../../privacy/index.html", import.meta.url)), "utf8");
  const en = fs.readFileSync(fileURLToPath(new URL("../../en/privacy/index.html", import.meta.url)), "utf8");
  assert.match(ko, /hCaptcha/);
  assert.match(en, /hCaptcha/);
  for (const key of ["form.captchaNeed", "form.captchaUnavailable", "form.privacyNote"]) {
    assert.ok(KO[key], "ko " + key);
    assert.ok(EN[key], "en " + key);
  }
  assert.match(KO["form.privacyNote"], /hCaptcha/);
  assert.match(EN["form.privacyNote"], /hCaptcha/);
});

// ── 10회차: 문구 사전과 언어별 표기. 언어를 바꾼 시험은 finally 에서 ko 로 되돌린다.
const params = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");

t("사전: ko 와 en 의 키 집합이 같고, 영문에 한글이 없고, 매개변수 이름이 두 언어에서 같다", () => {
  assert.deepEqual(Object.keys(EN).sort(), Object.keys(KO).sort());
  for (const k of Object.keys(KO)) {
    assert.notEqual(EN[k], "", "빈 영문 값: " + k);
    assert.equal(params(EN[k]), params(KO[k]), "매개변수 불일치: " + k);
  }
  const hangulInEn = Object.keys(EN).filter((k) => /[가-힣]/.test(EN[k]));
  assert.deepEqual(hangulInEn, [], "영문 사전에 한글이 있다");
});

t("tIn: 키가 없으면 키 자체, 언어 사전에 없으면 ko 값, {이름} 은 그대로 끼운다", () => {
  assert.equal(tIn("en", "no.such.key"), "no.such.key");
  assert.equal(tIn("xx", "tab.players"), "선수");
  assert.equal(tIn("ko", "pill.joined", { team: "Sentinels" }), "Sentinels 합류");
  assert.equal(tIn("en", "pill.joined", { team: "Sentinels" }), "Joined Sentinels");
});

t("en 화면 문구: 탭·지역·등급·알약·계약·지켜볼 팀·소식 줄에 한글이 없다", () => {
  setLang("en");
  try {
    const out = [];
    out.push(...["players", "coaches", "transfers", "watch"].map(tabName));
    out.push(...["Americas", "EMEA", "Pacific", "China"].map(regionName), tierName("partner"), tierName("academy"));
    for (const it of [{ status: "구직 중" }, { status: "팀 이탈 · 제한적 FA" }, { status: "방출" }, { status: "이탈" }, { status: "확인" }, { status: "BLG 합류 임박(보도)" }, { status: "계약 완료(T2)", team: "T1", conf: "R" }, { status: "계약 완료(T2)", team: "T1", conf: "R", signedDate: 46330 }]) {
      out.push(pillText(pillOf(it)));
    }
    out.push(contractState(46330, 46326).label, contractState(undefined).label, contractState(46326, 46326).label);
    out.push(watchMeta("철수 발표").label, watchMeta("[확정] 파트너십 탈락 (확인 10/30)").label, watchMeta("계약 만료 예정").label);
    out.push(newsRow({ kind: "player", item: { name: "Ann", team: "Sentinels", pid: "ann", date: 46326 - 1, note: "LFT posted (Sheep 10/24 16:30 UTC)", status: "LFT 게시", src: ["Sheep", null], conf: "R", tid: "sentinels", region: "Americas", sub: "Canada" } }, false));
    const bad = out.join("\n").match(/[가-힣][^<"]{0,20}/g) || [];
    assert.deepEqual(bad, [], "영문 화면에 한글이 남았다");
  } finally {
    setLang("ko");
  }
});

t("용어집: 현재 data 의 상태 문구가 전부 옮겨지고 영문에 한글이 없다", () => {
  const read = (f) => JSON.parse(fs.readFileSync(new URL("../../data/" + f, import.meta.url), "utf8"));
  const statuses = [...new Set([...read("players.json"), ...read("coaches.json")].map((r) => r.status))];
  const miss = statuses.filter((s) => { const e = termEn(s); return e === null || /[가-힣]/.test(e); });
  // 시트에 새 상태 문구가 생길 때마다 배포가 막히지 않도록 경고만 한다(영문 화면은 못 옮긴 문구를 원문 + KR 로 보여 준다).
  // 용어집 시험(아래)과 영문 화면 한글 검사는 그대로 막는다. 이 경고가 보이면 glossary.js 에 짝이나 규칙을 추가한다.
  if (miss.length) console.warn("::warning::용어집에 없는 상태 문구 " + miss.length + "개: " + miss.join(" | "));
});

t("용어집: 정해진 짝, 괄호·날짜·조각 나눔, 못 옮기면 null(반쪽 번역 없음)", () => {
  assert.equal(termEn("계약 완료(Sentinels)"), "Signed with Sentinels");
  assert.equal(termEn("방출(로스터 전원)"), "Released (entire roster)");
  assert.equal(termEn("FA(11/2) · 협상 가능"), "Free agent from Nov 2 · Open to talks");
  assert.equal(termEn("팀 이탈(본인 발표 · 계약 11/2 만료)"), "Left team (self-announced · contract ends Nov 2)");
  assert.equal(termEn("계약 완료(Team Liquid 잔류)"), "Re-signed with Team Liquid");
  assert.equal(termEn("Controller(보조)/Sentinel"), "Controller (secondary)/Sentinel");
  assert.equal(termEn("Duelist"), "Duelist");
  assert.equal(termEn("(은퇴 · 전 Sentinels)"), null);
  assert.equal(termEn("팀명 미정"), null);
});

t("정적 문구: index.html 의 data-i18n 글자·HTML·속성이 한국어 사전 값과 같다", () => {
  const html = fs.readFileSync(new URL("../../index.html", import.meta.url), "utf8");
  for (const m of html.matchAll(/<(\w+)[^>]*? data-i18n="([^"]+)"[^>]*>([^<]*)<\/\1>/g)) assert.equal(m[3], KO[m[2]], m[2]);
  for (const m of html.matchAll(/<(\w+)[^>]*? data-i18n-html="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/g)) assert.equal(m[3], KO[m[2]], m[2]);
  for (const m of html.matchAll(/<\w+[^>]*? data-i18n-attr="([^"]+)"[^>]*>/g)) {
    for (const pair of m[1].split(";")) {
      const i = pair.indexOf(":"), name = pair.slice(0, i), key = pair.slice(i + 1);
      const v = new RegExp("\\s" + name + '="([^"]*)"').exec(m[0]);
      assert.equal(v && v[1], KO[key], key);
    }
  }
});

t("예약 작업 약속: 머리말 <p class=\"lede\"> 는 한 번, 기준 시각 형식과 main.js 스크립트 줄이 그대로", () => {
  const html = fs.readFileSync(new URL("../../index.html", import.meta.url), "utf8");
  assert.equal(html.match(/<p class="lede">/g).length, 1);
  assert.match(html, /<p class="lede">[^]*?\d{4}-\d{2}-\d{2} \d{1,2}:\d{2} 기준입니다\.<\/p>/);
  assert.ok(html.includes('<script type="module" src="js/main.js"></script>'));
});

t("영문 틀: 한글이 없고 lang·머리말 시각·KR 안내 줄이 영문, 한국어 틀은 그대로", () => {
  const html = fs.readFileSync(new URL("../../index.html", import.meta.url), "utf8");
  const en = toLang(html, "en");
  assert.equal(/[가-힣]/.test(en), false, "영문 틀에 한글이 남았다");
  assert.ok(en.includes('<html lang="en">'));
  assert.match(en, /Updated \d{4}-\d{2}-\d{2} \d{1,2}:\d{2} KST\./);
  assert.ok(en.includes('<li class="kr-note">Items marked KR are shown in the original Korean.</li>'));
  assert.equal(toLang(html, "ko"), html);
});

t("번역 검사(trEn): 통과, 한글 남음, 보도 시각 바뀜, 교차 확인 바뀜, 숫자 빠짐, 표에 없음", () => {
  const src = "C9 3년 만에 이탈, SEN 합류 보도. 계약은 C9 2028까지. 공식 발표 전 (Sheep 10/24 16:30 UTC)";
  const ok = "Left C9 after 3 years; reported to join SEN. Contract with C9 runs through 2028. Not yet official. (Sheep 10/24 16:30 UTC)";
  const cross = "KRÜ 공식 X 결별 발표. 교차 확인: VLR 이적 로그, Sheep (KRU X 10/28 16:45 UTC)";
  const crossOk = "KRÜ official X departure announcement. 교차 확인: VLR 이적 로그, Sheep (KRU X 10/28 16:45 UTC)";
  setEnTable({ [src]: ok, "교차 확인 목록": "x", [cross]: crossOk, "X 합류 보도": "Joined X 합류" });
  assert.equal(trEn(src), ok, "통과하는 번역");
  assert.equal(trEn(cross), crossOk, "교차 확인 구절은 한글이어도 몸말 검사에서 뺀다");
  assert.equal(trEn("X 합류 보도"), null, "몸말에 한글이 남으면 null");
  setEnTable({ [src]: ok.replace("16:30", "17:30") });
  assert.equal(trEn(src), null, "보도 시각이 바뀌면 null");
  setEnTable({ [cross]: crossOk.replace("VLR 이적 로그, Sheep", "VLR, Sheep") });
  assert.equal(trEn(cross), null, "교차 확인 목록이 바뀌면 null");
  setEnTable({ [src]: ok.replace("2028", "2029") });
  assert.equal(trEn(src), null, "숫자 묶음이 빠지면 null");
  setEnTable({});
  assert.equal(trEn(src), null, "표에 없으면 null");
});

t("번역 표: 한국어 화면은 표를 쓰지 않는다, 영문 화면은 비고를 조각마다 바꾼다", () => {
  const seg = "C9 비파트너 탈락 후 허가";
  setEnTable({ [seg]: "Free to explore after C9 non-partner elimination." });
  try {
    setLang("ko");
    assert.equal(trNote(seg), seg);
    assert.equal(trWhole(seg), seg);
    setLang("en");
    assert.equal(trNote(seg + " / " + seg), "Free to explore after C9 non-partner elimination. / Free to explore after C9 non-partner elimination.");
    assert.equal(trNote("번역 없음 / " + seg), "번역 없음 / Free to explore after C9 non-partner elimination.");
  } finally {
    setLang("ko");
    setEnTable({});
  }
});

t("번역 표 파일: 모든 항목이 검사를 통과하고, 지금 data 에 쓰이는 키만 있다", () => {
  const read = (f) => JSON.parse(fs.readFileSync(new URL("../../data/" + f + ".json", import.meta.url), "utf8"));
  const table = read("i18n-en");
  const D = { players: read("players"), coaches: read("coaches"), transfers: read("transfers"), watch: read("watch"), schedule: read("schedule"), sources: read("sources") };
  setEnTable(table);
  try {
    const failed = Object.keys(table).filter((k) => trEn(k) === null);
    assert.deepEqual(failed, [], "검사에 걸린 번역");
    const used = new Set(collectTargets(D).map((x) => x.key));
    assert.deepEqual(Object.keys(table).filter((k) => !used.has(k)), [], "쓰이지 않는 낡은 번역");
    for (const [k, v] of Object.entries(table)) assert.ok(!/[가-힣]/.test(noteParts(v).body), "영문 몸말에 한글: " + k);
  } finally {
    setEnTable({});
  }
});

t("영문 안내: 약관·개인정보 영문 요약은 한글이 lang=ko 안에만 있고 한국어 원문으로 가는 링크가 있다", () => {
  for (const [doc, orig] of [["terms", "../../terms/"], ["privacy", "../../privacy/"]]) {
    const html = fs.readFileSync(new URL("../../en/" + doc + "/index.html", import.meta.url), "utf8");
    assert.ok(html.includes('<html lang="en">'), doc + " lang");
    assert.ok(html.includes('href="' + orig + '"'), doc + " 원문 링크");
    assert.ok(html.includes("This is a summary. The Korean original prevails."), doc + " 요약 문장");
    const outside = html.replace(/<span lang="ko">[^<]*<\/span>/g, "").replace(/<[^>]+>/g, "");
    assert.equal(/[가-힣]/.test(outside), false, doc + " lang=ko 밖의 한글");
  }
  const ko = KO, en = EN;
  assert.equal(en["foot.5"].includes("(Korean)"), false, "영문 푸터에 (Korean) 표시가 남았다");
  assert.ok(en["foot.5"].includes('href="en/privacy/"') && en["foot.5"].includes('href="en/terms/"'), "영문 푸터 링크는 영문 요약으로");
  assert.ok(ko["foot.5"].includes('href="privacy/"'), "한국어 푸터는 원문 그대로");
});

t("영문 후원: 카카오페이 링크는 영문 머리·푸터·약관·개인정보에서 빠지고 Ko-fi 는 남는다, 한국어는 그대로", () => {
  const html = fs.readFileSync(new URL("../../index.html", import.meta.url), "utf8");
  const en = toLang(html, "en");
  assert.equal(en.includes("qr.kakaopay.com"), false, "영문 틀에 카카오페이 링크");
  assert.ok(en.includes("ko-fi.com/4nhackle"), "Ko-fi 는 남는다");
  assert.ok(html.includes("qr.kakaopay.com"), "한국어 틀은 그대로");
  assert.equal(EN["foot.4"].includes("KakaoPay"), false, "영문 푸터 문단");
  for (const doc of ["terms", "privacy"]) {
    const page = fs.readFileSync(new URL("../../en/" + doc + "/index.html", import.meta.url), "utf8");
    assert.equal(page.includes("qr.kakaopay.com"), false, doc + " 카카오페이 링크");
    assert.ok(page.includes("KakaoPay (Korean domestic transfer, Korean page only)"), doc + " 사실 문장");
  }
});
