/* ──────────────────────────────────────────────────────────────
   RYUNO · Firebase 설정
   - 품사 경매·음운 부루마블과 같은 프로젝트(appleday-quiz)를 씁니다.
   - 웹용 apiKey 는 원래 공개되는 값입니다. 비밀번호가 아닙니다.
     데이터를 지키는 건 firebase/database.rules.json 의 보안 규칙입니다.
   - 다른 Firebase 프로젝트로 옮기려면 이 파일만 바꾸면 됩니다.
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

/* 잠금 모드
   false (지금): 기존 게임과 같은 방식. 로그인 없음, 콘솔 설정 필요 없음.
                 데이터 자리: rooms/ryuno-방번호
                 손패는 화면에 자기 것만 보이지만, DB 자체를 잠그지는 않음.
   true        : 익명 로그인 + 보안 규칙(firebase/database.rules.json)으로 손패를 잠금.
                 데이터 자리: ryuno/rooms/방번호
                 켜기 전에 README 의 'Firebase 설정' 두 가지를 먼저 해야 합니다. */
export const SECURE = false;

export const roomPath = code => SECURE ? `ryuno/rooms/${code}` : `rooms/ryuno-${code}`;

/* 선생님(심판)이 6시간 넘게 신호가 없으면 그 방 번호를 새 방이 다시 쓸 수 있습니다. */
export const STALE_MS = 6 * 60 * 60 * 1000;
