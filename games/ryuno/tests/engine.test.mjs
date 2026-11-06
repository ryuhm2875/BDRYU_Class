/* 엔진 시험:  node games/ryuno/tests/engine.test.mjs
   1) 연결 규칙 하나하나  2) 특수 카드·류노·콤보·방어 문제  3) 무작위 자동 대전 수천 판  4) 섞기 고르기 */
import assert from "node:assert/strict";
import { DECK, CONS, COLORS } from "../js/cards.js";
import { shuffle, seeded } from "../js/rng.js";
import * as E from "../js/engine.js";

const idx = (k, c, j) => DECK.find(x => x.k === k && x.c === c && x.j === j).i;
const n = j => idx("n", CONS[j].c, j);
let pass = 0; const ok = (cond, msg) => { assert.ok(cond, msg); pass++; };

/* ---------- 1. 카드 구성 ---------- */
ok(DECK.length === 110, "110장");
for (const c of COLORS) ok(DECK.filter(x => x.c === c && x.k === "n").length === 18, c + " 자음 18장");
ok(DECK.filter(x => x.k === "wild").length === 10 && DECK.filter(x => x.k === "w4").length === 4, "와일드 10 · +4 4");

/* ---------- 2. 연결 규칙 ---------- */
const R = E.matchReason;
ok(R(n("ㅂ"), n("ㄷ"), "red") === "color", "ㄷ→ㅂ 같은 색");
ok(R(n("ㄴ"), n("ㄷ"), "red") === "place", "ㄷ→ㄴ 잇몸");
ok(R(n("ㅈ"), n("ㄷ"), "red") === "strength", "ㄷ→ㅈ 예사");
ok(R(n("ㅊ"), n("ㅋ"), "red") === "strength", "ㅋ→ㅊ 거센");
ok(R(n("ㅉ"), n("ㅆ"), "blue") === "strength", "ㅆ→ㅉ 된");
ok(R(n("ㅎ"), n("ㄱ"), "red") === null, "ㄱ→ㅎ 안 됨");
ok(R(n("ㅁ"), n("ㅎ"), "blue") === null, "ㅎ→ㅁ 안 됨");
ok(R(n("ㅇ"), n("ㄱ"), "red") === "place", "ㄱ→ㅇ 여린입천장");
ok(R(n("ㄹ"), n("ㅂ"), "red") === null, "ㅂ→ㄹ 안 됨 (울림소리는 세기로 못 이음)");
ok(R(idx("skip", "blue", null), idx("skip", "red", null), "red") === "symbol", "건너뛰기끼리");
ok(R(idx("skip", "blue", null), n("ㄱ"), "red") === null, "자음 위에 다른 색 특수 X");
const w = DECK.find(x => x.k === "wild").i;
ok(R(n("ㄱ"), w, "blue") === null && R(n("ㅅ"), w, "blue") === "color", "와일드 뒤에는 고른 색만");
ok(R(w, n("ㄱ"), "red") === "wild", "와일드는 어디든");

/* ---------- 3. 정해진 판으로 특수 카드 확인 ---------- */
function rig(players, hands, top, extra = {}) {
  const used = new Set([top, ...Object.values(hands).flat()]);
  const T = {
    id: "t", players, hands: structuredClone(hands), draw: DECK.map(c => c.i).filter(i => !used.has(i)),
    disc: [top], color: DECK[top].c, dir: 1, turn: 0, phase: "play", seq: 1, deadline: 1e12, drawn: null,
    uno: null, ready: {}, quiz: null, winner: null, evn: 0, ev: [], ...extra
  };
  return T;
}
const pick = (k, c, j, nth = 0) => DECK.filter(x => x.k === k && x.c === c && x.j === j)[nth].i;
const fill = (c, cnt) => DECK.filter(x => x.k === "n" && x.c === c).slice(0, cnt).map(x => x.i);

