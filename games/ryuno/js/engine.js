/* ──────────────────────────────────────────────────────────────
   RYUNO · 규칙 엔진 (화면과 상관없는 순수 계산)
   심판 기기(칠판)만 이 엔진으로 판을 움직입니다.
   테이블 하나 = 게임 한 판. 상태는 JSON 으로 저장할 수 있는 값만 씁니다.

   [고정 규칙]
   · 7장씩. 첫 바닥 카드는 자음 카드가 나올 때까지 다시 뒤집기
   · 같은 색 / 같은 조음 위치 / 같은 소리 세기 / 같은 글자 / 같은 특수 기호면 낼 수 있음
   · 낼 카드가 없으면 1장 뽑기. 뽑은 카드를 낼 수 있으면 바로 내거나 넘기기
   · 건너뛰기, 방향 반대(2명이면 건너뛰기), +2(받고 쉼), 와일드(색 고름),
     +4(색 고름, 다음 사람은 방어 문제: 맞히면 2장 · 틀리면 4장, 그리고 쉼)
   · 쌓기 없음, +4 이의 제기 없음
   · 1장 남으면 류노! 다음 사람이 움직이기 전에 남이 먼저 [잡았다] → 2장
   · 음운 변동 콤보(비음화·유음화) → 다음 사람 1장
   · 차례마다 20초. 지나면 자동으로 1장 뽑고 넘어감
   ────────────────────────────────────────────────────────────── */
import { DECK, CONS, COLORS, findCombo } from "./cards.js?v=202611061325";
import { shuffle, cryptoInt } from "./rng.js?v=202611061325";

export const RULES = {
  hand: 7,
  turnMs: 20000,
  afterDrawMs: 10000,
  quizMs: 12000,
  unoPenalty: 2,
  w4: 4,
  w4Defended: 2,
  minPlayers: 2,
  maxPlayers: 6
};

let RINT = cryptoInt;
export function useRng(rint) { RINT = rint || cryptoInt; }

/* ---------- 낼 수 있는지와 그 까닭 ----------
   돌려주는 값: 'wild' 'same' 'color' 'place' 'strength' 'symbol' 또는 null */
export function matchReason(cardIdx, topIdx, color) {
  const c = DECK[cardIdx], t = topIdx == null ? null : DECK[topIdx];
  if (c.k === "wild" || c.k === "w4") return "wild";
  if (t && c.k === "n" && t.k === "n" && c.j === t.j) return "same";
  if (c.c === color) return "color";
  if (!t) return null;
  if (c.k !== "n" && c.k === t.k) return "symbol";
  if (c.k === "n" && t.k === "n") {
    const a = CONS[c.j], b = CONS[t.j];
    if (a.p === b.p) return "place";
    if (a.s && a.s === b.s) return "strength";
  }
  return null;
}
export const REASON_TEXT = {
  wild: "와일드!",
  same: "같은 글자!",
  color: null,                        // 색이 같을 때는 따로 말하지 않음 (아래 colorText)
  place: p => `${p}소리끼리 연결!`,
  strength: s => `${s}소리끼리 연결!`,
  symbol: "같은 기호!"
};

/* ---------- 새 판 ---------- */
export function newTable(id, pids, now) {
  if (pids.length < RULES.minPlayers || pids.length > RULES.maxPlayers) throw new Error("인원");
  const draw = shuffle(DECK.map(c => c.i), RINT);
  const hands = {};
  pids.forEach(p => hands[p] = []);
  for (let r = 0; r < RULES.hand; r++) for (const p of pids) hands[p].push(draw.pop());
  /* 첫 바닥 카드: 자음 카드가 나올 때까지. 아니면 더미 아무 곳에 다시 넣음 */
  let top = draw.pop();
  while (DECK[top].k !== "n") {
    draw.splice(RINT(draw.length + 1), 0, top);
    top = draw.pop();
  }
  const T = {
    id, players: pids.slice(), hands, draw, disc: [top],
    color: DECK[top].c, dir: 1, turn: RINT(pids.length),
    phase: "play", seq: 0, deadline: 0, drawn: null,
    uno: null, ready: {}, quiz: null, winner: null, evn: 0, ev: []
  };
  startTurn(T, now);
  return T;
}

