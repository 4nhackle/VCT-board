// index.html <head> 맨 앞의 인라인 스크립트(언어 이동). 시험(test.mjs)과 빌드(build.mjs)가 같이 쓴다.
// 스크립트 본문만 본다. 페이지의 다른 곳에 같은 글자가 있어도 셈에 넣지 않는다.
export function inlineScript(html) {
  const m = /<head><script>([\s\S]*?)<\/script>/.exec(html);
  if (!m) throw new Error("index.html <head> 맨 앞에 인라인 스크립트가 없습니다");
  return m[1];
}

// 스크립트 본문에 사이트 경로(따옴표 안)가 있어야 한다. 다르면 언어 이동이 조용히 멈춘다.
export function checkSitePath(html, sitePath) {
  if (!inlineScript(html).includes('"' + sitePath + '"')) throw new Error("index.html 인라인 스크립트에 사이트 경로 " + sitePath + " 가 없습니다");
}
