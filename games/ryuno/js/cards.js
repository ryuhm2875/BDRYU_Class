/* ──────────────────────────────────────────────────────────────
   RYUNO · 카드 데이터
   색 = 조음 방법 / 배지 = 조음 위치 · 소리의 세기
   카드는 모두 110장. 카드 번호(0~109)로 주고받습니다.
   ────────────────────────────────────────────────────────────── */

export const COLORS = ["red", "blue", "yel", "grn"];
export const COLOR_INFO = {
  red:  { name: "빨강", manner: "파열음", hex: "#E5322D" },
  blue: { name: "파랑", manner: "마찰음", hex: "#1F6FD1" },
  yel:  { name: "노랑", manner: "파찰음", hex: "#F2B705" },
  grn:  { name: "초록", manner: "울림소리", hex: "#22A447" }
};

/* 자음 19개
   c: 색(조음 방법)  p: 조음 위치  s: 소리의 세기(예사·된·거센)
   ㅎ은 세기를 따지지 않고, 울림소리(ㄴㄹㅁㅇ)는 세기 구분이 없습니다.
   sub: 울림소리 안에서의 갈래(비음·유음) */
export const CONS = {
  "ㅂ": { c: "red",  p: "입술",       s: "예사" },
  "ㅃ": { c: "red",  p: "입술",       s: "된" },
  "ㅍ": { c: "red",  p: "입술",       s: "거센" },
  "ㄷ": { c: "red",  p: "잇몸",       s: "예사" },
  "ㄸ": { c: "red",  p: "잇몸",       s: "된" },
  "ㅌ": { c: "red",  p: "잇몸",       s: "거센" },
  "ㄱ": { c: "red",  p: "여린입천장", s: "예사" },
  "ㄲ": { c: "red",  p: "여린입천장", s: "된" },
  "ㅋ": { c: "red",  p: "여린입천장", s: "거센" },
  "ㅅ": { c: "blue", p: "잇몸",       s: "예사" },
  "ㅆ": { c: "blue", p: "잇몸",       s: "된" },
  "ㅎ": { c: "blue", p: "목청",       s: null },
  "ㅈ": { c: "yel",  p: "센입천장",   s: "예사" },
  "ㅉ": { c: "yel",  p: "센입천장",   s: "된" },
  "ㅊ": { c: "yel",  p: "센입천장",   s: "거센" },
  "ㅁ": { c: "grn",  p: "입술",       s: null, sub: "비음" },
  "ㄴ": { c: "grn",  p: "잇몸",       s: null, sub: "비음" },
  "ㅇ": { c: "grn",  p: "여린입천장", s: null, sub: "비음", note: "첫소리 자리에서는 소리가 없고, 받침에서 [ŋ]으로 납니다." },
  "ㄹ": { c: "grn",  p: "잇몸",       s: null, sub: "유음" }
};

/* 단모음 10개 (와일드 카드에 하나씩)
   f: 혀의 앞뒤(전설·후설)  h: 혀의 높이(고·중·저)  r: 입술 모양(평순·원순) */
export const VOWELS = {
  "ㅣ": { f: "전설", h: "고", r: "평순" },
  "ㅔ": { f: "전설", h: "중", r: "평순" },
  "ㅐ": { f: "전설", h: "저", r: "평순" },
  "ㅟ": { f: "전설", h: "고", r: "원순", note: "이중 모음으로 발음하는 것도 허용됩니다. (표준 발음법 제4항)" },
  "ㅚ": { f: "전설", h: "중", r: "원순", note: "이중 모음으로 발음하는 것도 허용됩니다. (표준 발음법 제4항)" },
  "ㅡ": { f: "후설", h: "고", r: "평순" },
  "ㅓ": { f: "후설", h: "중", r: "평순" },
  "ㅏ": { f: "후설", h: "저", r: "평순" },
  "ㅜ": { f: "후설", h: "고", r: "원순" },
  "ㅗ": { f: "후설", h: "중", r: "원순" }
};

