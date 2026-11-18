/* ──────────────────────────────────────────────────────────────
   마지막 배는 6시 · 처음 화면
   이름 · 점퍼 색 · 공포 강도를 고르고 시작. 저장된 게임이 있으면 이어 하기.
   ?debug=1 → 개발 확인용 (window.__G)
   ────────────────────────────────────────────────────────────── */
import { JACKETS } from "./data.js?v=202611181930";
import { esc } from "./puzzles.js?v=202611181930";
import { Game, Ending, newGame, loadSave, clearSave } from "./game.js?v=202611181930";

const $app = document.getElementById("app");
Title();

/* 처음 화면: 제목만. 배경 그림(assets/art/title.webp)이 있으면 그 위에 안개·불빛·필름 알갱이 */
function Title() {
  document.body.classList.remove("player");
  const S = loadSave();
  const live = S && !S.end;
  let last = ""; try { last = localStorage.getItem("escape-name") || ""; } catch (e) {}
  let jacket = "남색", fear = "weak";
  $app.innerHTML = `<div class="title2">
    <div class="bg" id="tbg"></div>
    <div class="fog f1"></div><div class="fog f2"></div>
    <div class="glow"></div>
    <div class="grain"></div><div class="vig"></div>
    <div class="tcenter">
      <h1 class="ttl" data-t="마지막 배는 6시">마지막 배는 <em>6시</em></h1>
      <div class="hline"><i></i></div>
      <div class="tbtns">
        ${live ? `<button class="tbtn y" id="cont">이어 하기</button><button class="tbtn" id="newb">새로 시작</button>` : `<button class="tbtn y" id="newb">시작</button>`}
        ${S && S.end ? `<button class="tbtn ghost" id="last">지난 결과</button>` : ""}
      </div>
    </div>
    <div class="setup" id="setup" hidden>
      <div class="sbox">
        <input class="inp" id="nm" maxlength="8" placeholder="이름" value="${esc(last)}" autocomplete="off">
        <div class="sw">${Object.entries(JACKETS).map(([k, c]) => `<button data-j="${k}" style="--c:rgb(${c})" class="${k === jacket ? "on" : ""}" aria-label="점퍼 ${k}"></button>`).join("")}</div>
        <div class="seg"><button data-f="weak" class="on">약함</button><button data-f="normal">보통</button></div>
        <button class="tbtn y wide" id="go">들어가기</button>
        <button class="sx" id="sx" aria-label="닫기">✕</button>
        <div id="m"></div>
      </div>
    </div>
  </div>`;
  const q = s => $app.querySelector(s);
  const im = new Image(); im.onload = () => { q("#tbg") && (q("#tbg").style.backgroundImage = `url(${im.src})`, q("#tbg").classList.add("art")); }; im.src = "assets/art/title.webp";
  $app.querySelectorAll("[data-j]").forEach(b => b.onclick = () => { jacket = b.dataset.j; $app.querySelectorAll("[data-j]").forEach(x => x.classList.toggle("on", x === b)); });
  $app.querySelectorAll("[data-f]").forEach(b => b.onclick = () => { fear = b.dataset.f; $app.querySelectorAll("[data-f]").forEach(x => x.classList.toggle("on", x === b)); });
  const openSetup = () => { q("#setup").hidden = false; setTimeout(() => q("#nm").focus(), 50); };
  q("#newb").onclick = () => {
    if (live && !q("#newb").dataset.sure) { q("#newb").dataset.sure = 1; q("#newb").textContent = "지난 판이 지워져요"; return; }
    openSetup();
  };
  q("#sx").onclick = () => { q("#setup").hidden = true; };
  if (live) q("#cont").onclick = () => Game(S, { onExit: Title });
  if (S && S.end && q("#last")) q("#last").onclick = () => Ending(S, { onExit: Title });
  const go = () => {
    const n = q("#nm").value.trim().slice(0, 8);
    if (!n) { q("#nm").classList.add("bad"); q("#nm").focus(); return; }
    try { localStorage.setItem("escape-name", n); } catch (e) {}
    clearSave();
    Game(newGame(n, jacket, fear), { onExit: Title });
  };
  q("#go").onclick = go;
  q("#nm").onkeydown = e => { if (e.key === "Enter" && !e.isComposing) go(); };
}
