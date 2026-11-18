/* ──────────────────────────────────────────────────────────────
   마지막 배는 6시 · 처음 화면
   이름 · 점퍼 색 · 공포 강도를 고르고 시작. 저장된 게임이 있으면 이어 하기.
   ?debug=1 → 개발 확인용 (window.__G)
   ────────────────────────────────────────────────────────────── */
import { JACKETS } from "./data.js?v=202611181913";
import { esc } from "./puzzles.js?v=202611181913";
import { Game, Ending, newGame, loadSave, clearSave } from "./game.js?v=202611181913";

const $app = document.getElementById("app");
Title();

function Title() {
  document.body.classList.remove("player");
  const S = loadSave();
  const live = S && !S.end;
  let last = ""; try { last = localStorage.getItem("escape-name") || ""; } catch (e) {}
  let jacket = "남색", fear = "weak";
  $app.innerHTML = `<div class="title">
    <div class="sea"></div><div class="sunset"></div><div class="school"></div>
    <div class="tbox">
      <p class="kicker">고흥 · 봉두섬 · 오후 5시 30분</p>
      <div class="logo big">마지막 배는 6시</div>
      <p class="lead">폐교에 갇힌 30분.<br>흩어진 기록과 친구들을 찾아, 두 사람의 누명을 벗기세요.</p>
      ${live ? `<div class="cont"><button class="pill y big" id="cont">이어 하기 · ${esc(S.name)}</button>
        <button class="pill ghost sm" id="reset">처음부터 다시</button></div>` : ""}
      <div class="newg" ${live ? "hidden" : ""}>
        <label class="fl">이름<input class="inp" id="nm" maxlength="8" placeholder="예) 류봉두" value="${esc(last)}"></label>
        <div class="fl">점퍼 색<div class="sw">${Object.entries(JACKETS).map(([k, c]) => `<button data-j="${k}" style="--c:rgb(${c})" class="${k === jacket ? "on" : ""}" aria-label="${k}"></button>`).join("")}</div></div>
        <div class="fl">공포 강도<div class="seg"><button data-f="weak" class="on">약함</button><button data-f="normal">보통</button></div></div>
        <p class="muted small" id="fh">약함: ‘그것’에게 들켜도 몸이 굳지 않고, 정전이 없어요.</p>
        <button class="pill y big" id="go">폐교로 들어가기</button>
        <div id="m"></div>
      </div>
      <p class="muted small hp">🎧 이어폰을 끼면 더 무서워요. 한 판에 30분이 걸려요.</p>
    </div></div>`;
  const q = s => $app.querySelector(s);
  $app.querySelectorAll("[data-j]").forEach(b => b.onclick = () => { jacket = b.dataset.j; $app.querySelectorAll("[data-j]").forEach(x => x.classList.toggle("on", x === b)); });
  $app.querySelectorAll("[data-f]").forEach(b => b.onclick = () => {
    fear = b.dataset.f; $app.querySelectorAll("[data-f]").forEach(x => x.classList.toggle("on", x === b));
    q("#fh").textContent = fear === "weak" ? "약함: ‘그것’에게 들켜도 몸이 굳지 않고, 정전이 없어요." : "보통: 들키면 20초 동안 몸이 굳고, 세 번 틀리면 정전이 와요.";
  });
  if (live) {
    q("#cont").onclick = () => Game(S, { onExit: Title });
    q("#reset").onclick = () => { if (q("#reset").dataset.sure) { clearSave(); Title(); return; } q("#reset").dataset.sure = 1; q("#reset").textContent = "정말 지울까요? 한 번 더"; };
  } else if (S && S.end) { /* 끝난 판은 결과 카드를 다시 볼 수 있게 */
    q(".newg").insertAdjacentHTML("beforebegin", `<button class="pill ghost sm" id="last">지난 결과 카드 보기</button>`);
    q("#last").onclick = () => Ending(S, { onExit: Title });
  }
  const go = () => {
    const n = q("#nm").value.trim().slice(0, 8);
    if (!n) { q("#m").innerHTML = `<div class="res bad">이름을 적어 주세요.</div>`; return; }
    try { localStorage.setItem("escape-name", n); } catch (e) {}
    Game(newGame(n, jacket, fear), { onExit: Title });
  };
  q("#go").onclick = go;
  q("#nm").onkeydown = e => { if (e.key === "Enter" && !e.isComposing) go(); };
}
