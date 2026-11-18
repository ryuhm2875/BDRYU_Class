/* ──────────────────────────────────────────────────────────────
   마지막 배는 6시 · 공용 자료 (칠판·학생 모두 받음)
   정답과 단서 내용은 여기 두지 않습니다 → answers.js (칠판만)
   ────────────────────────────────────────────────────────────── */

/* ---------- 캐릭터 5명 (고정) ---------- */
export const CHARS = {
  seoyul: { name: "한서율", grade: "중2", color: "#d9485f", prop: "phone",
    intro: "서진의 동생. 무서워하면서도 맨 앞에 선다.",
    sees: "언니의 휴대폰 (메신저, 메모, 사진첩)",
    ability: "잠금 풀기 · 언니 패턴으로 폰 속 잠긴 앱을 연다",
    secret: "언니와 마지막으로 싸운 채 헤어졌다." },
  minjae: { name: "오민재", grade: "중3", color: "#3f7fd6", prop: "camera",
    intro: "사진부. 필름 카메라를 늘 목에 건다.",
    sees: "옛 필름, 서진 영상의 원본",
    ability: "확대 · 사진과 영상의 가장자리를 들여다본다",
    secret: "쇼츠 속 사진에 처음 ‘좋아요’를 누른 게 자기였다." },
  haeun:  { name: "박하은", grade: "중2", color: "#e0a63a", prop: "headphones",
    intro: "방송부. 귀가 유난히 밝다.",
    sees: "녹음테이프, 영상 속 소리",
    ability: "귀 기울이기 · 소리의 방향을 가려낸다. ‘그것’의 위치도 소리로 안다",
    secret: "밤에 혼자 있는 걸 제일 무서워한다." },
  sua:    { name: "이수아", grade: "중3", color: "#4aa36b", prop: "books",
    intro: "도서부. 날짜와 숫자를 외우는 애.",
    sees: "1999년 신문 스크랩, 학교 일지",
    ability: "대조 · 두 기록을 나란히 놓고 다른 점을 표시한다",
    secret: "지난주 단톡방에 그 쇼츠를 퍼 날랐다." },
  taeo:   { name: "김태오", grade: "중1", color: "#8a5cc7", prop: "cap",
    intro: "할머니가 봉두섬 사람. 섬 지리를 안다.",
    sees: "섬 지도, 배 시간표, 마을 CCTV",
    ability: "지름길 · 잠긴 복도를 돌아가는 길과 숨을 곳을 안다",
    secret: "할머니가 1999년 테이프 속 증언자 중 한 명이다." }
};
export const CHAR_IDS = ["seoyul", "minjae", "haeun", "sua", "taeo"];

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
    // ① 교실: 책상 6개 (가운데 통로) + 교탁
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
    // 바깥: 주재소
    [-9, -3.4, 3, 2, 2.4, "police"]
  ],
  /* 숨는 곳: 사물함 앞에서 [숨기] */
  hides: [[7.5, 2.2], [18.5, 2.2], [27.5, 2.2], [36.5, 2.2]],
  /* 살펴볼 것. kind: memo(서진의 휴대폰) · order(장면 맞추기) · code(자물쇠) · diary(일기장) · battery(건전지) */
  items: [
    { id: "phone",  room: 1, x: 4.4,  z: -6.0, kind: "memo",  label: "서진의 휴대폰" },
    { id: "tv",     room: 1, x: 6.8,  z: -7.6, kind: "order", label: "교실 TV" },
    { id: "box1",   room: 1, x: 8.7,  z: -7.2, kind: "code",  label: "증거 상자 (4자리)" },
    { id: "d1",     room: 1, x: 1.2,  z: -1.0, kind: "diary", label: "재희의 일기장 1" },
    { id: "box2",   room: 2, x: 15,   z: -7.3, kind: "code",  label: "교무실 금고 (4자리)" },
    { id: "d2",     room: 2, x: 19.2, z: -7.2, kind: "diary", label: "재희의 일기장 2" },
    { id: "box3",   room: 3, x: 25,   z: -7.3, kind: "code",  label: "숙직실 서랍 (4자리)" },
    { id: "d3",     room: 3, x: 29.2, z: -1.0, kind: "diary", label: "재희의 일기장 3" },
    { id: "box4",   room: 4, x: 38.5, z: -5.5, kind: "code",  label: "방송실 제어함 (4자리)" },
    { id: "d4",     room: 4, x: 31,   z: -7.2, kind: "diary", label: "재희의 일기장 4" },
    { id: "box5",   room: 5, x: -9,   z: -2,   kind: "code",  label: "주재소 경찰" },
    { id: "d5",     room: 5, x: -14,  z: 6.5,  kind: "diary", label: "재희의 일기장 5" },
    { id: "b1", room: 0, x: 12,   z: 2.5, kind: "battery", label: "건전지" },
    { id: "b2", room: 0, x: 31,   z: 2.5, kind: "battery", label: "건전지" },
    { id: "b3", room: 1, x: 9.3,  z: -0.6, kind: "battery", label: "건전지" },
    { id: "b4", room: 3, x: 21,   z: -1,   kind: "battery", label: "건전지" }
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
  const L = IT.x1 - IT.x0, s = (elapsed / 1000 * IT.speed) % (2 * L);
  const fwd = s < L;
  return { x: fwd ? IT.x0 + s : IT.x1 - (s - L), z: IT.z, dir: fwd ? 0 : Math.PI };
}
