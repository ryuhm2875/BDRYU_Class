/* ──────────────────────────────────────────────────────────────
   마지막 배는 6시 · 판정 (칠판만 실행, 순수 함수)
   모든 시각은 ‘게임 시작부터 지난 ms’(el)로 적어, 기기마다 시계가 달라도 같게 보입니다.
   ────────────────────────────────────────────────────────────── */
import { ANSWERS, HINTS } from "./answers.js?v=202611181648";
import { ROOMS, isOpen, GAME_MS } from "./data.js?v=202611181648";

export const LOCK_MS = 60000, BLACKOUT_MS = 30000;

export function newTeam(m) {
  return { m, c: {}, solved: {}, part: {}, ev: [], wrong: 0, lock: {}, bo: 0, bat: 12,
           hintN: {}, hint: null, diary: {}, threat: null, end: null, endAt: null, msg: null };
}

/* 방 하나의 세부 조각이 다 맞았는지 */
function need(room) { return room === 1 ? ["order", "code"] : ["code"]; }

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

/* 요청 하나 처리. 돌려주는 값: 'right' | 'part' | 'wrong' | 'locked' | 'closed' | 'ignored' */
export function handle(team, req, el, cfg = {}) {
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

  if (req.t !== "order" && req.t !== "code") return "ignored";
  if (team.solved[room]) return "ignored";
  if ((team.lock[room] || 0) > el) return "locked";

  const ans = ANSWERS[room];
  const ok = req.t === "order"
    ? Array.isArray(req.v) && ans.order && req.v.join() === ans.order.join()
    : String(req.v || "").trim() === ans.code;
  if (!ok) { wrong(team, room, el, cfg); return "wrong"; }

  team.part[room] = Object.assign({}, team.part[room], { [req.t]: true });
  if (need(room).every(k => team.part[room][k])) { solve(team, room, el); return "right"; }
  say(team, el, req.t === "code"
    ? "번호는 맞았다. 그런데 상자가 안 열린다… TV 화면을 원래 순서로 돌려야 하나?"
    : "TV 화면이 원래 순서로 돌아왔다. 벽시계가 몇 시였더라?", "good");
  return "part";
}

/* 시간이 다 되면 */
export function timeUp(team, el) {
  if (!team.end && el >= GAME_MS) { team.end = "night"; team.endAt = GAME_MS; return true; }
  return false;
}
