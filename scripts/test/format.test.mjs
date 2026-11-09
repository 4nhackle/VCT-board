// 시험: 날짜·시각 표기(js/format.js)와 메모 나눔(js/note.js).
import assert from "node:assert/strict";
import { withKst, stampOf, stampLabel, parseStamp, fmtDate, dayWord, dateWord, dateLong, clockText, TODAY, refreshToday } from "../../js/format.js";
import { tIn } from "../../js/i18n.js";
import { KO } from "../../js/i18n/ko.js";
import { EN } from "../../js/i18n/en.js";
import { T, t, serialOf } from "./helpers.mjs";

// P3: 머리말 갱신 시각에 시간대(KST)를 붙인다. 이미 있으면 그대로(멱등).
t("withKst: 머리말 시각에 KST 를 붙임", () => {
  assert.equal(withKst("2026-11-01 13:58 기준입니다."), "2026-11-01 13:58 KST 기준입니다.");
});

t("withKst: 이미 KST 가 있으면 그대로, 두 번 붙지 않음", () => {
  const once = withKst("2026-11-01 13:58 기준입니다.");
  assert.equal(withKst(once), once);
  assert.equal(withKst("2026-11-01 13:58 KST 기준입니다."), "2026-11-01 13:58 KST 기준입니다.");
});

t("withKst: 시각이 없는 글은 그대로", () => {
  const plain = "LFT와 FA는 둘 다 새 팀을 찾는 중이라는 뜻입니다.";
  assert.equal(withKst(plain), plain);
});

t("serialOf: 기준일 T 는 2026-10-31", () => {
  assert.equal(serialOf(2026, 10, 31), T);
});

t("parseStamp: 범위 안의 값은 읽고, 범위 밖이면 null", () => {
  assert.deepEqual(parseStamp("10/24 16:30 UTC"), { mon: 10, day: 24, hh: 16, mm: 30, tz: "UTC", min: 16 * 60 + 30 + 540 });
  assert.deepEqual(parseStamp("10/24 16:30 KST"), { mon: 10, day: 24, hh: 16, mm: 30, tz: "KST", min: 16 * 60 + 30 });
  assert.equal(parseStamp("13/1 10:00 UTC"), null);
  assert.equal(parseStamp("10/24 24:00 UTC"), null);
  assert.equal(parseStamp("10/24 10:60 KST"), null);
  assert.equal(parseStamp("시각 없음"), null);
});

t("stampOf: 날짜 칸과 같은 날이면 한국 시간 분을 낸다", () => {
  // 10/24 16:30 UTC 는 10/25 01:30 KST 다.
  const it = { date: serialOf(2026, 10, 25), note: "LFT 게시 (Sheep 10/24 16:30 UTC)" };
  assert.equal(stampOf(it), serialOf(2026, 10, 24) * 1440 + 1530);
  assert.equal(stampLabel(it), "오전 1:30");
});

t("stampOf: 날짜 칸이 전날이면 null (UTC 가 KST 로 넘어가는 경우 포함)", () => {
  assert.equal(stampOf({ date: serialOf(2026, 10, 24), note: "(Sheep 10/24 16:30 UTC)" }), null);
  assert.notEqual(stampOf({ date: serialOf(2026, 10, 25), note: "발표 10/25 16:30 KST" }), null);
});

t("stampOf: 연말·연초 경계 (12/31 ↔ 1/1)", () => {
  // 12/31 23:30 UTC 는 1/1 08:30 KST 라 날짜 칸 1/1 과 맞는다.
  assert.equal(stampOf({ date: serialOf(2027, 1, 1), note: "x (A 12/31 23:30 UTC)" }), serialOf(2026, 12, 31) * 1440 + 23 * 60 + 30 + 540);
  // 12/31 23:30 KST 는 날짜 칸 1/1 과 다른 날이다.
  assert.equal(stampOf({ date: serialOf(2027, 1, 1), note: "x (A 12/31 23:30 KST)" }), null);
  // 1/1 00:10 KST 는 날짜 칸 12/31 과 다른 날이다.
  assert.equal(stampOf({ date: serialOf(2026, 12, 31), note: "x (A 1/1 00:10 KST)" }), null);
});

