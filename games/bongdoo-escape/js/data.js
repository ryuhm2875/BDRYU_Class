/* ──────────────────────────────────────────────────────────────
   마지막 배는 6시 · 공용 자료 (칠판·학생 모두 받음)
   정답과 단서 내용은 여기 두지 않습니다 → answers.js (칠판만)
   ────────────────────────────────────────────────────────────── */

/* ---------- 사람들 (주인공은 학생이 넣은 이름) ---------- */
export const NPCS = {
  minjae: { name: "오민재", grade: "중3", color: "#6a9ae0", club: "사진부" },
  sua:    { name: "이수아", grade: "중3", color: "#6ac08a", club: "도서부" },
  taeo:   { name: "김태오", grade: "중1", color: "#a88ad8", club: "할머니가 봉두섬 사람" },
  haeun:  { name: "박하은", grade: "중2", color: "#e8b85a", club: "방송부" },
  seoyul: { name: "한서율", grade: "중2", color: "#e87080", club: "서진의 동생" }
};
/* 점퍼 색 (주인공) */
export const JACKETS = { 남색: [66, 98, 164], 자주: [150, 58, 86], 초록: [52, 124, 90], 회색: [124, 124, 134] };

/* ---------- 방 5개 ---------- */
export const ROOMS = {
  1: { name: "교실",   concept: "재현, 편집",        owners: ["seoyul", "minjae"], min: 5,
       evidence: "원본 영상 — 서진은 불이 난 뒤 도착" },
  2: { name: "교무실", concept: "선택과 배제",       owners: ["minjae", "sua"],    min: 5,
       evidence: "잘린 바깥 — 돈봉투를 든 다른 어른" },
  3: { name: "숙직실", concept: "귀납·유추의 타당성", owners: ["sua", "haeun"],     min: 6,
       evidence: "증언 — 재희를 본 사람은 없었다" },
  4: { name: "방송실", concept: "신뢰성",            owners: ["seoyul", "taeo"],   min: 5,
       evidence: "최초 업로드 — 리조트 업체 홍보 계정" },
  5: { name: "선착장", concept: "연역",              owners: ["taeo", "haeun"],    min: 5,
       evidence: "연역 — 서진은 방화범이 아니다" }
};

/* ---------- 시간 ---------- */
export const GAME_MS = 30 * 60 * 1000;           // 현실 30분 = 게임 5:30 → 6:00
export function clockText(elapsed) {
  const m = Math.max(0, Math.min(30, Math.floor(elapsed / 60000)));
  const s = Math.max(0, Math.floor(elapsed / 1000) % 60);
  return elapsed >= GAME_MS ? "6:00" : `5:${String(30 + m).padStart(2, "0")}`;
}
export const leftText = elapsed => {
  const l = Math.max(0, GAME_MS - elapsed), m = Math.floor(l / 60000), s = Math.floor(l / 1000) % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};

/* ---------- 지도 (1칸 = 1m. x 동쪽, z 남쪽) ----------
   1층: 복도 x0~40, z0~3. 복도 북쪽에 방 넷(각 10m 폭).
   서쪽 정문 밖이 운동장 끝 선착장. 복도 남쪽 창 너머 바다. */
