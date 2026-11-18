/* node games/bongdoo-escape/tests/rules.test.mjs */
import { splitSizes, makeTeams, allocate, ALLOC, pickTeamForLate, removeFrom, ownersSplit } from "../js/split.js";
import { ROOMS, CHAR_IDS, itPos, clockText, roomAt } from "../js/data.js";
import { newTeam, handle, timeUp, cropOK } from "../js/judge.js";
import { ANSWERS } from "../js/answers.js";

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log("✗", m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`);

/* 방 나누기 */
eq(splitSizes(6), [3, 3], "6명"); eq(splitSizes(7), [4, 3], "7명");
eq(splitSizes(10), [5, 5], "10명"); eq(splitSizes(11), [4, 4, 3], "11명");
eq(splitSizes(25), [5, 5, 5, 5, 5], "25명"); eq(splitSizes(1), [1], "1명(시험)");
for (let n = 2; n <= 40; n++) {
  const s = splitSizes(n);
  ok(s.reduce((a, b) => a + b, 0) === n && s.every(x => x >= 2 && x <= 5), `${n}명 → ${s}`);
  const t = makeTeams(Array.from({ length: n }, (_, i) => "u" + i));
  ok(Object.values(t).reduce((a, x) => a + x.m.length, 0) === n, `${n}명 모두 배정`);
}

/* 캐릭터: 인원마다 5명 모두 한 번씩, 단서 둘은 다른 학생에게 (2명일 때 ②만 예외) */
for (let n = 1; n <= 5; n++) {
  const flat = ALLOC[n].flat().sort();
  eq(flat, CHAR_IDS.slice().sort(), `${n}명 캐릭터 빠짐없음`);
  const c = allocate(Array.from({ length: n }, (_, i) => "u" + i));
  for (const k of [1, 2, 3, 4, 5]) {
    const split = ownersSplit(c, ROOMS[k].owners);
    if (n === 1 || (n === 2 && k === 2)) ok(!split, `${n}명 방${k} 혼자`);
    else ok(split, `${n}명 방${k} 두 사람이 나눠 듦`);
  }
}

/* 늦게 온 / 나간 학생 */
{
  const t = makeTeams(["a", "b", "c", "d", "e", "f", "g"]);    // 4 + 3
  eq(pickTeamForLate(t), "T2", "늦게 온 학생은 적은 방");
  t.T2.m.push("h");
  const full = { T1: { m: ["1", "2", "3", "4", "5"] } };
  eq(pickTeamForLate(full), null, "다 찼으면 새 방");
  const t2 = { T1: { m: ["a", "b"] }, T2: { m: ["c", "d", "e"] } };
  eq(removeFrom(t2, "a"), { tid: "T1", mergeInto: "T2" }, "1명 남으면 합치기");
}

/* 판정: ① 교실 */
{
  const T = newTeam(["a"]);
  eq(handle(T, { t: "code", room: 2, v: "해송" }, 1000), "closed", "② 아직 닫힘");
  eq(handle(T, { t: "code", room: 1, v: "1234" }, 1000), "wrong", "틀린 번호");
  eq(handle(T, { t: "code", room: 1, v: "0412" }, 2000), "locked", "1분 잠김");
  ok(T.threat.room === 1, "그것이 ① 쪽으로");
  eq(handle(T, { t: "code", room: 1, v: "0412" }, 62000), "part", "번호 맞음 → 한 조각");
  eq(handle(T, { t: "order", room: 1, v: ["a", "b", "c", "d"] }, 63000), "right", "순서까지 → 풀림");
  ok(T.solved[1] && T.ev.includes(1), "증거 쌓임");
  handle(T, { t: "code", room: 2, v: "0000" }, 70000);
  handle(T, { t: "code", room: 2, v: "0000" }, 140000);
  ok(T.bo === 140000 + 30000, "세 번째 틀림 → 정전");
  const W = newTeam(["a"]); W.wrong = 2;
  handle(W, { t: "code", room: 1, v: "9" }, 0, { fear: "weak" });
  ok(W.bo === 0, "약함에서는 정전 없음");
  /* 힌트 */
  const H = newTeam(["a"]);
  for (let i = 0; i < 7; i++) handle(H, { t: "hint" }, 1000);
  ok(H.bat === 0, "힌트 6번이면 배터리 0");
  /* 끝까지 */
  const E = newTeam(["a"]);
  handle(E, { t: "order", room: 1, v: ["a", "b", "c", "d"] }, 0); handle(E, { t: "code", room: 1, v: "0412" }, 0);
  handle(E, { t: "project", room: 2 }, 0, {}, ["minjae"]); handle(E, { t: "crop", room: 2, v: [0.58, 0.42, 0.22, 0.25] }, 0); handle(E, { t: "code", room: 2, v: "해송" }, 0);
  for (const [k, v] of [[3, "0505"], [4, "1118"]]) handle(E, { t: "code", room: k, v }, 0);
  for (const k of [1, 2, 3, 4, 5]) handle(E, { t: "diary", room: k }, 0);
  handle(E, { t: "code", room: 5, v: "1800" }, 0);
  eq(E.end, "true", "일기장 5장 + 탈출 = 진엔딩");
  const N = newTeam(["a"]); ok(timeUp(N, 30 * 60000) && N.end === "night", "6시 넘김");
}

/* 판정: ② 교무실 */
{
  const T = newTeam(["a", "b"]); T.solved[1] = true;
  eq(handle(T, { t: "crop", room: 2, v: [0.6, 0.45, 0.17, 0.19] }, 0), "ignored", "투사 전에는 표시 못 함");
  eq(handle(T, { t: "project", room: 2 }, 0, {}, ["sua"]), "ignored", "민재가 아니면 환등기 못 씀");
  ok(T.msg && /민재/.test(T.msg.text), "민재가 필름을 갖고 있다는 알림");
  eq(handle(T, { t: "project", room: 2 }, 0, {}, ["minjae", "taeo"]), "part", "민재가 필름 끼움");
  eq(handle(T, { t: "crop", room: 2, v: [0.1, 0.1, 0.5, 0.6] }, 1000), "wrong", "너무 큰 네모 (재희 얼굴까지)");
  eq(handle(T, { t: "crop", room: 2, v: [0.58, 0.42, 0.22, 0.25] }, 62000), "part", "봉투 든 손을 감쌈");
  eq(handle(T, { t: "code", room: 2, v: " 해 송 " }, 63000), "right", "글자 자물쇠 (띄어쓰기 무시)");
  ok(T.solved[2], "② 풀림");
  const A = ANSWERS[2];
  ok(!cropOK([0.6, 0.45, 0.05, 0.05], A), "손을 조금만 덮으면 안 됨");
  ok(!cropOK([0, 0, 1, 1], A), "전체 선택 안 됨");
  ok(!cropOK("x", A), "이상한 값");
  ok(cropOK([0.55, 0.4, 0.3, 0.3], A), "넉넉한 네모는 됨");
}

/* 시계 · 그것 · 방 위치 */
eq(clockText(0), "5:30", "시작"); eq(clockText(29 * 60000 + 59000), "5:59", "끝 직전"); eq(clockText(30 * 60000), "6:00", "끝");
ok(itPos(0).x === 2.5 && Math.abs(itPos(1e6).x - itPos(1e6).x) < 1e-9, "그것 위치 같음");
eq(itPos(5000, { room: 3, t: 1000 }).near, 3, "틀리면 그 방 앞");
eq(roomAt(5, -3), 1, "교실"); eq(roomAt(20.5, 1), 0, "복도"); eq(roomAt(-5, 0), 5, "바깥");

console.log(`\n통과 ${pass} · 실패 ${fail}`);
process.exit(fail ? 1 : 0);
