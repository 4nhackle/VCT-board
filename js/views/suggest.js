function $(id) { return document.getElementById(id); }

var MAIL = "biggest-cannula9b@icloud.com";

export function suggestHTML() {
  return '<form class="sg" id="sg" autocomplete="off">' +
    '<p class="hint" style="max-width:56ch">잘못된 정보, 빠진 선수나 팀, 바라는 기능을 알려 주세요. 내용을 쓰고 보내기를 누르면 바로 전달됩니다.</p>' +
    '<label for="sgType">종류<select id="sgType"><option>정보 오류</option><option>빠진 선수·팀</option><option>기능 제안</option><option>기타</option></select></label>' +
    '<label for="sgText">내용<textarea id="sgText" maxlength="1500" placeholder="선수 이름, 팀, 바로잡을 내용을 적어 주세요."></textarea></label>' +
    '<label for="sgLink">근거 링크 (선택)<input id="sgLink" type="url" placeholder="https://"></label>' +
    '<div class="btns"><button type="submit" class="btn" id="sgPost" aria-disabled="true">보내기</button><a class="btn alt" id="sgSend" href="#" aria-disabled="true">메일 앱으로 보내기</a><button type="button" class="btn alt" id="sgCopy">내용 복사</button></div>' +
    '<p class="hint" id="sgMsg" role="status"></p>' +
    '<p class="hint">전송이 안 되면 위의 메일 앱 보내기를 쓰거나, 내용을 복사해 <span class="addr" id="sgAddr">' + MAIL + '</span> 로 보내 주세요. <button type="button" class="linkbtn" id="sgCopyAddr">주소 복사</button></p>' +
    "</form>";
}

export function bindSuggest() {
  function composed() {
    var t = $("sgText").value.trim(), l = $("sgLink").value.trim();
    return {
      subject: "[VCT 현황 건의] " + $("sgType").value,
      body: t + (l ? "\n\n근거 링크: " + l : "") + "\n\n(VCT LFT·FA 현황 페이지에서 작성)"
    };
  }
  function sync() {
    var ok = $("sgText").value.trim().length > 0, a = $("sgSend");
    a.setAttribute("aria-disabled", ok ? "false" : "true");
    $("sgPost").setAttribute("aria-disabled", ok ? "false" : "true");
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
      say("자동 복사가 되지 않았습니다. 선택된 글자를 직접 복사해 주세요.");
    };
    try {
      navigator.clipboard.writeText(text).then(function () { say(okMsg); }, fail);
    } catch (e) { fail(); }
  }
  ["sgType", "sgText", "sgLink"].forEach(function (id) { $(id).addEventListener("input", sync); });
  $("sgSend").addEventListener("click", function (e) {
    if (this.getAttribute("aria-disabled") === "true") { e.preventDefault(); return; }
    say("메일 앱이 열리면 보내기를 눌러 주세요. 보내기를 눌러야 전달됩니다.");
  });
  $("sgCopy").addEventListener("click", function () {
    if (!$("sgText").value.trim()) { say("복사할 내용을 먼저 적어 주세요."); return; }
    var c = composed();
    copy(c.subject + "\n\n" + c.body, "내용을 복사했습니다. 메일에 붙여 넣어 보내 주세요.", $("sgText"));
  });
  $("sgCopyAddr").addEventListener("click", function () {
    copy(MAIL, "주소를 복사했습니다.", $("sgAddr"));
  });
  var W3F_KEY = "9b8a3816-da7d-4970-ae64-64daec095ffd";
  $("sg").addEventListener("submit", function (e) {
    e.preventDefault();
    var btn = $("sgPost");
    if (btn.getAttribute("aria-disabled") === "true" || btn.dataset.busy) return;
    var c = composed();
    var fail = "전송하지 못했습니다. 메일 앱으로 보내거나 내용을 복사해 보내 주세요.";
    btn.dataset.busy = "1";
    btn.textContent = "보내는 중…";
    say("");
    fetch("https://api.web3forms.com/submit", {
      method: "POST",
      signal: AbortSignal.timeout && AbortSignal.timeout(15000),
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ access_key: W3F_KEY, subject: c.subject, from_name: "VCT 현황 페이지", message: c.body, botcheck: "" })
    }).then(function (r) {
      return r.json().then(function (j) { return r.ok && j && j.success; });
    }).then(function (ok) {
      if (ok) {
        $("sgText").value = "";
        $("sgLink").value = "";
        sync();
        say("전달했습니다. 건의해 주셔서 감사합니다.");
      } else {
        say(fail);
      }
    }).catch(function () {
      say(fail);
    }).then(function () {
      delete btn.dataset.busy;
      btn.textContent = "보내기";
    });
  });
}
