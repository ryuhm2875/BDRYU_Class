/* ──────────────────────────────────────────────────────────────
   마지막 배는 6시 · 학생 화면
   대기 → 캐릭터 소개 → 3D 폐교 → 엔딩
   판정은 칠판이 합니다. 여기서는 ‘이렇게 풀었어요’ 요청만 보냅니다.
   캐릭터 위치만은 빠르게 오가야 해서 pos/모둠 에 직접 씁니다.
   ────────────────────────────────────────────────────────────── */
import { Net, P } from "./net.js?v=202611181648";
import { CHARS, ROOMS, MAP, GAME_MS, IT, clockText, leftText, isOpen, roomAt, itPos } from "./data.js?v=202611181648";
import { esc, modal, closeModal, showMemo, showClues, orderPuzzle, codePad, showDiary, charCardHTML } from "./puzzles.js?v=202611181648";
import { startAudio, itStep, sfx, setDusk } from "./sound.js?v=202611181648";

const $app = () => document.getElementById("app");
const SPEED = 2.6, FOLLOW = 1.1, NEAR = 1.6;
const FLASH_DRAIN = 10 / 60;            // 1초에 % (1분에 10%)
const FREEZE_MS = 20000;
/* 장면 카드 이름 (그림 설명일 뿐, 정답 순서는 칠판에만) */
const SCENE_NAMES = { a: "정문에 도착", b: "새어 나오는 연기", c: "휴대폰을 듦", d: "그을린 창문 앞" };

