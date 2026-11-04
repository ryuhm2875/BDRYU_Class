/* ──────────────────────────────────────────────────────────────────────────
   들어가는 문 — 비밀번호를 맞혀야 화면이 열립니다.

   · 비밀번호는 이 파일에 적혀 있지 않습니다. 아래 hash 는 비밀번호를 여러 번
     섞어 만든 지문이라, 거꾸로 되돌려 비밀번호를 알아내기는 어렵습니다.
   · 바꾸려면 편집기 위쪽의 [비밀번호] 단추를 누르세요. 이 파일만 바뀝니다.
   · 이것은 자물쇠가 아니라 커튼입니다. 수업 자료 주소를 이미 아는 사람은
     그 주소로 바로 들어갈 수 있습니다. 비밀은 여기에 두지 마세요.
   ────────────────────────────────────────────────────────────────────────── */
(function () {
  "use strict";

  var 설정 = {
    salt: "bdryu-class-2026",
    iter: 200000,
    hash: "16630aa7526d07b0da606f378b9266916651ed181ce9532af99bea9e58682cad",
    title: "류봉두의 즐거운 국어 수업",
    sub: "고흥대서중학교"
  };

  /* 비밀번호 → 지문 (PBKDF2, 20만 번) */
  function 섞기(말) {
    var enc = new TextEncoder();
    return crypto.subtle.importKey("raw", enc.encode(말), "PBKDF2", false, ["deriveBits"])
      .then(function (k) {
        return crypto.subtle.deriveBits(
          { name: "PBKDF2", salt: enc.encode(설정.salt), iterations: 설정.iter, hash: "SHA-256" }, k, 256);
      })
      .then(function (bits) {
        return Array.prototype.map.call(new Uint8Array(bits), function (b) {
          return ("0" + b.toString(16)).slice(-2);
        }).join("");
      });
  }
  window.__gate = { 섞기: 섞기, 설정: 설정 };   // 편집기의 [비밀번호] 단추가 가져다 씁니다

  if (window.top !== window.self) return;        // 편집기 미리보기 안에서는 비켜 줍니다
  if (!window.crypto || !crypto.subtle) return;  // 비밀번호를 확인할 수 없는 곳이면 그냥 엽니다
  if (/^__|^\s*$/.test(설정.hash)) return;       // 비밀번호를 아직 정하지 않았으면 그냥 엽니다

  var 열쇠 = "bdryu-gate-ok";
  try {
    if (localStorage.getItem(열쇠) === 설정.hash || sessionStorage.getItem(열쇠) === 설정.hash) return;
  } catch (e) {}

  /* 화면이 잠깐이라도 비치지 않게 먼저 가립니다 */
  var 가림 = document.createElement("style");
  가림.textContent = "html.__gate>body{visibility:hidden!important}" +
                    "html.__gate>body>#__gatebox,html.__gate>body>#__gatebox *{visibility:visible!important}";
  (document.head || document.documentElement).appendChild(가림);
  document.documentElement.classList.add("__gate");

  var CSS = [
    "#__gatebox{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;",
    "  padding:24px;background:#fff;color:#1d1d1f;",
    "  font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Pretendard','Noto Sans KR',sans-serif}",
    "@media (prefers-color-scheme:dark){#__gatebox{background:#000;color:#f5f5f7}}",
    "#__gatebox .c{width:min(380px,100%);text-align:center}",
    "#__gatebox .lock{font-size:40px;line-height:1;margin-bottom:18px}",
    "#__gatebox .eb{font-size:15px;color:#86868b;margin:0 0 6px}",
    "#__gatebox h1{font-size:26px;font-weight:800;letter-spacing:-.02em;margin:0 0 26px;line-height:1.25}",
    "#__gatebox input[type=password]{width:100%;height:46px;border-radius:12px;border:1px solid #d2d2d7;background:transparent;",
    "  color:inherit;font:inherit;font-size:17px;text-align:center;padding:0 12px;box-sizing:border-box}",
    "@media (prefers-color-scheme:dark){#__gatebox input[type=password]{border-color:#424245}}",
    "#__gatebox input:focus{outline:2px solid #0071e3;outline-offset:2px;border-color:transparent}",
    "#__gatebox button{width:100%;height:46px;margin-top:10px;border:0;border-radius:12px;background:#0071e3;color:#fff;",
    "  font:inherit;font-size:17px;font-weight:600;cursor:pointer}",
    "#__gatebox button:disabled{opacity:.5;cursor:default}",
    "#__gatebox .err{min-height:20px;margin-top:12px;font-size:14px;color:#d93025}",
    "#__gatebox .chk{display:flex;align-items:center;justify-content:center;gap:7px;margin-top:14px;font-size:13px;color:#86868b}",
    "#__gatebox .chk input{width:15px;height:15px}"
  ].join("\n");

  function 그리기() {
    var st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
    var box = document.createElement("div");
    box.id = "__gatebox";
    box.innerHTML =
      '<div class="c">' +
      '  <div class="lock">🔒</div>' +
      '  <p class="eb">' + 설정.sub + "</p>" +
      "  <h1>" + 설정.title + "</h1>" +
      '  <input type="password" id="__gatepw" autocomplete="current-password" placeholder="비밀번호" autofocus>' +
      '  <button type="button" id="__gatego">들어가기</button>' +
      '  <div class="err" id="__gateerr"></div>' +
      '  <label class="chk"><input type="checkbox" id="__gatekeep" checked> 이 기기에서 기억하기</label>' +
      "</div>";
    document.body.appendChild(box);

    var pw = box.querySelector("#__gatepw"),
        go = box.querySelector("#__gatego"),
        err = box.querySelector("#__gateerr"),
        keep = box.querySelector("#__gatekeep");
    setTimeout(function () { pw.focus(); }, 60);

    function 확인() {
      if (!pw.value) { pw.focus(); return; }
      go.disabled = true; err.textContent = "확인하는 중…";
      섞기(pw.value).then(function (h) {
        if (h !== 설정.hash) {
          err.textContent = "비밀번호가 맞지 않아요.";
          go.disabled = false; pw.select();
          return;
        }
        try { (keep.checked ? localStorage : sessionStorage).setItem(열쇠, 설정.hash); } catch (e) {}
        box.remove(); 가림.remove();
        document.documentElement.classList.remove("__gate");
      }).catch(function () {
        err.textContent = "확인하지 못했어요. 새로 고친 뒤 다시 해 보세요.";
        go.disabled = false;
      });
    }
    go.addEventListener("click", 확인);
    pw.addEventListener("keydown", function (e) { if (e.key === "Enter") 확인(); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", 그리기);
  else 그리기();
})();