/* ---------- 도우미 ---------- */
const N = T => T.players.length;
export const curPid = T => T.players[T.turn];
const idxAfter = (T, steps) => ((T.turn + T.dir * steps) % N(T) + N(T) * 2) % N(T);
const nextPid = T => T.players[idxAfter(T, 1)];
const topIdx = T => T.disc[T.disc.length - 1];
function advance(T, steps) { T.turn = idxAfter(T, steps); }
function startTurn(T, now) {
  T.deadline = now + RULES.turnMs;
  T.drawn = null;
  T.seq++;
}
function emit(T, e) { T.evn++; T.ev.push(Object.assign({ n: T.evn }, e)); if (T.ev.length > 12) T.ev.shift(); }

/* 더미가 떨어지면 맨 위 한 장만 남기고 버린 카드를 섞어 새 더미로 */
function recycle(T) {
  if (T.disc.length <= 1) return false;
  const top = T.disc.pop();
  T.draw = shuffle(T.disc, RINT);
  T.disc = [top];
  emit(T, { t: "recycle", count: T.draw.length });
  return true;
}
function give(T, pid, n) {
  let got = 0;
  for (let i = 0; i < n; i++) {
    if (!T.draw.length && !recycle(T)) break;
    T.hands[pid].push(T.draw.pop()); got++;
  }
  if (T.hands[pid].length > 1) delete T.ready[pid];
  return got;
}
/* 다른 사람이 움직이면 류노 빈틈은 닫힘 */
function closeUno(T, byPid) { if (T.uno && T.uno.pid !== byPid) T.uno = null; }

export function playable(T, pid) {
  if (T.phase !== "play" || curPid(T) !== pid) return [];
  const pool = T.drawn != null ? [T.drawn] : T.hands[pid];
  return pool.filter(i => matchReason(i, topIdx(T), T.color));
}

/* ================================================================
   행동 처리.  a = { t, seq, card, color, uno, choice }
   돌려주는 값: { ok:true } 또는 { ok:false, err }
   ================================================================ */
export function act(T, pid, a, now, quizPick) {
  if (T.phase === "end") return no("끝난 판");
  if (!T.players.includes(pid)) return no("이 판 사람이 아님");
  switch (a.t) {
    case "play":   return play(T, pid, a, now, quizPick);
    case "draw":   return draw(T, pid, a, now);
    case "pass":   return pass(T, pid, a, now);
    case "uno":    return uno(T, pid);
    case "catch":  return catchUno(T, pid);
    case "answer": return answer(T, pid, a, now);
  }
  return no("모르는 행동");
}
const no = err => ({ ok: false, err });
const yes = { ok: true };

function myTurn(T, pid, a) {
  if (T.phase !== "play") return "지금은 낼 수 없음";
  if (curPid(T) !== pid) return "내 차례가 아님";
  if (a.seq != null && a.seq !== T.seq) return "이미 바뀐 판";   // 두 번 누름·늦은 요청 막기
  return null;
}

