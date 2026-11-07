// 본문 번역 대상 문자열을 모은다(11회차 지시문 A-1 표). 한글이 든 값만 대상이다.
// 상태·이적 구분·역할·대상은 용어집(js/i18n/glossary.js)이 맡으므로 용어집으로 옮겨지면 뺀다.
// 키는 화면이 번역표에서 찾는 글이다: 비고는 " / " 조각마다, 상황은 [확정]·(확인 M/D) 를 뗀 몸말, 나머지는 값 그대로.
import { termEn } from "../js/i18n/glossary.js";
import { watchMeta } from "../js/model.js";

const H = /[가-힣]/;

export function collectTargets(D) {
  const out = [];
  const add = (file, field, text, key) => { if (H.test(text)) out.push({ file, field, text, key }); };
  for (const [file, rows] of [["players", D.players || []], ["coaches", D.coaches || []]]) {
    for (const r of rows) {
      if (r.note) for (const seg of String(r.note).split(" / ")) add(file, "note", seg, seg);
      if (r.caption) for (const seg of String(r.caption).split(" / ")) add(file, "caption", seg, seg);
      if (r.team && termEn(r.team) === null) add(file, "team", r.team, r.team);
    }
  }
  for (const r of [...((D.transfers || {}).players || []), ...((D.transfers || {}).coaches || [])]) {
    if (r.note) for (const seg of String(r.note).split(" / ")) add("transfers", "note", seg, seg);
    if (r.caption) for (const seg of String(r.caption).split(" / ")) add("transfers", "caption", seg, seg);
  }
  for (const r of D.watch || []) {
    if (r.situation) { const b = watchMeta(r.situation).body; add("watch", "situation", b, b); }
  }
  for (const r of D.schedule || []) {
    if (r.title) add("schedule", "title", r.title, r.title);
    if (typeof r.date === "string") add("schedule", "date", r.date, r.date);
    if (r.source) add("schedule", "source", r.source, r.source);
  }
  for (const v of Object.values(D.sources || {})) if (Array.isArray(v) && v[0]) add("sources", "name", v[0], v[0]);
  return out;
}