{ // 건너뛰기
  const T = rig(["A", "B", "C"], { A: [pick("skip", "red", null), ...fill("blue", 2)], B: fill("yel", 3), C: fill("grn", 3) }, pick("n", "red", "ㄱ"));
  ok(E.act(T, "A", { t: "play", card: T.hands.A[0], seq: 1 }, 0).ok, "건너뛰기 냄");
  ok(E.curPid(T) === "C", "B 건너뜀 → C");
}
{ // 방향 반대 (3명) 와 (2명)
  const T = rig(["A", "B", "C"], { A: [pick("rev", "red", null), ...fill("blue", 2)], B: fill("yel", 3), C: fill("grn", 3) }, pick("n", "red", "ㄱ"));
  E.act(T, "A", { t: "play", card: T.hands.A[0] }, 0);
  ok(E.curPid(T) === "C" && T.dir === -1, "3명 반대 → C");
  const T2 = rig(["A", "B"], { A: [pick("rev", "red", null), ...fill("blue", 2)], B: fill("yel", 3) }, pick("n", "red", "ㄱ"));
  E.act(T2, "A", { t: "play", card: T2.hands.A[0] }, 0);
  ok(E.curPid(T2) === "A", "2명 반대 = 건너뛰기 → 다시 A");
}
{ // +2
  const T = rig(["A", "B", "C"], { A: [pick("d2", "red", null), ...fill("blue", 2)], B: fill("yel", 3), C: fill("grn", 3) }, pick("n", "red", "ㄱ"));
  E.act(T, "A", { t: "play", card: T.hands.A[0] }, 0);
  ok(T.hands.B.length === 5 && E.curPid(T) === "C", "+2: B 5장, C 차례");
}
{ // +4 방어 성공·실패
  const w4 = DECK.find(x => x.k === "w4").i;
  const q = () => ({ id: "x", q: "?", opts: ["가", "나"], a: 1, ex: "" });
  const T = rig(["A", "B", "C"], { A: [w4, ...fill("blue", 2)], B: fill("yel", 3), C: fill("grn", 3) }, pick("n", "red", "ㄱ"));
  ok(!E.act(T, "A", { t: "play", card: w4 }, 0, q).ok, "+4 색 없이 X");
  ok(E.act(T, "A", { t: "play", card: w4, color: "grn" }, 0, q).ok && T.phase === "quiz" && T.quiz.target === "B", "+4 → B 문제");
  ok(!E.act(T, "C", { t: "answer", choice: 1 }, 0).ok, "C는 못 풂");
  E.act(T, "B", { t: "answer", choice: 1 }, 0);
  ok(T.hands.B.length === 5 && E.curPid(T) === "C" && T.color === "grn", "맞힘 → 2장, C 차례");
  const T2 = rig(["A", "B", "C"], { A: [w4, ...fill("blue", 2)], B: fill("yel", 3), C: fill("grn", 3) }, pick("n", "red", "ㄱ"));
  E.act(T2, "A", { t: "play", card: w4, color: "yel" }, 0, q);
  E.tick(T2, 2e12);
  ok(T2.hands.B.length === 7 && E.curPid(T2) === "C", "시간 초과 → 4장");
}
{ // 콤보: ㄷ 위에 ㄴ
  const T = rig(["A", "B"], { A: [pick("n", "grn", "ㄴ"), ...fill("blue", 2)], B: fill("yel", 3) }, pick("n", "red", "ㄷ"));
  E.act(T, "A", { t: "play", card: T.hands.A[0] }, 0);
  ok(T.hands.B.length === 4 && T.ev.some(e => e.t === "combo" && e.name === "비음화"), "비음화 콤보 → B 1장");
  ok(E.curPid(T) === "B", "콤보 뒤에도 B 차례");
}
{ // 류노: 안 외침 → 잡힘 / 외침 → 안전 / 미리 외침
  const T = rig(["A", "B", "C"], { A: [pick("n", "red", "ㄱ", 1), pick("n", "blue", "ㅅ")], B: fill("yel", 3), C: fill("grn", 3) }, pick("n", "red", "ㄷ"));
  E.act(T, "A", { t: "play", card: T.hands.A[0] }, 0);
  ok(T.uno && !T.uno.safe, "1장 남음 → 빈틈");
  ok(!E.act(T, "A", { t: "catch" }, 0).ok, "자기 자신은 못 잡음");
  ok(E.act(T, "C", { t: "catch" }, 0).ok && T.hands.A.length === 3, "C가 잡음 → A 3장");
  ok(!E.act(T, "B", { t: "catch" }, 0).ok, "두 번 못 잡음");

  const T2 = rig(["A", "B", "C"], { A: [pick("n", "red", "ㄱ", 1), pick("n", "blue", "ㅅ")], B: fill("yel", 3), C: fill("grn", 3) }, pick("n", "red", "ㄷ"));
  E.act(T2, "A", { t: "play", card: T2.hands.A[0] }, 0);
  ok(E.act(T2, "A", { t: "uno" }, 0).ok && T2.uno.safe, "곧바로 외침 → 안전");
  ok(!E.act(T2, "C", { t: "catch" }, 0).ok, "안전하면 못 잡음");

  const T3 = rig(["A", "B", "C"], { A: [pick("n", "red", "ㄱ", 1), pick("n", "blue", "ㅅ")], B: fill("yel", 3), C: fill("grn", 3) }, pick("n", "red", "ㄷ"));
  ok(E.act(T3, "A", { t: "uno" }, 0).ok, "2장일 때 미리 외침");
  E.act(T3, "A", { t: "play", card: T3.hands.A[0] }, 0);
  ok(T3.uno && T3.uno.safe, "미리 외쳤으면 안전");

  const T4 = rig(["A", "B", "C"], { A: [pick("n", "red", "ㄱ", 1), pick("n", "blue", "ㅅ")], B: [pick("n", "red", "ㅂ"), ...fill("yel", 2)], C: fill("grn", 3) }, pick("n", "red", "ㄷ"));
  E.act(T4, "A", { t: "play", card: T4.hands.A[0] }, 0);
  E.act(T4, "B", { t: "play", card: T4.hands.B[0] }, 0);
  ok(T4.uno === null && !E.act(T4, "C", { t: "catch" }, 0).ok, "다음 사람이 움직이면 못 잡음");
}
{ // 뽑기 → 낼 수 있으면 내거나 넘기기, 늦은 요청 막기
  const T = rig(["A", "B"], { A: fill("blue", 2), B: fill("yel", 3) }, pick("n", "red", "ㄷ"));
  T.draw.push(pick("n", "red", "ㅂ"));
  ok(!E.act(T, "A", { t: "pass", seq: 1 }, 0).ok, "뽑기 전 넘기기 X");
  ok(E.act(T, "A", { t: "draw", seq: 1 }, 0).ok && T.drawn != null && E.curPid(T) === "A", "낼 수 있는 카드 뽑음 → 아직 A");
  ok(!E.act(T, "A", { t: "draw", seq: 1 }, 0).ok, "옛 번호로 다시 누름 → 막힘");
  ok(!E.act(T, "A", { t: "play", card: T.hands.A[0], seq: T.seq }, 0).ok, "뽑은 카드 말고는 못 냄");
  ok(E.act(T, "A", { t: "pass", seq: T.seq }, 0).ok && E.curPid(T) === "B", "넘기기 → B");
  ok(!E.act(T, "A", { t: "draw", seq: T.seq }, 0).ok, "남의 차례에 X");
}
{ // 시간 초과 → 1장 뽑고 넘어감
  const T = rig(["A", "B"], { A: fill("blue", 2), B: fill("yel", 3) }, pick("n", "red", "ㄷ"));
  E.tick(T, 2e12);
  ok(T.hands.A.length === 3 && E.curPid(T) === "B", "시간 초과");
}
{ // 더미 재활용
  const T = rig(["A", "B"], { A: fill("blue", 2), B: fill("yel", 3) }, pick("n", "red", "ㄷ"));
  T.disc = [...T.draw.slice(0, 50), pick("n", "red", "ㄷ")]; T.draw = T.draw.slice(50);
  const total = () => T.draw.length + T.disc.length + T.hands.A.length + T.hands.B.length;
  const before = total();
  for (let i = 0; i < 80; i++) { T.turn = 0; T.drawn = null; T.seq = 1; E.act(T, "A", { t: "draw", seq: 1 }, 0); }
  ok(total() === before && T.disc.length >= 1, "재활용해도 장수 그대로");
}
{ // 판에서 빠지기
  const T = rig(["A", "B", "C"], { A: fill("blue", 2), B: fill("yel", 3), C: fill("grn", 3) }, pick("n", "red", "ㄷ"));
  E.removePlayer(T, "A", 0);
  ok(T.players.length === 2 && E.curPid(T) === "B", "차례인 A가 빠지면 B");
  E.removePlayer(T, "C", 0);
  ok(T.phase === "end" && T.winner === "B", "한 명 남으면 끝");
}

