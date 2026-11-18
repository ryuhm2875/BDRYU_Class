/* ──────────────────────────────────────────────────────────────
   마지막 배는 6시 · 판정 (순수 함수)
   모든 시각은 ‘게임 시작부터 지난 ms’(el).
   who: 지금 일행에 있는 친구들 (환등기·잠긴 앱처럼 특정 친구가 있어야 하는 일)
   ────────────────────────────────────────────────────────────── */
import { ANSWERS, HINTS } from "./answers.js?v=202611182020";
import { ROOMS, isOpen, GAME_MS } from "./data.js?v=202611182020";

export const LOCK_MS = 60000, BLACKOUT_MS = 30000;

export function newTeam(m) {
  return { m, c: {}, solved: {}, part: {}, ev: [], wrong: 0, lock: {}, bo: 0, bat: 12,
           hintN: {}, hint: null, diary: {}, threat: null, end: null, endAt: null, msg: null };
}

/* 방마다 맞혀야 하는 조각 */
export const NEED = { 1: ["order", "edit", "code"], 2: ["crop", "code"], 3: ["sort"], 4: ["accounts"], 5: ["deduce", "rebut"] };

function say(team, el, text, kind = "info") { team.msg = { text, kind, at: el }; }

function wrong(team, room, el, cfg, why) {
  team.wrong++;
  team.lock[room] = el + LOCK_MS;
  team.threat = { room, t: el };                       // ‘그것’이 그 방 쪽으로
  if (team.wrong % 3 === 0 && cfg.fear !== "weak") {
    team.bo = el + BLACKOUT_MS;
    say(team, el, (why ? why + " " : "") + "세 번째 틀림… 건물 전체가 정전됐다.", "bad");
  } else say(team, el, (why ? why + " " : "") + `${ROOMS[room].name} 쪽이 1분 동안 잠긴다. 발소리가 가까워진다…`, "bad");
}

function solve(team, room, el) {
  team.solved[room] = true;
  if (!team.ev.includes(room)) team.ev.push(room);
  say(team, el, `증거를 찾았다: ${ROOMS[room].evidence}`, "good");
  if (room === 5) { team.end = Object.keys(team.diary).length >= 5 ? "true" : "escape"; team.endAt = el; }
}

/* ② 네모가 봉투 든 손을 감쌌는지: 손의 60% 이상을 덮고, 사진의 35% 이하, 재희 얼굴은 빼야 함 */
export function cropOK(r, ans) {
  if (!Array.isArray(r) || r.length !== 4 || r.some(v => typeof v !== "number" || !isFinite(v))) return false;
  const [x, y, w, h] = r, [hx, hy, hw, hh] = ans.hand;
  if (w <= 0 || h <= 0 || w * h > 0.35) return false;
  const ox = Math.max(0, Math.min(x + w, hx + hw) - Math.max(x, hx));
  const oy = Math.max(0, Math.min(y + h, hy + hh) - Math.max(y, hy));
  if (ox * oy < hw * hh * 0.6) return false;
  const [fx, fy] = ans.face;
  return !(fx >= x && fx <= x + w && fy >= y && fy <= y + h);
}
const norm = v => String(v == null ? "" : v).replace(/\s+/g, "").toUpperCase();
const sameSet = (a, b) => Array.isArray(a) && a.length === b.length && [...a].sort().join() === [...b].sort().join();

/* ③ 몇 개가 틀렸는지 (틀린 이유를 알려 주려고) */
export function sortMistakes(v, ans) {
  if (!v || typeof v !== "object") return Object.keys(ans.sort);
  return Object.keys(ans.sort).filter(k => v[k] !== ans.sort[k]);
}