export function Player(code, name, ctx) {
  document.body.classList.add("player");
  const uid = Net.uid;
  const S = {
    pub: null, priv: null, tid: null, team: null, mine: [], active: null,
    pos: {}, disp: {}, me: {}, picked: new Set(), screen: null, world: null,
    lastMsg: null, lastHint: null, lastBo: 0, frozenUntil: 0, immuneUntil: 0, staticUntil: 0,
    emo: null, sentAt: 0, sentKey: "", keys: new Set(), joy: { x: 0, z: 0 }, stepT: 0, entered: false
  };
  if (Net.kind === "local") window.__S = S;      // 시험 모드에서만: 개발 확인용
  const LSK = `escape-me-${code}-${uid}`;
  try { const v = JSON.parse(localStorage.getItem(LSK) || "null"); if (v) { S.me = v.me || {}; S.picked = new Set(v.picked || []); S.entered = !!v.entered; } } catch (e) {}
  const save = () => { try { localStorage.setItem(LSK, JSON.stringify({ me: S.me, picked: [...S.picked], entered: S.entered })); } catch (e) {} };
  setInterval(save, 2000);

  const el = () => S.pub && S.pub.startAt ? Net.now() - S.pub.startAt : 0;
  const send = (t, extra = {}) => Net.push(P.mail(code, uid), Object.assign({ t, at: Net.TS }, extra)).catch(() => toast("보내지 못했어요. 연결을 확인해 주세요.", "bad"));

  /* ---------- 구독 ---------- */
  let offPos = null;
  Net.on(P.pub(code), v => { S.pub = v; onPub(); });
  Net.on(P.priv(code, uid), v => { S.priv = v; });

  function onPub() {
    const pub = S.pub; if (!pub) return;
    const tid = pub.teams ? Object.keys(pub.teams).find(k => (pub.teams[k].m || []).includes(uid)) : null;
    if (tid !== S.tid) {
      S.tid = tid; S.pos = {};
      if (offPos) offPos();
      offPos = tid ? Net.on(P.pos(code, tid), v => { S.pos = v || {}; adoptPos(); }) : null;
    }
    S.team = tid ? pub.teams[tid] : null;
    const mine = S.team && S.team.c && S.team.c[uid] || [];
    if (mine.join() !== S.mine.join()) {
      S.mine = mine.slice();
      if (!mine.includes(S.active)) S.active = mine[0] || null;
      mine.forEach((c, i) => { if (!S.me[c]) S.me[c] = spawnAt(c, i); });
      if (S.screen === "play") drawHUD(true);
    }
    route();
    if (S.team) teamEvents();
  }
  function spawnAt(c, i) {
    const p = S.pos[c];
    if (p && p.x != null) return { x: p.x, z: p.z, a: p.a || 0, bat: p.bat != null ? p.bat : 100, flash: true, hidden: false };
    const k = Object.keys(CHARS).indexOf(c);
    return { x: MAP.spawn.x + (k % 3) * 0.7, z: MAP.spawn.z - 0.6 + Math.floor(k / 3) * 0.9, a: 0, bat: 100, flash: true, hidden: false };
  }
  /* 다른 사람이 들던 캐릭터를 넘겨받으면, 그 자리에서 이어서 */
  function adoptPos() {
    for (const c of S.mine) {
      const p = S.pos[c];
      if (p && p.by && p.by !== uid && p.x != null) { S.me[c] = Object.assign(S.me[c] || {}, { x: p.x, z: p.z, a: p.a || 0 }); }
    }
  }

  /* ---------- 화면 고르기 ---------- */
  function route() {
    const pub = S.pub;
    let want = "wait";
    if (pub.phase === "play" || pub.phase === "end") {
      if (!S.team) want = "seat";
      else if (S.team.end && S.screen !== "play") want = "end";
      else want = S.entered ? "play" : "intro";
    }
    if (want === S.screen) return;
    if (S.screen === "play" && want !== "play") stopPlay();
    S.screen = want;
    ({ wait: Wait, seat: Seat, intro: Intro, play: Play, end: () => End() })[want]();
  }

  function Wait() {
    $app().innerHTML = `<div class="wrap center"><div class="logo">마지막 배는 6시</div>
      <h1>${esc(name)}, 기다리는 중</h1><p class="lead">선생님이 시작하면 캐릭터가 정해져요.<br>태블릿 소리를 켜 두세요.</p>
      <div class="sunset"></div></div>`;
  }
  function Seat() {
    $app().innerHTML = `<div class="wrap center"><div class="logo">마지막 배는 6시</div>
      <h1>자리를 찾는 중…</h1><p class="lead">칠판이 들어갈 방을 고르고 있어요. 잠깐만 기다려 주세요.</p></div>`;
  }
  function Intro() {
    const mine = S.mine;
    $app().innerHTML = `<div class="wrap"><div class="logo">마지막 배는 6시</div>
      <p class="kicker">2026년 11월 · 봉두섬 · 오후 5시 30분</p>
      <h1>${mine.length > 1 ? `캐릭터 ${mine.length}명을 맡았어요` : "오늘 당신은"}</h1>
      <div class="ccards">${mine.map(charCardHTML).join("")}</div>
      ${mine.length > 1 ? `<p class="muted">화면 위 이름표를 눌러 캐릭터를 바꿔 가며 움직여요. 안 쓰는 캐릭터는 따라다닙니다.</p>` : ""}
      <div class="story"><p>졸업한 선배 한서진이 사흘째 연락이 없다.<br>“폐교 방화범, 유튜버 한서진.” 쇼츠 하나가 퍼진다.</p>
      <p>서진을 믿는 우리는 봉두분교로 들어간다.<br>섬을 나가는 마지막 배는 6시.</p></div>
      <button class="pill y big" id="in">폐교로 들어가기</button></div>`;
    document.getElementById("in").onclick = () => { startAudio(); S.entered = true; save(); S.screen = null; route(); sfx.slam(); toast("쾅—! 정문이 닫혔다.", "bad"); };
  }

  /* ================================================================ 플레이 */
  let raf = 0, hudT = 0;
  function Play() {
    startAudio();
    $app().innerHTML = `<div class="game">
      <canvas id="cv"></canvas>
      <div class="hud">
        <div class="tl"><div class="clock" id="clk">5:30</div><div class="left" id="lft"></div></div>
        <div class="tabs" id="tabs"></div>
        <div class="tr"><button class="chip phone" id="hint">📱 <b id="bat">12</b>% · 힌트</button></div>
        <div class="toasts" id="toasts"></div>
        <div class="edge" id="edge">👣</div>
        <div class="joy" id="joy"><i id="knob"></i></div>
        <div class="acts">
          <div class="emos"><button data-e="!">!</button><button data-e="?">?</button><button data-e="도와줘">도와줘</button></div>
          <button class="act" id="clue">📂 단서</button>
          <button class="act" id="hide" hidden>🚪 숨기</button>
          <button class="act y" id="use" hidden>살펴보기</button>
          <button class="act" id="fl">🔦 <span class="batbar"><i id="flb"></i></span></button>
        </div>
        <div class="board" id="ev"></div>
        <div class="tags" id="tags"></div>
      </div>
      <div class="blackout" id="bo">정전</div>
    </div>`;
    import("./world.js?v=202611181648").then(({ createWorld }) => {
      try { S.world = createWorld(document.getElementById("cv"), { pixel: innerWidth > 1400 ? 3 : 2.5 }); }
      catch (e) { toast("3D 화면을 열지 못했어요. 다른 브라우저로 열어 주세요.", "bad"); return; }
      bindInput(); drawHUD(true);
      let last = performance.now();
      const loop = now => { raf = requestAnimationFrame(loop); const dt = Math.min(0.1, (now - last) / 1000); last = now; tick(dt); };
      raf = requestAnimationFrame(loop);
    }).catch(() => toast("게임 파일을 받지 못했어요. 새로 고침해 주세요.", "bad"));
  }
  function stopPlay() { cancelAnimationFrame(raf); if (S.world) S.world.dispose(); S.world = null; closeModal(); }

  /* ---------- 입력: 화면 왼쪽 조이스틱 + 키보드 ---------- */
  function bindInput() {
    const joy = document.getElementById("joy"), knob = document.getElementById("knob");
    let id = null, ox = 0, oy = 0;
    joy.addEventListener("pointerdown", e => { id = e.pointerId; ox = e.clientX; oy = e.clientY; joy.setPointerCapture(id); joy.classList.add("on"); joy.style.setProperty("--x", ox + "px"); joy.style.setProperty("--y", oy + "px"); });
    joy.addEventListener("pointermove", e => {
      if (e.pointerId !== id) return;
      let dx = e.clientX - ox, dy = e.clientY - oy; const d = Math.hypot(dx, dy), R = 55;
      if (d > R) { dx *= R / d; dy *= R / d; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      S.joy = { x: dx / R, z: dy / R };
    });
    const up = e => { if (e.pointerId !== id) return; id = null; S.joy = { x: 0, z: 0 }; knob.style.transform = ""; joy.classList.remove("on"); };
    joy.addEventListener("pointerup", up); joy.addEventListener("pointercancel", up);
    onkeydown = e => { if (document.getElementById("modal")) return; S.keys.add(e.key.toLowerCase()); if (e.key === " ") useNear(); if (e.key.toLowerCase() === "f") toggleFlash(); };
    onkeyup = e => S.keys.delete(e.key.toLowerCase());
    document.getElementById("fl").onclick = toggleFlash;
    document.getElementById("use").onclick = useNear;
    document.getElementById("hide").onclick = toggleHide;
    document.getElementById("clue").onclick = () => showClues(S.active, S.priv && S.priv.clues);
    document.getElementById("hint").onclick = () => {
      if (!S.team) return;
      if (S.team.bat < 2) return toast("서진의 폰 배터리가 다 됐어요.", "bad");
      if (confirmBox("힌트를 볼까요?", "서진의 폰 배터리 2%를 씁니다. 모둠 모두에게 같은 힌트가 떠요.")) send("hint");
    };
    document.querySelectorAll(".emos button").forEach(b => b.onclick = () => { S.emo = { k: b.dataset.e, at: Net.now() }; S.sentKey = ""; });
  }
  /* 브라우저 기본 창(confirm)은 쓰지 않고 바로 실행. 실수 방지는 나중에 화면 안 확인으로 */
  function confirmBox() { return true; }

  const A = () => S.me[S.active];
  function toggleFlash() {
    const m = A(); if (!m) return;
    if (m.hidden) return toast("숨어 있을 땐 손전등을 켤 수 없어요.");
    if (!m.flash && m.bat <= 0) return toast("손전등 배터리가 없어요. 건전지를 찾아보세요.", "bad");
    m.flash = !m.flash; S.sentKey = "";
  }
  function toggleHide() {
    const m = A(); if (!m) return;
    if (m.hidden) { m.hidden = false; toast("사물함에서 나왔다."); }
    else { m.hidden = true; m.flash = false; toast("사물함 안에 숨었다. 숨죽이고…"); }
    S.sentKey = "";
  }

  /* ---------- 가까운 물건 ---------- */
  function nearItem() {
    const m = A(); if (!m || m.hidden) return null;
    let best = null, bd = 9;
    for (const it of MAP.items) {
      if (it.kind === "battery" && S.picked.has(it.id)) continue;
      if (it.kind === "diary" && S.team && S.team.diary && S.team.diary[it.room]) continue;
      const r = it.room === 5 && it.kind === "code" ? 2.6 : NEAR;
      const d = Math.hypot(it.x - m.x, it.z - m.z);
      if (d < r && d < bd) { bd = d; best = it; }
    }
    return best;
  }
  function nearHide() {
    const m = A(); if (!m) return false;
    return MAP.hides.some(([x, z]) => Math.hypot(x - m.x, z - m.z) < 1.0);
  }
  function litDiaries() {
    const m = A(); if (!m || !m.flash) return [];
    return MAP.items.filter(it => it.kind === "diary").filter(it => {
      const dx = it.x - m.x, dz = it.z - m.z, d = Math.hypot(dx, dz);
      return d < 6.5 && Math.abs(angDiff(m.a, Math.atan2(dz, dx))) < 0.5;
    }).map(it => it.id);
  }
  function useNear() {
    const it = nearItem(); if (!it || !S.team) return;
    const e = el(), T = S.team;
    const lockLeft = T.lock && T.lock[it.room] > e ? Math.ceil((T.lock[it.room] - e) / 1000) : 0;
    const lockedText = lockLeft ? `자물쇠가 잠겨 있어요. ${lockLeft}초 뒤에 다시.` : "";
    if (it.kind === "memo") return showMemo(T.bat);
    if (it.kind === "battery") {
      S.picked.add(it.id); const m = A(); m.bat = Math.min(100, m.bat + 40); sfx.pick();
      return toast(`건전지를 넣었다. 손전등 ${Math.round(m.bat)}%`, "good");
    }
    if (it.kind === "diary") {
      if (!litDiaries().includes(it.id)) return toast("뭔가 있는 것 같은데… 손전등으로 비춰 보세요.");
      send("diary", { room: it.room }); showDiary(it.room); return;
    }
    if (T.solved && T.solved[it.room]) return toast("이미 열었어요.");
    if (it.kind === "order") {
      if (T.part && T.part[1] && T.part[1].order) return toast("TV 화면은 이미 원래 순서로 돌아왔어요.");
      return orderPuzzle(SCENE_NAMES, v => send("order", { room: it.room, v }), lockedText);
    }
    if (it.kind === "code") return codePad(it.label, v => send("code", { room: it.room, v }), lockedText);
  }

  /* ---------- 매 장면 ---------- */
  function tick(dt) {
    if (!S.world || !S.team) return;
    const e = el(), T = S.team, now = Net.now();
    const weak = S.pub.cfg && S.pub.cfg.fear === "weak";
    const frozen = S.frozenUntil > now;
    const ended = !!T.end || e >= GAME_MS;

    /* 문: 앞 방을 풀면 열림. 정문은 ④ 다음 */
    [2, 3, 4].forEach(k => S.world.setDoor(k, isOpen(T, k)));
    S.world.setDoor("front", !!(T.solved && T.solved[4]));
    MAP.items.forEach(it => { if (it.kind === "battery") S.world.setItemGone(it.id, S.picked.has(it.id)); if (it.kind === "diary") S.world.setItemGone(it.id, !!(T.diary && T.diary[it.room])); });

    /* 움직이기 */
    const m = A();
    if (m && !frozen && !ended && !document.getElementById("modal")) {
      let vx = S.joy.x, vz = S.joy.z;
      const k = S.keys;
      if (k.has("a") || k.has("arrowleft")) vx -= 1; if (k.has("d") || k.has("arrowright")) vx += 1;
      if (k.has("w") || k.has("arrowup")) vz -= 1; if (k.has("s") || k.has("arrowdown")) vz += 1;
      const l = Math.hypot(vx, vz);
      if (l > 0.15) {
        if (m.hidden) { m.hidden = false; S.sentKey = ""; }
        vx /= Math.max(1, l); vz /= Math.max(1, l);
        const p = S.world.move(m.x, m.z, vx * SPEED * dt, vz * SPEED * dt, S.active);
        m.x = p.x; m.z = p.z; m.a = Math.atan2(vz, vx);
      }
    }
    /* 안 쓰는 내 캐릭터는 따라다님 */
    S.mine.forEach((c, i) => {
      if (c === S.active || !m) return;
      const f = S.me[c]; f.flash = false;
      const dx = m.x - f.x, dz = m.z - f.z, d = Math.hypot(dx, dz);
      if (d > 7) { f.x = m.x - Math.cos(m.a) * 0.8; f.z = m.z - Math.sin(m.a) * 0.8; return; }
      if (d > FOLLOW + i * 0.25 && !m.hidden) {
        const sp = Math.min(SPEED * 1.05 * dt, d - FOLLOW);
        const p = S.world.move(f.x, f.z, dx / d * sp, dz / d * sp, c);
        f.x = p.x; f.z = p.z; f.a = Math.atan2(dz, dx);
      }
      f.hidden = m.hidden && d < 2.5;
    });

    /* 손전등 배터리 */
    if (m && m.flash) { m.bat = Math.max(0, m.bat - FLASH_DRAIN * dt); if (m.bat <= 0) { m.flash = false; toast("손전등이 꺼졌다…", "bad"); } }

    /* 그것 */
    const itp = itPos(e, T.threat);
    let alert = false;
    if (!ended) for (const c of S.mine) {
      const q = S.me[c]; if (!q || q.hidden) continue;
      if (roomAt(q.x, q.z) !== 0 || q.x < 0) continue;              // 방 안·바깥은 안전
      const dx = q.x - itp.x, dz = q.z - itp.z, d = Math.hypot(dx, dz);
      if (d < IT.sight && Math.abs(angDiff(itp.dir, Math.atan2(dz, dx))) < IT.fov) {
        alert = true;
        if (q.flash && now > S.immuneUntil && now > S.frozenUntil) caught(weak);
      }
    }
    /* 발소리 */
    S.stepT -= dt;
    if (m && S.stepT <= 0) { S.stepT = 0.9; itStep(Math.hypot(m.x - itp.x, m.z - itp.z), S.active === "haeun" ? 1.4 : 1); }

    /* 위치 보내기: 움직일 때만, 1초에 5번 */
    if (now - S.sentAt > 200) {
      const out = {};
      for (const c of S.mine) {
        const q = S.me[c];
        out[c] = { x: +q.x.toFixed(2), z: +q.z.toFixed(2), a: +q.a.toFixed(2), f: q.flash ? 1 : 0, h: q.hidden ? 1 : 0,
                   fr: frozen ? 1 : 0, bat: Math.round(q.bat), by: uid, emo: c === S.active && S.emo && now - S.emo.at < 4000 ? S.emo : null };
      }
      const key = JSON.stringify(out);
      if (key !== S.sentKey) { S.sentKey = key; S.sentAt = now; Net.update(P.pos(code, S.tid), out).catch(() => {}); }
    }

    /* 그리기: 내 캐릭터는 바로, 다른 친구 캐릭터는 부드럽게 이어서 */
    const list = [];
    for (const c of S.mine) { const q = S.me[c]; list.push({ id: c, x: q.x, z: q.z, a: q.a, hidden: q.hidden, frozen, me: c === S.active, emo: c === S.active && S.emo && now - S.emo.at < 4000 ? S.emo : null }); }
    for (const [c, p] of Object.entries(S.pos || {})) {
      if (S.mine.includes(c) || !p || p.x == null) continue;
      const D = S.disp[c] || (S.disp[c] = { x: p.x, z: p.z, a: p.a });
      const k = Math.min(1, dt * 10);
      D.x += (p.x - D.x) * k; D.z += (p.z - D.z) * k; D.a += angDiff(D.a, p.a) * k;
      list.push({ id: c, x: D.x, z: D.z, a: D.a, hidden: !!p.h, frozen: !!p.fr, emo: p.emo && now - p.emo.at < 4000 ? p.emo : null });
    }
    const bo = T.bo > e;
    if (bo && S.lastBo !== T.bo) { S.lastBo = T.bo; sfx.blackout(); }
    const near = nearItem();
    const tags = S.world.frame({
      progress: e / GAME_MS, chars: list,
      me: m ? { x: m.x, z: m.z, a: m.a, flash: m.flash && !m.hidden, bat: m.bat } : null,
      it: { x: itp.x, z: itp.z, dir: itp.dir, alert, weak },
      near: near && near.id, lit: litDiaries(),
      static: frozen ? 0.35 + Math.random() * 0.2 : (S.staticUntil > now ? 0.5 : 0),
      dark: bo ? 0.82 : 0
    });
    setDusk(e / GAME_MS);
    drawTags(tags, list);

    hudT -= dt;
    if (hudT <= 0) { hudT = 0.2; drawHUD(false, { e, near, itp, bo, frozen }); }
    if (ended && !S._endShown) { S._endShown = true; setTimeout(() => { S.screen = null; stopPlay(); S.screen = "end"; End(); }, 2500); }
  }

  /* 이름표 · 이모티콘 */
  const tagEls = {};
  function drawTags(tags, list) {
    const box = document.getElementById("tags"); if (!box) return;
    const seen = new Set();
    for (const t of tags) {
      const c = list.find(x => x.id === t.id); seen.add(t.id);
      let e = tagEls[t.id];
      if (!e || !box.contains(e)) { e = tagEls[t.id] = document.createElement("div"); e.className = "tag"; e.style.setProperty("--c", CHARS[t.id].color); box.appendChild(e); }
      const txt = (c.emo ? `<b>${esc(c.emo.k)}</b>` : "") + `<span>${esc(CHARS[t.id].name.slice(1))}</span>`;
      if (e._t !== txt) { e.innerHTML = txt; e._t = txt; }
      e.classList.toggle("me", !!c.me);
      e.style.display = t.on ? "" : "none";
      e.style.transform = `translate(${t.x}px, ${t.y}px)`;
    }
    for (const id in tagEls) if (!seen.has(id)) tagEls[id].style.display = "none";
  }

  function caught(weak) {
    const now = Net.now();
    sfx.caught();
    if (weak) { S.staticUntil = now + 1500; S.immuneUntil = now + 5000; toast("들켰다! (약함 모드: 몸이 굳지는 않아요)", "bad"); return; }
    S.frozenUntil = now + FREEZE_MS; S.immuneUntil = now + FREEZE_MS + 6000;
    S.mine.forEach(c => { const q = S.me[c]; q.bat = Math.max(0, q.bat - 10); });
    toast("들켰다…! 20초 동안 몸이 굳는다. 손전등 배터리 −10%", "bad");
  }

  /* ---------- HUD ---------- */
  function drawHUD(full, x = {}) {
    if (S.screen !== "play" || !S.team) return;
    const T = S.team, $ = id => document.getElementById(id);
    if (!$("clk")) return;
    if (full) {
      $("tabs").innerHTML = S.mine.length > 1 ? S.mine.map(c => `<button data-c="${c}" style="--c:${CHARS[c].color}">${esc(CHARS[c].name)}</button>`).join("") :
        (S.active ? `<span class="solo" style="--c:${CHARS[S.active].color}">${esc(CHARS[S.active].name)}</span>` : "");
      $("tabs").querySelectorAll("button").forEach(b => b.onclick = () => { S.active = b.dataset.c; drawHUD(true); });
    }
    $("tabs").querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.c === S.active));
    const e = x.e != null ? x.e : el();
    $("clk").textContent = clockText(e);
    $("lft").textContent = `배 출발까지 ${leftText(e)}`;
    $("bat").textContent = T.bat;
    const m = A();
    if (m) { $("flb").style.width = Math.round(m.bat) + "%"; $("fl").classList.toggle("off", !m.flash); }
    const near = x.near;
    $("use").hidden = !near; if (near) $("use").textContent = `살펴보기 · ${near.label}`;
    $("hide").hidden = !(nearHide() || (m && m.hidden)); $("hide").textContent = m && m.hidden ? "🚪 나오기" : "🚪 숨기";
    $("bo").classList.toggle("on", !!x.bo);
    /* 하은: ‘그것’ 발소리 방향을 화면 가장자리에 */
    const edge = $("edge");
    if (S.active === "haeun" && m && x.itp) {
      const dx = x.itp.x - m.x, dz = x.itp.z - m.z, d = Math.hypot(dx, dz);
      const W = innerWidth / 2 - 40, Hh = innerHeight / 2 - 60, s = Math.min(W / Math.abs(dx || 1e-6), Hh / Math.abs(dz || 1e-6));
      edge.style.display = d < 18 ? "block" : "none";
      edge.style.transform = `translate(${innerWidth / 2 + dx * s - 20}px, ${innerHeight / 2 + dz * s - 20}px)`;
      edge.style.opacity = Math.max(0.25, 1 - d / 18);
    } else edge.style.display = "none";
    /* 사건 보드 */
    $("ev").innerHTML = [1, 2, 3, 4, 5].map(k => `<i class="${T.solved && T.solved[k] ? "on" : isOpen(T, k) ? "open" : ""}" title="${esc(ROOMS[k].name)}">${k}</i>`).join("")
      + `<span>📔 ${Object.keys(T.diary || {}).length}/5</span>`;
  }

  /* ---------- 모둠 소식 (칠판 판정 결과) ---------- */
  function teamEvents() {
    const T = S.team;
    if (T.msg && JSON.stringify(T.msg) !== S.lastMsg) {
      const first = S.lastMsg === null; S.lastMsg = JSON.stringify(T.msg);
      if (!first && S.screen === "play") { toast(T.msg.text, T.msg.kind); T.msg.kind === "good" ? sfx.good() : T.msg.kind === "bad" ? sfx.bad() : 0; }
    }
    if (T.hint && JSON.stringify(T.hint) !== S.lastHint) {
      const first = S.lastHint === null; S.lastHint = JSON.stringify(T.hint);
      if (!first && S.screen === "play") toast(`📱 힌트 (${ROOMS[T.hint.room].name}): ${T.hint.text}`, "hint", 9000);
    }
    if (S.lastMsg === null) S.lastMsg = JSON.stringify(T.msg || null);
    if (S.lastHint === null) S.lastHint = JSON.stringify(T.hint || null);
  }

  /* ---------- 엔딩 ---------- */
  function End() {
    const T = S.team || {}, kind = T.end || "night";
    const E = {
      true: ["진엔딩", "재희의 집. 서진과 재희가 함께 화면을 본다.", "“이어 줘서 고마워.”", "그리고 열네 살 재희의 사진 한 장."],
      escape: ["탈출 엔딩", "6시 배에 올랐다. 서진의 누명은 벗겨졌다.", "“이어 줘서 고마워.”", "재희의 이야기는 아직 반쯤 남아 있다."],
      night: ["밤샘 엔딩", "배는 떠났다. 다음 날 아침 구조됐다.", "쇼츠는 하루 더 퍼졌다.", ""]
    }[kind];
    $app().innerHTML = `<div class="wrap center end ${kind}"><div class="logo">마지막 배는 6시</div>
      <p class="kicker">${E[0]}</p><h1>${esc(E[1])}</h1><p class="lead big">${esc(E[2])}</p><p class="lead">${esc(E[3])}</p>
      <div class="stats"><div><b>${(T.ev || []).length}</b>증거</div><div><b>${Object.keys(T.diary || {}).length}/5</b>일기장</div><div><b>${T.wrong || 0}</b>틀린 횟수</div></div>
      <p class="muted">칠판을 봐 주세요.</p></div>`;
  }

  /* ---------- 알림 ---------- */
  function toast(text, kind = "info", ms = 4200) {
    const box = document.getElementById("toasts"); if (!box) return;
    const t = document.createElement("div"); t.className = "toast " + kind; t.textContent = text;
    box.appendChild(t); while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => t.classList.add("out"), ms); setTimeout(() => t.remove(), ms + 500);
  }
}

function angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; }
