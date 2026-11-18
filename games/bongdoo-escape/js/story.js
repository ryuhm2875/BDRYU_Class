/* ──────────────────────────────────────────────────────────────
   마지막 배는 6시 · 대사
   한 줄: { who, face, text }   who: me(주인공) · narr(설명) · NPC 아이디
   고르기: { choice: [{ text, kind: "kind"|"harsh", then: [줄...] }] }
   {name} 은 학생이 넣은 이름으로 바뀜
   ────────────────────────────────────────────────────────────── */

export const INTRO = [
  { who: "narr", text: "2026년 11월. 봉두섬. 오후 5시 30분." },
  { who: "seoyul", face: "normal", text: "와 줘서 고마워, {name}. 언니가 마지막으로 연락한 사람이 너잖아." },
  { who: "minjae", face: "normal", text: "섬 나가는 배는 6시가 막배래. 30분이면… 충분하겠지?" },
  { who: "haeun", face: "scared", text: "근데 여기, 너무 조용하지 않아?" },
  { who: "narr", text: "정문을 넘는 순간—", sfx: "slam", shake: true },
  { who: "narr", text: "문이 닫히고, 불이 나갔다. 비명. 흩어지는 발소리." },
  { who: "narr", text: "다시 눈을 떴을 때, 복도에는 {name} 혼자였다." },
  { who: "me", text: "…다들 어디 갔어?" },
  { who: "narr", text: "발밑에서 휴대폰 화면이 깜빡인다. 서진 언니의 폰이다. 배터리 12%." }
];

export const MEMO = "27년 전 재희처럼 되기 싫어.\n이걸 찾았으면,\n끝까지 이어 줘.";

/* NPC 를 찾았을 때 */
export const FOUND = {
  minjae: [
    { who: "narr", text: "사물함 안에서 누군가 숨을 참고 있다." },
    { who: "minjae", face: "scared", text: "으악! …아, {name}, 너구나. 심장 떨어지는 줄." },
    { who: "minjae", face: "scared", text: "불 꺼지자마자 여기로 뛰어들었어. 복도에 뭔가 있었어. 사람 같은데… 사람이 아니야." },
    { who: "minjae", face: "normal", text: "서진 누나 영상 원본, 내 카메라에 있어. 누나가 백업해 달라고 보낸 거." },
    { who: "minjae", face: "normal", text: "교실 TV에 연결하면 크게 볼 수 있을 거야. 같이 가자." },
    { who: "narr", text: "민재가 일행이 되었다.  능력 · 확대: 사진과 영상의 가장자리를 들여다본다." }
  ],
  sua: [
    { who: "narr", text: "책상 밑에서 스크랩북을 꼭 끌어안은 손이 보인다." },
    { who: "sua", face: "scared", text: "쉿! …발소리 지나갈 때까지만." },
    { who: "sua", face: "normal", text: "캐비닛에서 이걸 찾았어. 1999년 신문 스크랩. 재희라는 애 기사야." },
    { who: "sua", face: "normal", text: "서진 언니 메모에 있던 이름이잖아. 27년 전 재희." },
    { who: "narr", text: "수아가 일행이 되었다.  능력 · 대조: 두 기록을 나란히 놓고 다른 점을 찾는다." }
  ]
};

/* 방을 푼 뒤 털어놓는 사연. 감싸 주면 증거 조각 */
export const CONFESS = {
  minjae: { after: 1, frag: "쇼츠는 원본을 먼저 받은 누군가가 손본 것이다",
    lines: [{ who: "minjae", face: "sad", text: "…그 쇼츠 말이야. 처음 떴을 때 내가 ‘좋아요’ 눌렀어. 사진이 너무 잘 나와서. 아무 생각 없이." }],
    choice: [
      { text: "그거 하나가 얼마나 퍼졌는데.", kind: "harsh",
        then: [{ who: "minjae", face: "sad", text: "…그렇지. 할 말 없다." }] },
      { text: "누르기는 쉬워. 이제 원본을 봤으니까, 바로잡는 것도 우리가 할 수 있잖아.", kind: "kind",
        then: [{ who: "minjae", face: "normal", text: "…맞아. 그럼 이것도 봐. 쇼츠 화질이 원본보다 좋아. 누가 원본을 먼저 받아서 손본 거야." }] }
    ] },
  sua: { after: 2, frag: "처음 퍼진 링크 주소에 ‘봉두리조트’가 적혀 있었다",
    lines: [{ who: "sua", face: "sad", text: "나… 그 쇼츠 단톡방에 올렸어. 다들 올리길래. 그땐 진짜인 줄 알았어." }],
    choice: [
      { text: "너 때문에 더 퍼진 거잖아.", kind: "harsh",
        then: [{ who: "sua", face: "sad", text: "…미안." }] },
      { text: "나도 처음엔 믿을 뻔했어. 지금부터 같이 바로잡자.", kind: "kind",
        then: [{ who: "sua", face: "normal", text: "…고마워. 그럼 하나 말해 줄게. 맨 처음 올라온 링크, 주소가 이상했어. ‘봉두리조트’라고 적혀 있었어." }] }
    ] }
};

/* 일행이 가끔 하는 말 */
export const CHATTER = {
  minjae: { near_it: "저거… 고개가 이상하게 꺾여 있어.", tv: "TV 뒤에 단자 있다. 카메라 꽂아 볼게.", idle: "누나 영상, 끝까지 봐야 해." },
  sua: { near_it: "손전등 꺼. 빨리.", idle: "날짜가 하나라도 틀리면, 이야기 전체가 틀린 거야." }
};

/* 막혔을 때 혼잣말 (힌트와 별개, 공짜) */
export const NUDGE = {
  start: "교실 쪽에서 덜컹거리는 소리가 난다.",
  needMinjae: "TV는 켜지는데, 볼 영상이 없다. 원본을 가진 사람이 있었는데…",
  needSua: "교무실 어딘가에서 숨소리가 들린다.",
  needMinjaeProj: "환등기에 끼울 필름이 없다. 민재가 필름 카메라를 들고 다녔는데."
};
