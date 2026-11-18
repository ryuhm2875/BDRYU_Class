/* ──────────────────────────────────────────────────────────────
   마지막 배는 6시 · Firebase 설정
   - 류노·품사 경매와 같은 프로젝트(appleday-quiz)를 같이 씁니다.
   - 데이터 자리: rooms/escape-방번호  (다른 게임과 부딪히지 않음)
   ────────────────────────────────────────────────────────────── */
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBC6k6vLymeoesuzrtBa5nEqUMXAYJTGB0",
  authDomain: "appleday-quiz.firebaseapp.com",
  databaseURL: "https://appleday-quiz-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "appleday-quiz",
  storageBucket: "appleday-quiz.firebasestorage.app",
  messagingSenderId: "854361619311",
  appId: "1:854361619311:web:cd065f07f3172b7029869a"
};

export const FIREBASE_SDK = "10.12.2";

/* 잠금 모드는 류노와 같은 뜻. 지금은 끔 */
export const SECURE = false;

export const roomPath = code => SECURE ? `escape/rooms/${code}` : `rooms/escape-${code}`;

export const STALE_MS = 6 * 60 * 60 * 1000;