export const MAP = {
  corridor: { x0: 0, x1: 40, z0: 0, z1: 3 },
  rooms: {
    1: { x0: 0,  x1: 10, z0: -8, z1: 0, door: 5 },
    2: { x0: 10, x1: 20, z0: -8, z1: 0, door: 15 },
    3: { x0: 20, x1: 30, z0: -8, z1: 0, door: 25 },
    4: { x0: 30, x1: 40, z0: -8, z1: 0, door: 35 },
    5: { x0: -16, x1: 0, z0: -5, z1: 8 }             // 바깥 (운동장 끝 + 선착장)
  },
  frontDoor: { x: 0, z: 1.5 },                      // 서쪽 정문 (④를 풀면 열림)
  spawn: { x: 2.2, z: 1.5 },
  /* 부딪히는 가구: [x, z, 가로, 세로, 높이, 종류] */
  furniture: [
    // ① 교실: 뒤쪽(서쪽 벽) 사물함 셋 · 책상 6개 (가운데 통로) · 교탁
    [0.4, -1.3, .5, .8, 1.8, "locker"], [0.4, -2.2, .5, .8, 1.8, "locker"], [0.4, -3.1, .5, .8, 1.8, "locker"],
    [2, -4.2, .9, .6, .75, "desk"], [3.4, -4.2, .9, .6, .75, "desk"], [6.6, -4.2, .9, .6, .75, "desk"],
    [8, -4.2, .9, .6, .75, "desk"], [2, -2.2, .9, .6, .75, "desk"], [8, -2.2, .9, .6, .75, "desk"],
    [4.4, -6.0, 1.6, .7, .95, "teacher"],
    // ② 교무실
    [12.6, -4.5, 1.4, .8, .75, "desk"], [17.4, -4.5, 1.4, .8, .75, "desk"], [12.6, -2.2, 1.4, .8, .75, "desk"],
    [11, -7.4, .9, 1.0, 1.6, "cabinet"],
    // ③ 숙직실
    [22.2, -6.4, 2.2, 1.1, .5, "bed"], [27.5, -7.3, 1.2, .6, 1.2, "cabinet"],
    // ④ 방송실
    [35, -7.2, 3.2, .7, .9, "console"],
    // 복도 사물함 (숨는 곳)
    [7.5, 2.65, .8, .5, 1.8, "locker"], [18.5, 2.65, .8, .5, 1.8, "locker"],
    [27.5, 2.65, .8, .5, 1.8, "locker"], [36.5, 2.65, .8, .5, 1.8, "locker"],
    // ④ 방송실: 미끼 마네킹
    [32.5, -3.6, .5, .45, 1.9, "decoy"],
    // 바깥: 주재소
    [-9, -3.4, 3, 2, 2.4, "police"]
  ],
  /* 숨는 곳: 사물함 앞에서 [숨기] */
  hides: [[7.5, 2.2], [18.5, 2.2], [27.5, 2.2]],
  shortcut: { x: 20, z: -6.6 },                      // 교무실 ↔ 숙직실 창고 쪽문 (태오가 엶)
  /* 살펴볼 것. kind: order(교실 TV) · code · word(자물쇠) · project(환등기) · photo(벽 사진) · npc(숨은 친구)
     · look(이야기 소품) · short(쪽문) · jam(막힌 문) · tapes · accounts · police · diary · battery */
  items: [
    /* ① 교실 */
    { id: "phone",  room: 1, x: 4.4,  z: -6.0, kind: "memo",  label: "서진의 휴대폰" },
    { id: "tv",     room: 1, x: 6.8,  z: -7.6, kind: "order", label: "교실 TV" },
    { id: "box1",   room: 1, x: 8.7,  z: -7.2, kind: "code",  label: "증거 상자 (4자리)" },
    { id: "d1",     room: 1, x: 2.6,  z: -6.9, kind: "diary", label: "재희의 일기장 1" },
    { id: "npc_minjae", room: 1, x: 1.1, z: -2.2, kind: "npc", npc: "minjae", label: "덜컹거리는 사물함" },
    { id: "lk_board", room: 1, x: 3.0, z: -7.3, kind: "look", look: "board", label: "칠판" },
    { id: "lk_cal",   room: 1, x: 9.5, z: -7.4, kind: "look", look: "calendar", label: "1999년 달력" },
    { id: "lk_shelf", room: 1, x: 0.95, z: -6.2, kind: "look", look: "shelf", label: "학급문고" },
    /* ② 교무실 */
    { id: "npc_sua",    room: 2, x: 12.6, z: -1.5, kind: "npc", npc: "sua",    label: "책상 밑 인기척" },
    { id: "proj",   room: 2, x: 12.6, z: -5.2, kind: "project", label: "환등기" },
    { id: "wall2",  room: 2, x: 15,   z: -7.3, kind: "photo", label: "벽에 비친 사진" },
    { id: "box2",   room: 2, x: 18.9, z: -6.0, kind: "word",  label: "교무실 금고 (글자 자물쇠)" },
    { id: "d2",     room: 2, x: 18.8, z: -0.9, kind: "diary", label: "재희의 일기장 2" },
    { id: "lk_cab", room: 2, x: 11.7, z: -6.5, kind: "look", look: "cabinet", label: "철제 캐비닛" },
    { id: "short",  room: 2, x: 19.4, z: -6.6, kind: "short", label: "창고 쪽문" },
    /* 복도 */
    { id: "jam3",   room: 0, x: 25,   z: 0.6,  kind: "jam",  label: "숙직실 문" },
    { id: "npc_taeo",   room: 0, x: 36.5, z: 2.05, kind: "npc", npc: "taeo",   label: "사물함 안 훌쩍임" },
    /* ③ 숙직실 */
    { id: "npc_haeun",  room: 3, x: 22.2, z: -5.5, kind: "npc", npc: "haeun",  label: "이불 속 움직임" },
    { id: "tapes",  room: 3, x: 27.5, z: -6.6, kind: "tapes", label: "녹음기와 테이프 상자" },
    { id: "d3",     room: 3, x: 29.2, z: -1.0, kind: "diary", label: "재희의 일기장 3" },
    /* ④ 방송실 */
    { id: "npc_seoyul", room: 4, x: 38.8, z: -1.2, kind: "npc", npc: "seoyul", label: "커튼 뒤 운동화" },
    { id: "pc4",    room: 4, x: 35,   z: -6.5, kind: "accounts", label: "방송실 컴퓨터" },
    { id: "lk_decoy", room: 4, x: 32.5, z: -2.9, kind: "look", look: "decoy", label: "마네킹" },
    { id: "lk_poster", room: 4, x: 38.2, z: -7.4, kind: "look", look: "poster", label: "벽 포스터" },
    { id: "d4",     room: 4, x: 31,   z: -7.2, kind: "diary", label: "재희의 일기장 4" },
    /* ⑤ 바깥 */
    { id: "police", room: 5, x: -9,   z: -1.4, kind: "police", label: "주재소 경찰" },
    { id: "lk_notice", room: 5, x: -11.2, z: -2.2, kind: "look", look: "notice", label: "주재소 게시판" },
    { id: "d5",     room: 5, x: -14,  z: 6.5,  kind: "diary", label: "재희의 일기장 5" },
    /* 건전지 */
    { id: "b1", room: 0, x: 12,   z: 2.5, kind: "battery", label: "건전지" },
    { id: "b2", room: 0, x: 31,   z: 2.5, kind: "battery", label: "건전지" },
    { id: "b3", room: 1, x: 9.3,  z: -0.6, kind: "battery", label: "건전지" },
    { id: "b4", room: 3, x: 21,   z: -1,   kind: "battery", label: "건전지" },
    { id: "b5", room: 4, x: 33.5, z: -0.8, kind: "battery", label: "건전지" }
  ]
};