/* 요청 하나 처리. 돌려주는 값: 'right' | 'part' | 'wrong' | 'locked' | 'closed' | 'ignored' */
export function handle(team, req, el, cfg = {}, who = []) {
  if (!team || team.end || el >= GAME_MS) return "ignored";
  const room = +req.room;

  if (req.t === "hint") {
    const r = [1, 2, 3, 4, 5].find(k => !team.solved[k]) || 5;
    if (team.bat < 2) { say(team, el, "서진의 폰 배터리가 없다. 힌트를 쓸 수 없다.", "bad"); return "ignored"; }
    const list = HINTS[r] || [], n = team.hintN[r] || 0;
    team.bat -= 2;
    team.hintN[r] = n + 1;
    team.hint = { room: r, text: list[Math.min(n, list.length - 1)] || "더 줄 힌트가 없어요.", at: el };
    return "right";
  }

  if (!ROOMS[room]) return "ignored";
  if (!isOpen(team, room)) return "closed";

  if (req.t === "diary") {
    team.diary[room] = true;
    say(team, el, `재희의 일기장 ${room}장을 찾았다. (${Object.keys(team.diary).length}/5)`, "good");
    return "right";
  }
  if (team.solved[room]) return "ignored";

  /* ② 환등기: 승우(필름)가 있어야. 틀림으로 치지 않음 */
  if (req.t === "project") {
    if (room !== 2) return "ignored";
    if (!who.includes("minjae")) { say(team, el, "필름이 있어야 한다. 필름은 승우가 갖고 있다."); return "ignored"; }
    if (team.part[2] && team.part[2].proj) return "ignored";
    team.part[2] = Object.assign({}, team.part[2], { proj: true });
    say(team, el, "환등기에 필름을 끼웠다. 벽에 사진 전체가 비친다.", "good");
    return "part";
  }

  if (!NEED[room].includes(req.t)) return "ignored";
  if (req.t === "crop" && !(team.part[2] && team.part[2].proj)) return "ignored";
  if (req.t === "accounts" && !who.includes("seoyul")) { say(team, el, "업로드 기록 앱이 잠겨 있다. 언니 폰 패턴을 아는 사람이 있어야 한다."); return "ignored"; }
  if (req.t === "rebut" && !(team.part[5] && team.part[5].deduce)) return "ignored";
  if ((team.lock[room] || 0) > el) return "locked";

  const ans = ANSWERS[room];
  let ok = false, why = "";
  switch (req.t) {
    case "order": ok = Array.isArray(req.v) && req.v.join() === ans.order.join(); break;
    case "edit": ok = sameSet(req.v, ans.edit); why = ok ? "" : "편집 노트가 맞지 않는다."; break;
    case "crop": ok = cropOK(req.v, ans); break;
    case "code": ok = norm(req.v) === norm(ans.code); break;
    case "sort": { const m = sortMistakes(req.v, ans); ok = !m.length; why = ok ? "" : `테이프 ${m.length}개가 맞지 않는다.`; break; }
    case "accounts": ok = !!req.v && Array.isArray(req.v.order) && req.v.order.join() === ans.order.join() && req.v.src === ans.src;
      why = ok ? "" : (req.v && req.v.order && req.v.order.join() === ans.order.join() ? "순서는 맞는데, 맨 앞 계정이 누구인지가 틀렸다." : "업로드 순서가 맞지 않는다."); break;
    case "deduce": ok = Array.isArray(req.v) && req.v.join() === ans.deduce.join(); why = ok ? "" : "경찰이 고개를 젓는다. “그건 논리가 안 맞잖아.”"; break;
    case "rebut": ok = req.v === ans.rebut && (who.includes("haeun") && who.includes("taeo")); why = ok ? "" : "경찰: “그건 증거가 아니라 네 생각이지.”"; break;
  }
  if (!ok) { wrong(team, room, el, cfg, why); return "wrong"; }

  team.part[room] = Object.assign({}, team.part[room], { [req.t]: true });
  if (NEED[room].every(k => team.part[room][k])) { solve(team, room, el); return "right"; }
  const PART = {
    1: { code: "번호는 맞았다. 그런데 상자가 안 열린다… TV 쪽에 할 일이 남았다.",
         order: "TV 화면이 원래 순서로 돌아왔다. 쇼츠가 무엇을 바꿨는지 편집 노트도 적어 보자.",
         edit: "편집 노트를 다 적었다. 이제 원본 속 벽시계가 몇 시였는지만 알면 된다." },
    2: { crop: "기사가 잘라 낸 곳에 다른 어른이 있었다. 돈봉투를 든 손… 손목시계에 글자가 보인다. (수첩에 확대 사진)",
         code: "글자는 맞았다. 그런데 금고가 덜 열린다… 사진 속에서 찾을 것이 더 있다." },
    5: { deduce: "경찰이 팔짱을 낀다. “좋아, 논리는 맞아. 그런데 벽시계가 고장 났을 수도 있잖아?”" }
  };
  say(team, el, (PART[room] && PART[room][req.t]) || "맞았다.", "good");
  return "part";
}

/* 시간이 다 되면 */
export function timeUp(team, el) {
  if (!team.end && el >= GAME_MS) { team.end = "night"; team.endAt = GAME_MS; return true; }
  return false;
}
