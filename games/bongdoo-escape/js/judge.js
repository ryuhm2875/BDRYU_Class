/* ──────────────────────────────────────────────────────────────
   마지막 배는 6시 · 판정 (칠판만 실행, 순수 함수)
   모든 시각은 ‘게임 시작부터 지난 ms’(el)로 적어, 기기마다 시계가 달라도 같게 보입니다.
   ────────────────────────────────────────────────────────────── */
import { ANSWERS, HINTS } from "./answers.js?v=202611181710";
import { ROOMS, isOpen, GAME_MS } from "./data.js?v=202611181710";

export const LOCK_MS = 60000, BLACKOUT_MS = 30000;

export function newTeam(m) {
  return { m, c: {}, solved: {}, part: {}, ev: [], wrong: 0, lock: {}, bo: 0, bat: 12,
           hintN: {}, hint: null, diary: {}, threat: null, end: null, endAt: null, msg: null };
}

/* 방 하나의 세부 조각이 다 맞았는지 */
function need(room) { return room === 1 ? ["order", "code"] : room === 2 ? ["crop", "code"] : ["code"]; }

function say(team, el, text, kind = "info") { team.msg = { text, kind, at: el }; }

function wrong(team, room, el, cfg) {
  team.wrong++;
  team.lock[room] = el + LOCK_MS;
  team.threat = { room, t: el };                       // ‘그것’이 그 방 쪽으로
  if (team.wrong % 3 === 0 && cfg.fear !== "weak") {
    team.bo = el + BLACKOUT_MS;
    say(team, el, "세 번째 틀림… 건물 전체가 정전됐다.", "bad");
  } else say(team, el, `틀렸다. ${ROOMS[room].name} 자물쇠가 1분 동안 잠긴다. 발소리가 가까워진다…`, "bad");
}

function solve(team, room, el) {
  team.solved[room] = true;
  if (!team.ev.includes(room)) team.ev.push(room);
  say(team, el, `증거를 찾았다: ${ROOMS[room].evidence}`, "good");
  if (room === 5) {
    team.end = Object.keys(team.diary).length >= 5 ? "true" : "escape";
    team.endAt = el;
  }
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

/* 요청 하나 처리. 돌려주는 값: 'right' | 'part' | 'wrong' | 'locked' | 'closed' | 'ignored'
   who: 요청한 학생이 든 캐릭터 (환등기처럼 특정 캐릭터만 할 수 있는 일에 씀) */
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

  /* ② 환등기: 민재(필름)만. 틀림으로 치지 않음 */
  if (req.t === "project") {
    if (room !== 2) return "ignored";
    if (!who.includes("minjae")) { say(team, el, "필름이 있어야 한다. 필름은 민재가 갖고 있다."); return "ignored"; }
    if (team.part[2] && team.part[2].proj) return "ignored";
    team.part[2] = Object.assign({}, team.part[2], { proj: true });
    say(team, el, "환등기에 필름을 끼웠다. 벽에 사진 전체가 비친다.", "good");
    return "part";
  }

  if (!["order", "code", "crop"].includes(req.t)) return "ignored";
  if (req.t === "crop" && !(room === 2 && team.part[2] && team.part[2].proj)) return "ignored";
  if ((team.lock[room] || 0) > el) return "locked";

  const ans = ANSWERS[room];
  const ok = req.t === "order" ? Array.isArray(req.v) && ans.order && req.v.join() === ans.order.join()
    : req.t === "crop" ? cropOK(req.v, ans)
    : norm(req.v) === norm(ans.code);
  if (!ok) { wrong(team, room, el, cfg); return "wrong"; }

  team.part[room] = Object.assign({}, team.part[room], { [req.t]: true });
  if (need(room).every(k => team.part[room][k])) { solve(team, room, el); return "right"; }
  const PART = {
    1: { code: "번호는 맞았다. 그런데 상자가 안 열린다… TV 화면을 원래 순서로 돌려야 하나?",
         order: "TV 화면이 원래 순서로 돌아왔다. 벽시계가 몇 시였더라?" },
    2: { crop: "기사가 잘라 낸 곳에 다른 어른이 있었다. 돈봉투를 든 손… 손목시계에 글자가 보인다. (단서에 확대 사진)",
         code: "글자는 맞았다. 그런데 금고가 덜 열린다… 사진 속에서 찾을 것이 더 있다." }
  };
  say(team, el, PART[room][req.t], "good");
  return "part";
}

/* 시간이 다 되면 */
export function timeUp(team, el) {
  if (!team.end && el >= GAME_MS) { team.end = "night"; team.endAt = GAME_MS; return true; }
  return false;
}