/* 방 k 가 열렸는지: ①은 처음부터, 나머지는 앞 방을 풀면 */
export const isOpen = (team, k) => k === 1 || !!(team && team.solved && team.solved[k - 1]);

/* 어느 방에 서 있는지 (0 = 복도) */
export function roomAt(x, z) {
  for (const k of [1, 2, 3, 4, 5]) {
    const r = MAP.rooms[k];
    if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return k;
  }
  return 0;
}

/* ---------- ‘그것’: 복도를 정해진 길로 돈다 ----------
   모두의 화면에서 같은 자리에 있도록 시작 시각만으로 계산합니다. */
export const IT = { x0: 2.5, x1: 37.5, z: 1.5, speed: 0.9, sight: 7, fov: 0.62 };
export function itPos(elapsed, threat) {
  if (threat && threat.room >= 1 && threat.room <= 4 && elapsed - threat.t < 40000 && elapsed >= threat.t) {
    const d = MAP.rooms[threat.room].door;              // 틀린 방 앞으로 다가와 문 쪽을 본다
    return { x: d, z: 0.9, dir: -Math.PI / 2, near: threat.room };
  }
  const L = IT.x1 - IT.x0, s = (L + elapsed / 1000 * IT.speed) % (2 * L);    // 복도 동쪽 끝에서 출발
  const fwd = s < L;
  return { x: fwd ? IT.x0 + s : IT.x1 - (s - L), z: IT.z, dir: fwd ? 0 : Math.PI };
}