function play(T, pid, a, now, quizPick) {
  const bad = myTurn(T, pid, a); if (bad) return no(bad);
  const card = a.card, hand = T.hands[pid];
  const at = hand.indexOf(card);
  if (at < 0) return no("손에 없는 카드");
  if (T.drawn != null && card !== T.drawn) return no("뽑은 카드만 낼 수 있음");
  const top = topIdx(T);
  const why = matchReason(card, top, T.color);
  if (!why) return no("낼 수 없는 카드");
  const C = DECK[card];
  if ((C.k === "wild" || C.k === "w4") && !COLORS.includes(a.color)) return no("색을 골라야 함");

  closeUno(T, pid);
  hand.splice(at, 1);
  T.disc.push(card);
  T.color = C.c || a.color;
  const combo = (C.k === "n" && DECK[top].k === "n") ? findCombo(DECK[top].j, C.j) : null;
  const ev = { t: "play", pid, card, why, color: T.color };
  if (why === "place") ev.via = CONS[C.j].p;
  if (why === "strength") ev.via = CONS[C.j].s;
  emit(T, ev);

  /* 다 냈으면 승리 */
  if (!hand.length) {
    T.phase = "end"; T.winner = pid; T.uno = null; T.seq++;
    emit(T, { t: "win", pid });
    return yes;
  }
  /* 1장 남음: 미리 류노를 눌렀으면 안전, 아니면 빈틈 */
  if (hand.length === 1) {
    if (a.uno || T.ready[pid]) { T.uno = { pid, safe: true }; emit(T, { t: "uno", pid }); }
    else T.uno = { pid, safe: false };
  }
  delete T.ready[pid];

  switch (C.k) {
    case "skip": {
      const v = nextPid(T); advance(T, 2);
      emit(T, { t: "skip", pid: v });
      break;
    }
    case "rev": {
      if (N(T) === 2) { const v = nextPid(T); advance(T, 2); emit(T, { t: "rev", two: true, pid: v }); }
      else { T.dir *= -1; advance(T, 1); emit(T, { t: "rev", dir: T.dir }); }
      break;
    }
    case "d2": {
      const v = nextPid(T); const got = give(T, v, 2); advance(T, 2);
      emit(T, { t: "d2", pid: v, got });
      break;
    }
    case "w4": {
      const v = nextPid(T);
      const q = quizPick ? quizPick(v) : null;
      if (q) {
        T.phase = "quiz";
        T.quiz = { target: v, by: pid, id: q.id, q: q.q, opts: q.opts, a: q.a, ex: q.ex, deadline: now + RULES.quizMs };
        T.seq++;
        emit(T, { t: "w4", pid: v, quiz: true });
        return yes;
      }
      const got = give(T, v, RULES.w4); advance(T, 2);
      emit(T, { t: "w4", pid: v, got });
      break;
    }
    case "wild":
      advance(T, 1);
      break;
    default: {                        // 자음 카드
      if (combo) {
        const v = nextPid(T); const got = give(T, v, 1);
        emit(T, { t: "combo", pid: v, got, name: combo.name, show: combo.show, ex: combo.ex });
      }
      advance(T, 1);
    }
  }
  startTurn(T, now);
  return yes;
}

function draw(T, pid, a, now) {
  const bad = myTurn(T, pid, a); if (bad) return no(bad);
  if (T.drawn != null) return no("이미 뽑았음");
  closeUno(T, pid);
  const got = give(T, pid, 1);
  emit(T, { t: "draw", pid, got });
  if (!got) { advance(T, 1); startTurn(T, now); return yes; }
  const c = T.hands[pid][T.hands[pid].length - 1];
  if (matchReason(c, topIdx(T), T.color)) {
    T.drawn = c; T.deadline = now + RULES.afterDrawMs; T.seq++;
  } else {
    advance(T, 1); startTurn(T, now);
  }
  return yes;
}

function pass(T, pid, a, now) {
  const bad = myTurn(T, pid, a); if (bad) return no(bad);
  if (T.drawn == null) return no("뽑기 전에는 넘길 수 없음");
  emit(T, { t: "pass", pid });
  advance(T, 1); startTurn(T, now);
  return yes;
}

function uno(T, pid) {
  if (T.uno && T.uno.pid === pid) {
    if (T.uno.safe) return no("이미 외침");
    T.uno.safe = true; emit(T, { t: "uno", pid }); return yes;
  }
  if (T.phase === "play" && curPid(T) === pid && T.hands[pid].length === 2) {
    T.ready[pid] = true; emit(T, { t: "ready", pid }); return yes;
  }
  return no("지금은 류노를 외칠 때가 아님");
}

function catchUno(T, pid) {
  const u = T.uno;
  if (!u || u.safe || u.pid === pid || T.hands[u.pid].length !== 1) return no("늦었음");
  const got = give(T, u.pid, RULES.unoPenalty);
  T.uno = null;
  emit(T, { t: "catch", pid: u.pid, by: pid, got });
  return yes;
}

function answer(T, pid, a, now) {
  if (T.phase !== "quiz" || !T.quiz || T.quiz.target !== pid) return no("문제를 풀 차례가 아님");
  return resolveQuiz(T, a.choice === T.quiz.a, a.choice, now);
}
function resolveQuiz(T, ok, choice, now) {
  const Q = T.quiz, v = Q.target;
  const got = give(T, v, ok ? RULES.w4Defended : RULES.w4);
  emit(T, { t: "quizres", pid: v, ok, got, choice: choice ?? null, a: Q.a, ex: Q.ex, q: Q.q, opts: Q.opts });
  T.quiz = null; T.phase = "play";
  T.turn = T.players.indexOf(v);
  advance(T, 1);                       // 문제를 푼 사람은 차례를 쉼
  startTurn(T, now);
  return yes;
}

