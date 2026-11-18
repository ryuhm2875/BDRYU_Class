/* ──────────────────────────────────────────────────────────────
   마지막 배는 6시 · 방 나누기 · 캐릭터 나누기 (칠판만 실행, 순수 함수)
   ────────────────────────────────────────────────────────────── */
import { CHAR_IDS } from "./data.js?v=202611181710";

/* 인원별 캐릭터 나누기 (기획안 표 그대로).
   방마다 단서를 나눠 든 두 캐릭터가 한 학생에게 몰리지 않게 짜여 있음 */
export const ALLOC = {
  1: [["seoyul", "minjae", "haeun", "sua", "taeo"]],          // 선생님 혼자 시험할 때만
  2: [["seoyul", "haeun"], ["minjae", "sua", "taeo"]],
  3: [["seoyul"], ["minjae", "haeun"], ["sua", "taeo"]],
  4: [["seoyul"], ["minjae"], ["haeun"], ["sua", "taeo"]],
  5: [["seoyul"], ["minjae"], ["haeun"], ["sua"], ["taeo"]]
};

/* 방 크기: 2~5명. 6 = 3+3, 7 = 4+3, 10 = 5+5, 11 = 4+4+3 */
export function splitSizes(n) {
  if (n <= 0) return [];
  if (n === 1) return [1];
  const k = Math.ceil(n / 5), base = Math.floor(n / k), extra = n % k;
  return Array.from({ length: k }, (_, i) => base + (i < extra ? 1 : 0));
}

/* 학생 목록을 방으로 나눔. 순서는 섞어서 넣어 주세요 */
export function makeTeams(uids) {
  const sizes = splitSizes(uids.length), teams = {};
  let i = 0;
  sizes.forEach((s, t) => { teams["T" + (t + 1)] = { m: uids.slice(i, i + s) }; i += s; });
  return teams;
}

/* 모둠 안 캐릭터 배정: m 순서대로 표의 칸을 받음 */
export function allocate(m) {
  const rows = ALLOC[Math.min(5, m.length)] || [];
  const c = {};
  m.forEach((u, i) => { c[u] = rows[i] ? rows[i].slice() : []; });
  return c;
}

/* 늦게 온 학생: 인원이 가장 적은 방 (5명 미만), 없으면 새 방이 필요 → null */
export function pickTeamForLate(teams) {
  let best = null;
  for (const [tid, t] of Object.entries(teams)) {
    if (t.m.length >= 5 || t.end) continue;
    if (!best || t.m.length < teams[best].m.length) best = tid;
  }
  return best;
}

/* 나간 학생 빼기. 남은 사람이 1명이면 다른 방과 합칠 방 번호를 돌려줌 */
export function removeFrom(teams, uid) {
  for (const [tid, t] of Object.entries(teams)) {
    const i = t.m.indexOf(uid);
    if (i < 0) continue;
    t.m.splice(i, 1);
    if (t.m.length === 1) {
      const to = Object.keys(teams).filter(k => k !== tid && !teams[k].end && teams[k].m.length < 5)
        .sort((a, b) => teams[a].m.length - teams[b].m.length)[0];
      return { tid, mergeInto: to || null };
    }
    return { tid, mergeInto: null };
  }
  return null;
}

/* 확인용: 방 k 의 두 단서 주인이 같은 학생인지 */
export function ownersSplit(c, owners) {
  const who = ch => Object.keys(c).find(u => c[u].includes(ch));
  return who(owners[0]) !== who(owners[1]);
}
export { CHAR_IDS };