/* 음운 변동 콤보: 바닥 카드(from) 위에 to 를 내면 다음 사람이 1장 */
export const COMBOS = [
  { from: "ㄱㄲㅋ", to: "ㅇ", name: "비음화", show: "ㄱ → ㅇ", ex: ["국물 [궁물]", "부엌문 [부엉문]"] },
  { from: "ㄷㅌ",   to: "ㄴ", name: "비음화", show: "ㄷ → ㄴ", ex: ["닫는 [단는]", "밭머리 [반머리]"] },
  { from: "ㅂㅍ",   to: "ㅁ", name: "비음화", show: "ㅂ → ㅁ", ex: ["밥물 [밤물]", "앞마당 [암마당]"] },
  { from: "ㄴ",     to: "ㄹ", name: "유음화", show: "ㄴ → ㄹ", ex: ["신라 [실라]", "난로 [날로]"] },
  { from: "ㄹ",     to: "ㄴ", name: "유음화", show: "ㄹ + ㄴ → ㄹㄹ", ex: ["칼날 [칼랄]", "설날 [설랄]"] }
];
export function findCombo(topJ, playJ) {
  return COMBOS.find(c => c.from.includes(topJ) && c.to === playJ) || null;
}

/* ---------- 카드 110장 ----------
   k: n(자음) · skip · rev · d2(+2) · wild · w4(+4)
   c: 색 (와일드는 null)   j: 카드에 적힌 글자 */
const N_COPIES = {
  red:  { "ㄱ": 2, "ㄲ": 2, "ㅋ": 2, "ㄷ": 2, "ㄸ": 2, "ㅌ": 2, "ㅂ": 2, "ㅃ": 2, "ㅍ": 2 },
  blue: { "ㅅ": 6, "ㅆ": 6, "ㅎ": 6 },
  yel:  { "ㅈ": 6, "ㅉ": 6, "ㅊ": 6 },
  grn:  { "ㄴ": 4, "ㅁ": 4, "ㅇ": 4, "ㄹ": 6 }
};
export const DECK = (() => {
  const d = [];
  for (const c of COLORS) {
    for (const [j, n] of Object.entries(N_COPIES[c])) for (let i = 0; i < n; i++) d.push({ k: "n", c, j });
    for (const k of ["skip", "rev", "d2"]) for (let i = 0; i < 2; i++) d.push({ k, c, j: null });
  }
  for (const v of Object.keys(VOWELS)) d.push({ k: "wild", c: null, j: v });
  for (let i = 0; i < 4; i++) d.push({ k: "w4", c: null, j: null });
  d.forEach((x, i) => x.i = i);
  return Object.freeze(d.map(Object.freeze));
})();

export const ACTION_NAME = { skip: "건너뛰기", rev: "방향 반대", d2: "+2", wild: "와일드", w4: "+4" };
export const ACTION_MARK = { skip: "⊘", rev: "⇄", d2: "+2", wild: "", w4: "+4" };

/* 카드 한 줄 설명 (학생 화면에서 고른 카드 아래에 표시) */
export function describe(card) {
  if (card.k === "n") {
    const x = CONS[card.j];
    const kind = x.sub ? `울림소리(${x.sub})` : COLOR_INFO[x.c].manner;
    return [card.j, `${x.p}소리`, kind, x.s ? `${x.s}소리` : null].filter(Boolean).join(" · ");
  }
  if (card.k === "wild") {
    const v = VOWELS[card.j];
    return `${card.j} · 단모음 · ${v.f} · ${v.h}모음 · ${v.r} — 아무 데나 내고 색을 고릅니다`;
  }
  if (card.k === "w4") return "+4 — 색을 고르고, 다음 사람이 4장 (방어 문제를 맞히면 2장)";
  const map = { skip: "다음 사람 차례를 건너뜁니다", rev: "도는 방향이 바뀝니다", d2: "다음 사람이 2장 받고 차례를 쉽니다" };
  return `${COLOR_INFO[card.c].manner} ${ACTION_NAME[card.k]} — ${map[card.k]}`;
}