/* ---------- 시간 흐름: 심판이 0.25초마다 부름. 바뀐 게 있으면 true ---------- */
export function tick(T, now) {
  if (T.phase === "quiz" && T.quiz && now > T.quiz.deadline) {
    resolveQuiz(T, false, null, now);
    return true;
  }
  if (T.phase === "play" && now > T.deadline) {
    const pid = curPid(T);
    closeUno(T, pid);
    if (T.drawn != null) {
      emit(T, { t: "timeout", pid, drew: false });
    } else {
      const got = give(T, pid, 1);
      emit(T, { t: "timeout", pid, drew: !!got });
    }
    advance(T, 1); startTurn(T, now);
    return true;
  }
  return false;
}

/* 선생님이 카드를 더 줄 때 */
export function forceGive(T, pid, n) {
  if (T.phase === "end" || !T.hands[pid]) return 0;
  if (T.uno && T.uno.pid === pid) T.uno = null;
  const got = give(T, pid, n);
  T.seq++;
  emit(T, { t: "gift", pid, got });
  return got;
}

/* 일시 정지 뒤 다시 시작: 남은 시간을 그대로 이어 가도록 마감 시각을 미룸 */
export function shiftTime(T, ms) {
  T.deadline += ms;
  if (T.quiz) T.quiz.deadline += ms;
}

/* 사람이 판에서 빠질 때 (선생님이 내보내기 등). 그 사람 카드는 더미 밑으로 */
export function removePlayer(T, pid, now) {
  const at = T.players.indexOf(pid);
  if (at < 0 || T.phase === "end") return false;
  const wasTurn = at === T.turn;
  T.draw.unshift(...T.hands[pid]);
  delete T.hands[pid]; delete T.ready[pid];
  if (T.uno && T.uno.pid === pid) T.uno = null;
  T.players.splice(at, 1);
  let quizGone = null;
  if (T.quiz && T.quiz.target === pid) { quizGone = T.quiz.by; T.quiz = null; T.phase = "play"; }
  if (T.players.length < 2) {
    T.phase = "end"; T.winner = T.players[0] || null; T.seq++;
    emit(T, { t: "win", pid: T.winner, left: true });
    return true;
  }
  if (at < T.turn) T.turn--;
  if (T.turn >= T.players.length) T.turn = 0;
  if (quizGone != null && T.players.includes(quizGone)) {
    T.turn = T.players.indexOf(quizGone); advance(T, 1); startTurn(T, now);   // +4 낸 사람 다음으로
  } else if (wasTurn) {
    if (T.dir < 0) T.turn = (T.turn - 1 + T.players.length) % T.players.length;
    startTurn(T, now);
  } else T.seq++;
  emit(T, { t: "leave", pid });
  return true;
}

/* 테이블 수 정하기: 정한 인원(size)을 넘지 않게 나누되,
   3명 이상이면 2명짜리 테이블이 생기지 않게 테이블 수를 줄임 (그때는 size+1 명까지) */
export function tableCount(n, size) {
  if (n < 2) return 0;
  let k = Math.ceil(n / size);
  while (k > 1 && Math.floor(n / k) < 3) k--;
  while (Math.ceil(n / k) > RULES.maxPlayers) k++;
  return k;
}

/* 남은 카드 수 순위 (우승자 먼저) */
export function ranking(T) {
  return T.players.slice().sort((a, b) => (a === T.winner ? -1 : b === T.winner ? 1 : T.hands[a].length - T.hands[b].length));
}

/* 칠판·학생 모두가 보는 공개 정보 (손패 내용은 빠짐) */
export function publicView(T) {
  return {
    p: T.players,
    n: Object.fromEntries(T.players.map(p => [p, T.hands[p].length])),
    turn: T.phase === "end" ? null : curPid(T),
    dir: T.dir, top: topIdx(T), color: T.color, deck: T.draw.length,
    phase: T.phase, seq: T.seq, dl: T.deadline,
    drawn: T.drawn != null ? curPid(T) : null,
    uno: T.uno, ready: Object.keys(T.ready),
    quiz: T.quiz ? { target: T.quiz.target, by: T.quiz.by, q: T.quiz.q, opts: T.quiz.opts, dl: T.quiz.deadline } : null,
    winner: T.winner, ev: T.ev.slice(-6)
  };
}
