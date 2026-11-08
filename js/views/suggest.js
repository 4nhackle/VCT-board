import { t, LANG } from "../i18n.js";

function $(id) { return document.getElementById(id); }

var MAIL = "biggest-cannula9b@icloud.com";
// web3forms 무료 요금제의 hCaptcha 사이트 키(web3forms 문서). 스팸 차단은 서버 쪽에서 이 토큰으로 한다.
var HCAPTCHA_KEY = "50b2fe65-b00b-4b9e-ad62-3ba471098be2";

export function suggestHTML() {
  return '<form class="sg" id="sg" autocomplete="off">' +
    '<p class="hint" style="max-width:56ch">' + t("form.intro") + "</p>" +
    '<label for="sgType">' + t("form.type") + '<select id="sgType"><option>' + t("form.opt.info") + "</option><option>" + t("form.opt.missing") + "</option><option>" + t("form.opt.feature") + "</option><option>" + t("form.opt.other") + "</option></select></label>" +
    '<label for="sgText">' + t("form.text") + '<textarea id="sgText" maxlength="1500" placeholder="' + t("form.textPh") + '"></textarea></label>' +
    '<label for="sgLink">' + t("form.link") + '<input id="sgLink" type="url" placeholder="https://"></label>' +
    '<div id="sgCap"></div>' +
    '<div class="btns"><button type="submit" class="btn" id="sgPost" aria-disabled="true">' + t("form.post") + '</button><a class="btn alt" id="sgSend" href="#" aria-disabled="true">' + t("form.mail") + '</a><button type="button" class="btn alt" id="sgCopy">' + t("form.copy") + "</button></div>" +
    '<p class="hint">' + t("form.privacyNote") + "</p>" +
    '<p class="hint" id="sgMsg" role="status"></p>' +
    '<p class="hint">' + t("form.fallbackA") + ' <span class="addr" id="sgAddr">' + MAIL + "</span> " + t("form.fallbackB") + ' <button type="button" class="linkbtn" id="sgCopyAddr">' + t("form.copyAddr") + "</button></p>" +
    "</form>";
}

export function bindSuggest() {
  function composed() {
    var text = $("sgText").value.trim(), link = $("sgLink").value.trim();
    return {
      subject: t("form.subjectPrefix") + $("sgType").value,
      body: text + (link ? "\n\n" + t("form.linkLabel") + link : "") + "\n\n" + t("form.footer")
    };
  }
  // hCaptcha: 건의 탭을 처음 그릴 때만 불러온다(다른 화면은 요청하지 않는다). 불러오지 못하면 보내기만 끈다.
  var capId = null, capFailed = false;
  function loadCaptcha() {
    var s = document.createElement("script");
    s.src = "https://js.hcaptcha.com/1/api.js?render=explicit&hl=" + LANG;
    s.async = true;
    s.onload = function () {
      var dark = window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches;
      capId = window.hcaptcha.render($("sgCap"), { sitekey: HCAPTCHA_KEY, theme: dark ? "dark" : "light" });
    };
    s.onerror = function () { capFailed = true; sync(); say(t("form.captchaUnavailable")); };
    document.head.appendChild(s);
  }
  function sync() {
    var ok = $("sgText").value.trim().length > 0, a = $("sgSend");
    a.setAttribute("aria-disabled", ok ? "false" : "true");
    $("sgPost").setAttribute("aria-disabled", ok && !capFailed ? "false" : "true");
    if (ok) {
      var c = composed();
      a.href = "mailto:" + MAIL + "?subject=" + encodeURIComponent(c.subject) + "&body=" + encodeURIComponent(c.body.replace(/\n/g, "\r\n"));
    } else {
      a.href = "#";
    }
  }
  function say(m) { $("sgMsg").textContent = m; }
  function copy(text, okMsg, fallbackEl) {
    var fail = function () {
      if (fallbackEl) {
        try {
          var r = document.createRange();
          r.selectNodeContents(fallbackEl);
          var sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(r);
        } catch (e) {}
      }
      say(t("form.copyFail"));
    };
    try {
      navigator.clipboard.writeText(text).then(function () { say(okMsg); }, fail);
    } catch (e) { fail(); }
  }
  ["sgType", "sgText", "sgLink"].forEach(function (id) { $(id).addEventListener("input", sync); });
  $("sgSend").addEventListener("click", function (e) {
    if (this.getAttribute("aria-disabled") === "true") { e.preventDefault(); return; }
    say(t("form.mailNotice"));
  });
  $("sgCopy").addEventListener("click", function () {
    if (!$("sgText").value.trim()) { say(t("form.copyNeedText")); return; }
    var c = composed();
    copy(c.subject + "\n\n" + c.body, t("form.copied"), $("sgText"));
  });
  $("sgCopyAddr").addEventListener("click", function () {
    copy(MAIL, t("form.addrCopied"), $("sgAddr"));
  });
  var W3F_KEY = "9b8a3816-da7d-4970-ae64-64daec095ffd";
  $("sg").addEventListener("submit", function (e) {
    e.preventDefault();
    var btn = $("sgPost");
    if (btn.getAttribute("aria-disabled") === "true" || btn.dataset.busy) return;
    // 토큰은 한 번만 쓴다. 보내기 뒤에는 성공이든 실패든 위젯을 다시 맞춘다(reset).
    var token = capId === null ? "" : window.hcaptcha.getResponse(capId);
    if (!token) { say(t("form.captchaNeed")); return; }
    var c = composed();
    var fail = t("form.sendFail");
    btn.dataset.busy = "1";
    btn.textContent = t("form.postBusy");
    say("");
    fetch("https://api.web3forms.com/submit", {
      method: "POST",
      signal: AbortSignal.timeout && AbortSignal.timeout(15000),
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ access_key: W3F_KEY, subject: c.subject, from_name: t("form.fromName"), message: c.body, botcheck: "", "h-captcha-response": token })
    }).then(function (r) {
      return r.json().then(function (j) { return r.ok && j && j.success; });
    }).then(function (ok) {
      if (ok) {
        $("sgText").value = "";
        $("sgLink").value = "";
        sync();
        say(t("form.thanks"));
      } else {
        say(fail);
      }
    }).catch(function () {
      say(fail);
    }).then(function () {
      delete btn.dataset.busy;
      btn.textContent = t("form.post");
      window.hcaptcha.reset(capId);
    });
  });
  loadCaptcha();
}