t("fmtDate: 일련번호는 M/D, 글자는 그대로", () => {
  assert.equal(fmtDate(serialOf(2026, 10, 25)), "10/25");
  assert.equal(fmtDate("TBD"), "TBD");
});

t("ko 출력 고정: 인원·나이·D-day·상대 날짜·날짜·시각 (지금 그대로)", () => {
  assert.equal(tIn("ko", "count.people", { n: 3 }), "3명");
  assert.equal(tIn("ko", "birth.year", { y: "2002", n: 24 }), "2002년 (약 24세)");
  assert.equal(tIn("ko", "birth.full", { d: "2002-05-21", n: 24 }), "2002-05-21 (24세)");
  assert.equal(tIn("ko", "birth.minor", { y: "2009", n: 17 }), "2009년 (17세)");
  assert.equal(tIn("ko", "contract.dday", { n: 3 }), "D-3");
  assert.equal(tIn("ko", "date.ago", { n: 2 }), "2일 전");
  assert.equal(fmtDate(serialOf(2026, 10, 25), "ko"), "10/25");
  assert.equal(clockText(0, 5, "ko"), "오전 12:05");
  assert.equal(clockText(12, 5, "ko"), "오후 12:05");
});

t("en 표기: 날짜 Oct 25, 시각 1:30 AM, 0시·12시 경계", () => {
  assert.equal(fmtDate(serialOf(2026, 10, 25), "en"), "Oct 25");
  assert.equal(dateWord(new Date(Date.UTC(2026, 9, 24)), "en"), "Oct 24");
  assert.equal(clockText(1, 30, "en"), "1:30 AM");
  assert.equal(clockText(0, 5, "en"), "12:05 AM");
  assert.equal(clockText(12, 5, "en"), "12:05 PM");
  assert.equal(clockText(23, 59, "en"), "11:59 PM");
});

t("표기: 보도 시각은 UTC→KST 로 날짜가 넘어가도 두 언어에서 같은 시각을 가리킨다", () => {
  // 10/24 16:30 UTC = 10/25 01:30 KST. 날짜 칸 10/25 와 맞는다.
  const it = { date: serialOf(2026, 10, 25), note: "x 10/24 16:30 UTC" };
  assert.equal(stampLabel(it, "ko"), "오전 1:30");
  assert.equal(stampLabel(it, "en"), "1:30 AM");
});

t("dayWord: 오늘·어제·N일 전을 두 언어로", () => {
  const today = Math.floor((Date.now() + 9 * 36e5) / 864e5) + 25569;
  assert.equal(dayWord(today, "ko"), "오늘");
  assert.equal(dayWord(today, "en"), "Today");
  assert.equal(dayWord(today - 1, "ko"), "어제");
  assert.equal(dayWord(today - 1, "en"), "Yesterday");
  assert.equal(dayWord(today - 3, "ko"), "3일 전");
  assert.equal(dayWord(today - 3, "en"), "3 days ago");
});

t("parseStamp: 없는 날짜(2/30, 4/31)는 null, 2/29·12/31 은 통과, 13/1 은 null", () => {
  assert.equal(parseStamp("2/30 12:00 UTC"), null);
  assert.equal(parseStamp("4/31 12:00 KST"), null);
  assert.notEqual(parseStamp("2/29 12:00 UTC"), null);
  assert.notEqual(parseStamp("12/31 23:59 KST"), null);
  assert.equal(parseStamp("13/1 12:00 UTC"), null);
});

t("dateLong: 한국어 'M월 D일 (요일)', 영문 'Mon, Oct 25'", () => {
  const d = new Date(Date.UTC(2026, 9, 26));
  assert.equal(dateLong(d, "ko"), "10월 26일 (" + KO["weekday." + d.getUTCDay()] + ")");
  assert.equal(dateLong(d, "en"), EN["weekday." + d.getUTCDay()] + ", Oct 26");
});

t("refreshToday: 한국 23:59 와 다음 날 00:00 은 날짜가 하루 다르고, 가져온 TODAY 도 새 값을 본다", () => {
  const a = refreshToday(Date.UTC(2026, 10, 9, 14, 59));
  const b = refreshToday(Date.UTC(2026, 10, 9, 15, 0));
  assert.equal(b - a, 1);
  assert.equal(TODAY, b);
  refreshToday();
});
