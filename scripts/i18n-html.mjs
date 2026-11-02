// 한국어 정적 틀(index.html)을 영문 틀로 바꾸고, 한·영 짝 주소(hreflang) 줄을 만든다. build.mjs 와 dev-server.mjs 가 같이 쓴다.
// 바꾸는 것: <html lang>, title·description·og 글, data-i18n(글자)·data-i18n-html(글자 HTML)·data-i18n-attr(속성),
// 머리말 문장(<p class="lede">), EN/KR 표시(aria-current), KR 안내 줄. lang 이 ko 면 입력을 그대로 돌려준다.
import { tIn, ledeHTML } from "../js/i18n.js";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function toLang(html, lang) {
  if (lang !== "en") return html;
  const T = (k) => tIn("en", k);
  const lede = /(\d{4}-\d{2}-\d{2} \d{1,2}:\d{2}) 기준입니다/.exec(html);
  if (!lede) throw new Error("index.html 머리말에서 기준 시각을 찾지 못했습니다(예약 작업 약속: YYYY-MM-DD HH:mm 기준입니다.)");
  const setMeta = (h, attr, name, value) => {
    const re = new RegExp(`<meta ${attr}="${name}" content="[^"]*">`);
    if (!re.test(h)) throw new Error("index.html 에 없는 메타: " + name);
    return h.replace(re, `<meta ${attr}="${name}" content="${esc(value)}">`);
  };
  let h = html.replace('<html lang="ko">', '<html lang="en">');
  h = h.replace(/<title>[^<]*<\/title>/, `<title>${esc(T("title.site"))}</title>`);
  h = setMeta(h, "name", "description", T("meta.description"));
  h = setMeta(h, "property", "og:site_name", T("meta.ogSite"));
  h = setMeta(h, "property", "og:title", T("meta.ogTitle"));
  h = setMeta(h, "property", "og:description", T("meta.ogDesc"));
  h = h.replace('<meta property="og:locale" content="ko_KR">', '<meta property="og:locale" content="en_US">\n<meta property="og:locale:alternate" content="ko_KR">');
  // 글자: data-i18n 은 텍스트를, data-i18n-html 은 안의 HTML 을 사전 값으로 바꾼다. 속성 이름은 그대로 둔다.
  h = h.replace(/<(\w+)([^>]*?) data-i18n="([^"]+)"([^>]*)>([^<]*)<\/\1>/g, (m, tag, a, key, b) => `<${tag}${a} data-i18n="${key}"${b}>${esc(T(key))}</${tag}>`);
  h = h.replace(/<(\w+)([^>]*?) data-i18n-html="([^"]+)"([^>]*)>([\s\S]*?)<\/\1>/g, (m, tag, a, key, b) => `<${tag}${a} data-i18n-html="${key}"${b}>${T(key)}</${tag}>`);
  // 속성: data-i18n-attr="이름:키;이름:키" 를 같은 태그 안에서 바꾼다.
  h = h.replace(/<\w+[^>]*? data-i18n-attr="([^"]+)"[^>]*>/g, (tag, spec) => {
    let out = tag;
    for (const pair of spec.split(";")) {
      const i = pair.indexOf(":"), name = pair.slice(0, i), val = esc(T(pair.slice(i + 1)));
      const re = new RegExp(`\\s${name}="[^"]*"`);
      out = re.test(out) ? out.replace(re, ` ${name}="${val}"`) : out.replace(/>$/, ` ${name}="${val}">`);
    }
    return out;
  });
  h = h.replace(/<p class="lede">[\s\S]*?<\/p>/, `<p class="lede">${ledeHTML("en", lede[1])}</p>`);
  // EN/KR 표시: 현재 언어(EN)에 aria-current 를 붙인다.
  h = h.replace('<a href="./" hreflang="ko" lang="ko" data-lang="ko" aria-current="true">', '<a href="./" hreflang="ko" lang="ko" data-lang="ko">');
  h = h.replace('<a href="en/" hreflang="en" lang="en" data-lang="en">', '<a href="en/" hreflang="en" lang="en" data-lang="en" aria-current="true">');
  // KR 안내 한 줄(영문 화면에서만).
  h = h.replace(/(<section class="notes"[\s\S]*?)(<\/ul>)/, `$1<li class="kr-note">${esc(T("note.kr"))}</li>$2`);
  return h;
}

// 짝 주소 세 줄. 한국어·영문 페이지 모두 같은 세 줄을 갖는다. x-default 는 한국어 주소.
export function alternateTags(alt) {
  return `<link rel="alternate" hreflang="ko" href="${esc(alt.ko)}">\n` +
    `<link rel="alternate" hreflang="en" href="${esc(alt.en)}">\n` +
    `<link rel="alternate" hreflang="x-default" href="${esc(alt.ko)}">\n`;
}

export function addAlternates(html, alt) {
  return html.replace("</head>", alternateTags(alt) + "</head>");
}
