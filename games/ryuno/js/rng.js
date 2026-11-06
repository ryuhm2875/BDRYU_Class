/* ──────────────────────────────────────────────────────────────
   RYUNO · 난수와 섞기
   - 브라우저의 암호용 난수(crypto.getRandomValues)를 씁니다.
   - 0 ~ n-1 정수를 고를 때 '남는 부분 버리기'로 치우침을 없앱니다.
   - 섞기는 피셔-예이츠: 모든 순서가 정확히 같은 확률로 나옵니다.
   ────────────────────────────────────────────────────────────── */
const buf = new Uint32Array(64);
let pos = buf.length;
function u32() {
  if (pos >= buf.length) { crypto.getRandomValues(buf); pos = 0; }
  return buf[pos++];
}

/* 0 이상 n 미만 정수 (치우침 없음) */
export function cryptoInt(n) {
  if (n <= 1) return 0;
  const limit = Math.floor(0x100000000 / n) * n;   // 이 값 이상은 버림
  let x;
  do { x = u32(); } while (x >= limit);
  return x % n;
}

/* 시험용: 씨앗값이 같으면 같은 순서 (mulberry32) */
export function seeded(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return n => Math.floor(next() * n);
}

/* 피셔-예이츠 섞기. 새 배열을 돌려줌 */
export function shuffle(arr, rint = cryptoInt) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = rint(i + 1);
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}