/* ---------- 4. 무작위 자동 대전 ---------- */
function check(T) {
  const all = [...T.draw, ...T.disc, ...Object.values(T.hands).flat()];
  assert.equal(all.length, 110, "카드 수");
  assert.equal(new Set(all).size, 110, "같은 카드 두 장");
  assert.ok(COLORS.includes(T.color), "색");
}
const QP = () => ({ id: "q", q: "?", opts: ["a", "b", "c", "d"], a: 2, ex: "" });
let games = 0, turnsMax = 0, events = {};
for (let g = 0; g < 3000; g++) {
  const rint = seeded(g + 1); E.useRng(rint);
  const np = 2 + (g % 5);
  const ps = Array.from({ length: np }, (_, i) => "P" + i);
  const T = E.newTable("t", ps, 0);
  check(T);
  let now = 0, steps = 0;
  while (T.phase !== "end" && steps < 5000) {
    steps++; now += 100;
    const r = rint(100);
    if (T.phase === "quiz") {
      if (r < 10) E.tick(T, T.quiz.deadline + 1);
      else E.act(T, T.quiz.target, { t: "answer", choice: rint(4) }, now);
    } else if (r < 3) {
      E.tick(T, T.deadline + 1); now = T.deadline - E.RULES.turnMs;
    } else if (r < 8 && T.uno && !T.uno.safe) {
      const others = ps.filter(p => p !== T.uno.pid && T.players.includes(p));
      E.act(T, others[rint(others.length)], { t: "catch" }, now);
    } else if (r < 12 && T.uno && !T.uno.safe) {
      E.act(T, T.uno.pid, { t: "uno" }, now);
    } else if (r < 14) {
      E.act(T, ps[rint(ps.length)], { t: "play", card: rint(110), seq: T.seq }, now);   // 엉뚱한 요청
    } else if (r === 14 && T.players.length > 2) {
      E.removePlayer(T, T.players[rint(T.players.length)], now);
    } else {
      const me = E.curPid(T), can = E.playable(T, me);
      if (E.RULES && T.hands[me].length === 2 && rint(2)) E.act(T, me, { t: "uno" }, now);
      if (can.length && rint(10)) {
        const c = can[rint(can.length)];
        E.act(T, me, { t: "play", card: c, color: COLORS[rint(4)], seq: T.seq }, now, rint(5) ? QP : null);
      } else if (T.drawn != null) E.act(T, me, { t: "pass", seq: T.seq }, now);
      else E.act(T, me, { t: "draw", seq: T.seq }, now);
    }
    if (T.phase !== "end") check(T);
    for (const e of T.ev) events[e.t] = (events[e.t] || 0) + 1;
  }
  assert.equal(T.phase, "end", `판 ${g} 끝나지 않음`);
  assert.ok(T.winner == null || T.players.includes(T.winner));
  if (T.winner && !T.ev.some(e => e.left)) assert.equal(T.hands[T.winner].length, 0, "우승자 0장");
  games++; turnsMax = Math.max(turnsMax, steps);
}
E.useRng(null);
ok(games === 3000, "자동 대전 3000판 모두 끝남");

