/* node games/bongdoo-escape/tests/rules.test.mjs */
import { ROOMS, itPos, clockText, roomAt, MAP } from "../js/data.js";
import { newTeam, handle, timeUp, cropOK, NEED } from "../js/judge.js";
import { ANSWERS, EDITS, TAPES, ACCOUNTS, CARDS5, REBUT, HINTS, LESSONS } from "../js/answers.js";

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log("✗", m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`);
const ALL = ["minjae", "sua", "taeo", "haeun", "seoyul"];

/* 지도: 숨은 친구·살펴볼 것이 가구 안에 박혀 있지 않은지 */
for (const it of MAP.items) {
  if (["diary", "battery", "code", "word", "memo", "order", "photo"].includes(it.kind)) continue;
  const inside = MAP.furniture.some(([x, z, w, d]) => Math.abs(it.x - x) < w / 2 && Math.abs(it.z - z) < d / 2);
  ok(!inside, `${it.id} 자리가 가구 안`);
}
/* 자료가 서로 맞는지 */
for (const k of [1, 2, 3, 4, 5]) { ok(HINTS[k] && HINTS[k].length >= 3, `힌트 ${k}`); ok(!!LESSONS[k], `정리 ${k}`); }
ok(ANSWERS[1].edit.every(id => EDITS.some(e => e.id === id)), "편집 정답이 보기 안에");
ok(Object.keys(ANSWERS[3].sort).every(id => TAPES.some(t => t.id === id)), "테이프 정답");
ok(ANSWERS[4].order.every(id => ACCOUNTS.some(a => a.id === id)), "계정 정답");
ok(ACCOUNTS.find(a => a.id === ANSWERS[4].order[0]).fol !== "12만", "가장 유명한 계정이 첫째가 아님 (함정)");
const [m, n, c] = ANSWERS[5].deduce;
ok(CARDS5.major.some(x => x.id === m) && CARDS5.minor.some(x => x.id === n) && CARDS5.concl.some(x => x.id === c), "연역 카드");
ok(REBUT.some(r => r.id === ANSWERS[5].rebut), "반론 카드");

/* 끝까지 푸는 길 */
function solveAll(T, who = ALL) {
  handle(T, { t: "order", room: 1, v: ["a", "b", "c", "d"] }, 0, {}, who);
  handle(T, { t: "edit", room: 1, v: ["swap", "cut", "caption", "music"] }, 0, {}, who);
  handle(T, { t: "code", room: 1, v: "0412" }, 0, {}, who);
  handle(T, { t: "project", room: 2 }, 0, {}, who);
  handle(T, { t: "crop", room: 2, v: [0.58, 0.42, 0.22, 0.25] }, 0, {}, who);
  handle(T, { t: "code", room: 2, v: "해송" }, 0, {}, who);
  handle(T, { t: "sort", room: 3, v: { t1: "few", t2: "sim", t3: "fact", t4: "yes", t5: "yes" } }, 0, {}, who);
  handle(T, { t: "accounts", room: 4, v: { order: ANSWERS[4].order, src: "haesong" } }, 0, {}, who);
  handle(T, { t: "deduce", room: 5, v: ["m1", "n1", "c1"] }, 0, {}, who);
  handle(T, { t: "rebut", room: 5, v: "horn" }, 0, {}, who);
}

/* ① */
{
  const T = newTeam([]);
  eq(handle(T, { t: "code", room: 2, v: "해송" }, 0), "closed", "② 아직 닫힘");
  eq(handle(T, { t: "edit", room: 1, v: ["swap", "cut", "caption", "music", "fake"] }, 0), "wrong", "합성까지 고르면 틀림");
  eq(handle(T, { t: "code", room: 1, v: "0412" }, 1000), "locked", "1분 잠김");
  ok(T.threat.room === 1, "그것이 ① 쪽으로");
  eq(handle(T, { t: "edit", room: 1, v: ["music", "caption", "cut", "swap"] }, 61000), "part", "편집 노트 (순서 상관없음)");
  eq(handle(T, { t: "order", room: 1, v: ["a", "b", "c", "d"] }, 61000), "part", "장면 순서");
  eq(handle(T, { t: "code", room: 1, v: "0412" }, 61000), "right", "벽시계 → 풀림");
  eq(NEED[1].every(k => T.part[1][k]), true, "① 세 조각");
}
/* ② */
{
  const T = newTeam([]); T.solved[1] = true;
  eq(handle(T, { t: "crop", room: 2, v: [0.6, 0.45, 0.17, 0.19] }, 0), "ignored", "투사 전엔 표시 못 함");
  eq(handle(T, { t: "project", room: 2 }, 0, {}, ["sua"]), "ignored", "민재 없이 환등기 못 씀");
  eq(handle(T, { t: "project", room: 2 }, 0, {}, ["minjae"]), "part", "민재가 필름 끼움");
  eq(handle(T, { t: "crop", room: 2, v: [0.1, 0.1, 0.5, 0.6] }, 1000), "wrong", "재희 얼굴까지 감싸면 틀림");
  eq(handle(T, { t: "crop", room: 2, v: [0.58, 0.42, 0.22, 0.25] }, 62000), "part", "봉투 든 손");
  eq(handle(T, { t: "code", room: 2, v: " 해 송 " }, 62000), "right", "글자 자물쇠");
  ok(!cropOK([0, 0, 1, 1], { hand: [0.6, 0.45, 0.17, 0.19], face: [0.4, 0.36] }), "전체 선택 안 됨");
}
/* ③ */
{
  const T = newTeam([]); T.solved[1] = T.solved[2] = true;
  eq(handle(T, { t: "sort", room: 3, v: { t1: "few", t2: "few", t3: "fact", t4: "yes", t5: "yes" } }, 0), "wrong", "이유 하나 틀림");
  ok(/1개/.test(T.msg.text), "몇 개 틀렸는지 알려 줌");
  eq(handle(T, { t: "sort", room: 3, v: ANSWERS[3].sort }, 61000), "right", "테이프 분류");
}
/* ④ */
{
  const T = newTeam([]); T.solved[1] = T.solved[2] = T.solved[3] = true;
  const byFol = ["a2", "a6", "a4", "a3", "a5", "a1"];
  eq(handle(T, { t: "accounts", room: 4, v: { order: ANSWERS[4].order, src: "haesong" } }, 0, {}, ["taeo"]), "ignored", "서율 없이 앱 못 엶");
  eq(handle(T, { t: "accounts", room: 4, v: { order: byFol, src: "haesong" } }, 0, {}, ["seoyul"]), "wrong", "팔로워 순은 틀림");
  const capOrder = ["a4", "a1", "a2", "a3", "a5", "a6"];
  eq(handle(T, { t: "accounts", room: 4, v: { order: capOrder, src: "haesong" } }, 61000, {}, ["seoyul"]), "wrong", "글에 적은 날짜를 믿으면 틀림");
  eq(handle(T, { t: "accounts", room: 4, v: { order: ANSWERS[4].order, src: "county" } }, 122000, {}, ["seoyul"]), "wrong", "출처 틀림");
  ok(/순서는 맞는데/.test(T.msg.text), "순서는 맞았다고 알려 줌");
  eq(handle(T, { t: "accounts", room: 4, v: { order: ANSWERS[4].order, src: "haesong" } }, 183000, {}, ["seoyul"]), "right", "④ 풀림");
}
/* ⑤ */
{
  const T = newTeam([]); [1, 2, 3, 4].forEach(k => T.solved[k] = true);
  eq(handle(T, { t: "rebut", room: 5, v: "horn" }, 0, {}, ALL), "ignored", "연역 전엔 반론 없음");
  eq(handle(T, { t: "deduce", room: 5, v: ["m1", "n1", "c3"] }, 0, {}, ALL), "wrong", "전제에 없는 결론은 틀림");
  eq(handle(T, { t: "deduce", room: 5, v: ["m1", "n1", "c1"] }, 61000, {}, ALL), "part", "연역");
  eq(handle(T, { t: "rebut", room: 5, v: "horn" }, 61000, {}, ["minjae"]), "wrong", "하은·태오 없으면 백고동 증거를 못 댐");
  eq(handle(T, { t: "rebut", room: 5, v: "horn" }, 122000, {}, ALL), "right", "반론까지");
  eq(T.end, "escape", "일기장 없으면 탈출 엔딩");
}
/* 처음부터 끝까지 + 벌칙 + 힌트 */
{
  const E = newTeam([]); for (const k of [1, 2, 3, 4, 5]) handle(E, { t: "diary", room: k }, 0);
  ok(Object.keys(E.diary).length === 1, "닫힌 방 일기장은 못 주움");
  const F = newTeam([]); solveAll(F); ok(F.end === "escape" && [1, 2, 3, 4, 5].every(k => F.solved[k]), "다섯 방 모두 풀림");
  const G = newTeam([]);
  handle(G, { t: "order", room: 1, v: ["a", "b", "c", "d"] }, 0); handle(G, { t: "edit", room: 1, v: ["swap", "cut", "caption", "music"] }, 0); handle(G, { t: "code", room: 1, v: "0412" }, 0);
  for (const k of [2, 3, 4, 5]) handle(G, { t: "diary", room: k }, 0);
  handle(G, { t: "diary", room: 1 }, 0);
  ok(Object.keys(G.diary).length === 2, "열린 방까지만");
  const W = newTeam([]); W.wrong = 2; handle(W, { t: "code", room: 1, v: "9" }, 0, { fear: "weak" }); ok(W.bo === 0, "약함: 정전 없음");
  const W2 = newTeam([]); W2.wrong = 2; handle(W2, { t: "code", room: 1, v: "9" }, 0, { fear: "normal" }); ok(W2.bo === 30000, "보통: 세 번째 정전");
  const H = newTeam([]); for (let i = 0; i < 7; i++) handle(H, { t: "hint" }, 0); ok(H.bat === 0, "힌트 6번이면 배터리 0");
  const N = newTeam([]); ok(timeUp(N, 30 * 60000) && N.end === "night", "6시 넘김");
}
/* 시계 · 그것 · 방 위치 */
eq(clockText(0), "5:30", "시작"); eq(clockText(30 * 60000), "6:00", "끝");
ok(itPos(0).x === 37.5, "그것은 동쪽 끝에서 출발");
eq(itPos(5000, { room: 3, t: 1000 }).near, 3, "틀리면 그 방 앞");
eq(roomAt(5, -3), 1, "교실"); eq(roomAt(20.5, 1), 0, "복도"); eq(roomAt(-5, 0), 5, "바깥");

console.log(`\n통과 ${pass} · 실패 ${fail}`);
process.exit(fail ? 1 : 0);