/* ---------- 5. 섞기 고르기 (카이제곱) ---------- */
const K = 110, RUNS = 110000, cnt = Array.from({ length: K }, () => new Array(K).fill(0));
const base = DECK.map(c => c.i);
for (let r = 0; r < RUNS; r++) { const s = shuffle(base); for (let p = 0; p < K; p++) cnt[s[p]][p]++; }
const exp = RUNS / K;
let worst = 0, chiAll = [];
for (let c = 0; c < K; c++) {
  let chi = 0; for (let p = 0; p < K; p++) chi += (cnt[c][p] - exp) ** 2 / exp;
  chiAll.push(chi); worst = Math.max(worst, Math.max(...cnt[c].map(v => Math.abs(v - exp) / exp)));
}
const meanChi = chiAll.reduce((a, b) => a + b, 0) / K;
/* 자유도 109 → 기댓값 109, 표준편차 약 14.8. 평균이 109 근처면 고르게 섞인 것 */
ok(Math.abs(meanChi - 109) < 6, "섞기 평균 카이제곱 " + meanChi.toFixed(1));

console.log(`✅ ${pass}개 확인 통과`);
console.log(`   자동 대전 3000판 (2~6명) · 가장 긴 판 ${turnsMax}번 움직임`);
console.log(`   나온 사건 수:`, JSON.stringify(events));
console.log(`   섞기 ${RUNS.toLocaleString()}번: 카드별 카이제곱 평균 ${meanChi.toFixed(1)} (이론값 109) · 한 칸 최대 차이 ${(worst * 100).toFixed(1)}%`);
