/* ──────────────────────────────────────────────────────────────
   마지막 배는 6시 · 대사
   한 줄: { who, face, text, sfx?, shake? }   who: me(주인공) · narr(설명) · NPC 아이디 · police · jaehee · seojin · voice
   고르기: { choice: [{ text, kind: "kind"|"harsh", then: [줄...] }] }
   {name} 은 학생이 넣은 이름으로 바뀜
   ────────────────────────────────────────────────────────────── */

export const INTRO = [
  { who: "narr", text: "2026년 11월. 고흥 앞바다, 봉두섬. 오후 5시 30분." },
  { who: "narr", text: "사흘째 연락이 없는 서진 언니. 마지막 메시지는 {name}에게 온 한 줄이었다." },
  { who: "voice", text: "“봉두분교. 내가 못 가면, 네가 이어 줘.”" },
  { who: "seoyul", face: "normal", text: "와 줘서 고마워, {name}. 언니가 마지막으로 연락한 사람이 너잖아." },
  { who: "minjae", face: "normal", text: "섬 나가는 배, 6시가 막배래. 30분이면… 충분하겠지?" },
  { who: "taeo", face: "normal", text: "할머니가 그러는데요, 해 지고 나면 저 학교 쪽으론 아무도 안 간대요." },
  { who: "haeun", face: "scared", text: "그런 말을 왜 지금 해…" },
  { who: "sua", face: "normal", text: "쇼츠 올라온 게 엊그제야. 서진 언니가 정말 불을 냈으면, 여기 뭐라도 남아 있겠지." },
  { who: "seoyul", face: "sad", text: "…안 냈어. 우리 언니는." },
  { who: "narr", text: "녹슨 정문을 밀고 들어선 순간—", sfx: "slam", shake: true },
  { who: "narr", text: "등 뒤에서 문이 닫혔다. 불이 나갔다. 누군가 비명을 지르고, 발소리가 사방으로 흩어졌다." },
  { who: "narr", text: "다시 눈을 떴을 때, 복도에는 {name} 혼자였다." },
  { who: "me", text: "…서율아? 승우야? 다들 어디 있어?" },
  { who: "narr", text: "대답 대신 어딘가에서 공 튀는 소리가 들린다. 통, 통, 통." },
  { who: "narr", text: "발밑에서 휴대폰 화면이 깜빡인다. 서진 언니의 폰이다. 배터리 12%." },
  { who: "narr", text: "조이스틱으로 움직이고, 가까이 가면 [살펴보기]. 서진의 폰은 오른쪽 위에 있어요." }
];

export const MEMO = "27년 전 재희처럼 되기 싫어.\n이걸 찾았으면,\n끝까지 이어 줘.";

/* ---------- 친구를 찾았을 때 ---------- */
export const FOUND = {
  minjae: [
    { who: "narr", text: "사물함 안에서 누군가 숨을 참고 있다. 문을 당기자—" },
    { who: "minjae", face: "scared", text: "으악! …아, {name}, 너구나. 심장 떨어지는 줄." },
    { who: "minjae", face: "scared", text: "불 꺼지자마자 여기로 뛰어들었어. 복도에 뭔가 있었어. 사람 같은데… 고개가, 이상하게 꺾여 있었어." },
    { who: "me", text: "나도 봤어. 일단 같이 다니자." },
    { who: "minjae", face: "normal", text: "그리고 이거. 서진 누나 영상 원본이 내 카메라에 있어. 누나가 쇼츠 퍼지기 전날 백업해 달라고 보낸 거야." },
    { who: "minjae", face: "normal", text: "교실 TV에 연결하면 크게 볼 수 있을 거야." },
    { who: "narr", text: "승우가 일행이 되었다.  능력 · 확대: 사진과 영상의 가장자리를 들여다본다." }
  ],
  sua: [
    { who: "narr", text: "책상 밑에서 누렇게 바랜 스크랩북을 꼭 끌어안은 손이 보인다." },
    { who: "sua", face: "scared", text: "쉿! …발소리 지나갈 때까지만. 저거, 문 앞에서 한참 서 있다 갔어." },
    { who: "sua", face: "normal", text: "숨어 있는 동안 캐비닛을 뒤졌어. 1999년 신문 스크랩이야. 재희라는 애 기사." },
    { who: "sua", face: "normal", text: "서진 언니 메모에 있던 이름이잖아. 27년 전 재희." },
    { who: "minjae", face: "normal", text: "사진에 재희밖에 없네. 근데 이거, 구도가 너무 딱 잘려 있지 않아?" },
    { who: "narr", text: "수아가 일행이 되었다.  능력 · 대조: 두 기록을 나란히 놓고 다른 점을 찾는다." }
  ],
  taeo: [
    { who: "narr", text: "복도 끝 사물함에서 훌쩍이는 소리가 난다." },
    { who: "taeo", face: "scared", text: "형, 누나… 진짜 형 누나 맞죠? 아까 저게 사물함 앞에서 멈췄었어요. 숨도 못 쉬었어요." },
    { who: "me", text: "괜찮아. 이제 같이 가자." },
    { who: "taeo", face: "normal", text: "숙직실 가려고요? 거기 문은 안에서 책장이 쓰러져서 못 열어요. 할머니가 옛날 얘기 해 줬거든요." },
    { who: "taeo", face: "normal", text: "교무실 캐비닛 뒤에 창고로 통하는 쪽문이 있어요. 거기로 돌아가면 돼요." },
    { who: "narr", text: "태오가 일행이 되었다.  능력 · 지름길: 잠긴 길을 돌아가는 길과 숨을 곳을 안다." }
  ],
  haeun: [
    { who: "narr", text: "손전등을 끄자, 어둠 속에서 이불이 천천히 들썩인다." },
    { who: "narr", text: "차가운 손이 발목을 움켜쥐었다.", sfx: "caught", shake: true },
    { who: "haeun", face: "scared", text: "…{name}? 진짜 너야? 불 비추지 마. 불빛 보이면 저게 와." },
    { who: "haeun", face: "scared", text: "여기 혼자 있으니까 테이프 돌아가는 소리가 계속 들렸어. 아무도 안 틀었는데." },
    { who: "haeun", face: "normal", text: "…그래도 이제 괜찮아. 소리는 내가 제일 잘 들어. 저게 어디쯤 있는지도 발소리로 알려 줄게." },
    { who: "narr", text: "하은이가 일행이 되었다.  능력 · 귀 기울이기: 소리의 진짜·가짜를 가리고, ‘그것’의 방향을 화면 가장자리에 알려 준다." }
  ],
  seoyul: [
    { who: "narr", text: "방송실 구석, 커튼 뒤에서 낯익은 운동화 끝이 보인다." },
    { who: "seoyul", face: "scared", text: "{name}…! 스피커에서 언니 목소리가 났어. ‘서율아, 이리 와’ 하고. 따라왔더니 문이 잠겼어." },
    { who: "seoyul", face: "sad", text: "근데 언니 목소리가 아니었어. 언니는 나를 ‘율’이라고 불러." },
    { who: "seoyul", face: "normal", text: "그 폰 줘 봐. 언니 잠금 패턴 알아. 숨겨 둔 앱이 하나 있었어." },
    { who: "narr", text: "서율이 일행이 되었다.  능력 · 잠금 풀기: 언니 폰 속 잠긴 앱을 연다." }
  ]
};

/* ---------- 털어놓는 사연. after: 그 방을 푼 뒤 (out: 처음 바깥에 나갔을 때) ---------- */
export const CONFESS = {
  minjae: { after: 1, frag: "쇼츠 화질이 원본보다 좋다. 원본을 먼저 받은 누군가가 손본 것이다",
    lines: [
      { who: "minjae", face: "sad", text: "…그 쇼츠 말이야. 처음 떴을 때 내가 ‘좋아요’ 눌렀어." },
      { who: "minjae", face: "sad", text: "사진 잘 찍었네, 그 생각뿐이었어. 그게 누나 얼굴인 줄도 모르고." }
    ],
    choice: [
      { text: "그거 하나가 얼마나 퍼졌는데.", kind: "harsh",
        then: [{ who: "minjae", face: "sad", text: "…그렇지. 할 말 없다." }] },
      { text: "누르기는 쉬워. 이제 원본을 봤으니까, 바로잡는 것도 우리가 할 수 있잖아.", kind: "kind",
        then: [{ who: "minjae", face: "normal", text: "…맞아. 그럼 이것도 알아 둬. 쇼츠 화질이 원본보다 좋아. 퍼 나른 게 아니라, 원본을 먼저 받은 누군가가 손본 거야." }] }
    ] },
  sua: { after: 2, frag: "처음 퍼진 링크 주소에 ‘해송’이라는 글자가 들어 있었다",
    lines: [
      { who: "sua", face: "sad", text: "나… 그 쇼츠 단톡방에 올렸어. 다들 올리길래." },
      { who: "sua", face: "sad", text: "기사 사진 보니까 알겠어. 나도 잘린 사진만 보고 판결한 거야." }
    ],
    choice: [
      { text: "너 때문에 더 퍼진 거잖아.", kind: "harsh",
        then: [{ who: "sua", face: "sad", text: "…미안." }] },
      { text: "나도 처음엔 믿을 뻔했어. 지금부터 같이 바로잡자.", kind: "kind",
        then: [{ who: "sua", face: "normal", text: "…고마워. 그럼 하나 말해 줄게. 맨 처음 받은 링크 주소에 ‘haesong’이라고 적혀 있었어. 아까 시계 글자랑 같아." }] }
    ] },
  taeo: { after: 3, frag: "할머니는 1999년에 재희를 직접 본 적이 없다고 했다",
    lines: [
      { who: "taeo", face: "sad", text: "두 번째 테이프… 저거 우리 할머니 목소리예요." },
      { who: "taeo", face: "sad", text: "할머니가 그런 말 했을 줄 몰랐어요. 그 집 애들이 원래 어쩌고… 우리 할머니가." }
    ],
    choice: [
      { text: "그럼 너희 할머니도 재희한테 누명 씌운 거네.", kind: "harsh",
        then: [{ who: "taeo", face: "sad", text: "…네." }] },
      { text: "할머니가 잘못 말한 거지, 네 잘못은 아니야. 이제 우리가 제대로 들으면 돼.", kind: "kind",
        then: [{ who: "taeo", face: "normal", text: "…할머니가 요즘 가끔 그래요. ‘그때 그 애를 본 사람은 하나도 없었는데’ 하고. 그게 이 얘기였나 봐요." }] }
    ] },
  haeun: { after: 4, frag: "방송실 스피커는 해송개발 이름으로 설치 신청이 되어 있었다",
    lines: [
      { who: "haeun", face: "scared", text: "아까 불 꺼졌을 때… 나 진짜 숨이 안 쉬어졌어." },
      { who: "haeun", face: "sad", text: "밤에 혼자 있는 게 제일 무서워. 그래서 방송부 한 거야. 마이크 앞에선 혼자가 아니니까." }
    ],
    choice: [
      { text: "그렇게 무서우면 따라오지 말지 그랬어.", kind: "harsh",
        then: [{ who: "haeun", face: "sad", text: "…그러게." }] },
      { text: "무서운데도 여기까지 왔잖아. 지금은 혼자 아니야.", kind: "kind",
        then: [{ who: "haeun", face: "normal", text: "…응. 그럼 이거. 스피커 뒤 스티커에 설치 업체 이름이 있었어. 해송개발." }] }
    ] },
  seoyul: { after: "out", frag: "서진은 떠나기 전날 ‘재희 언니를 찾았다’고 말했다",
    lines: [
      { who: "seoyul", face: "sad", text: "언니 떠나기 전날, 나 언니랑 싸웠어. 맨날 폐교만 찍고 다닌다고. 창피하다고." },
      { who: "seoyul", face: "sad", text: "쇼츠 처음 봤을 때… 솔직히 한순간, 진짜일까 봐 무서웠어." }
    ],
    choice: [
      { text: "동생이 언니를 의심하면 어떡해.", kind: "harsh",
        then: [{ who: "seoyul", face: "sad", text: "…알아. 그래서 더 미안해." }] },
      { text: "무서웠으니까 여기까지 온 거잖아. 언니한테 직접 말하자.", kind: "kind",
        then: [{ who: "seoyul", face: "normal", text: "…응. 그날 언니가 마지막으로 그랬어. ‘재희 언니를 찾았어. 이번엔 내가 이어 줄 거야.’ 그땐 무슨 말인지 몰랐어." }] }
    ] }
};

/* ---------- 방에 처음 들어갈 때 ---------- */
export const ENTER = {
  1: [{ who: "narr", text: "교실. 칠판에 분필 글씨가 남아 있다. 1999년 5월 3일, 그대로 멈춘 시간." }],
  2: [{ who: "narr", text: "교무실. 서류가 바닥에 흩어져 있고, 벽에는 빈 액자 자국만 하얗게 남았다." },
      { who: "minjae", face: "normal", text: "저 구석 환등기, 아직 전구가 살아 있을 것 같은데.", needs: "minjae" }],
  3: [{ who: "narr", text: "숙직실. 곰팡이 냄새. 창고 쪽문으로 기어 들어오자 어둠이 한 겹 더 짙다." },
      { who: "taeo", face: "scared", text: "여기… 할머니가 제일 가지 말라던 방이에요.", needs: "taeo" },
      { who: "narr", text: "이불 쪽에서 무언가 움찔한다. 불빛이 닿자 더 움츠러든다." }],
  4: [{ who: "narr", text: "방송실. 꺼져 있어야 할 앰프에 빨간 불이 들어와 있다." },
      { who: "voice", text: "스피커: “…{name}… 이리 와…”", sfx: "whisper" },
      { who: "narr", text: "방 한가운데, 또 하나의 마네킹이 서 있다. 이쪽을 보고." }],
  5: [{ who: "narr", text: "바깥. 바닷바람에 짠내가 섞여 있다. 선착장 끝에 6시 배의 불빛이 보인다." },
      { who: "narr", text: "그 앞을 주재소 경찰이 막아섰다." }]
};

/* ---------- 살펴보기 (이야기 소품) ---------- */
export const LOOK = {
  board: [{ who: "narr", text: "“1999. 5. 3. (월) 자습. 주번 윤재희.” 그날 아침, 재희는 이 칠판에 자기 이름을 썼을까." }],
  calendar: [{ who: "narr", text: "1999년 5월 달력. 3일에 빨간 동그라미. 아무 설명도 없다." }],
  clock: [{ who: "narr", text: "깨진 벽시계. 바늘이 빠져 있다. 시간을 알려면 다른 걸 봐야 한다." }],
  shelf: [{ who: "narr", text: "학급문고. 책등마다 ‘봉두분교’ 도장. 한 권은 대출 카드에 ‘윤재희’라고 적혀 있다." },
          { who: "sua", face: "normal", text: "반납 날짜가 5월 4일이야. 못 돌려줬네.", needs: "sua" }],
  cabinet: [{ who: "narr", text: "철제 캐비닛. 서랍 하나가 억지로 뜯겨 있다. 누군가 먼저 뭔가를 찾아갔다." }],
  bed: [{ who: "narr", text: "숙직실 침대. 이불에 아직 체온이 남아 있다." }],
  poster: [{ who: "narr", text: "방송실 벽 포스터. ‘봉두분교 개교 50주년 · 2001’. 그 뒤로 학교는 문을 닫았다." }],
  decoy: [{ who: "narr", text: "가까이서 보니 그냥 마네킹이다. 목 뒤에 작은 스피커와 배선이 붙어 있다." },
          { who: "haeun", face: "normal", text: "이거야. 아까 그 목소리, 여기서 나온 거야.", needs: "haeun" }],
  notice: [{ who: "narr", text: "주재소 게시판. ‘봉두분교 부지 매각 설명회 · 해송개발’. 날짜는 다음 주." }]
};

/* ---------- 틀렸을 때 일행의 반응 ---------- */
export const WRONG = {
  minjae: ["잠깐, 원본 다시 보자. 뭔가 놓쳤어.", "확대해 보면 다르게 보일 거야."],
  sua: ["기록이랑 맞춰 보자. 말보다 기록.", "하나씩 대조해 봐. 서두르면 우리도 쇼츠 퍼뜨린 사람들이랑 똑같아."],
  taeo: ["형, 누나, 발소리 커져요…!", "천천히요. 아직 시간 있어요."],
  haeun: ["쉿… 오고 있어.", "소리가 가까워. 다음엔 꼭 맞혀야 해."],
  seoyul: ["언니 일이야. 대충 하지 말자.", "다시. 이번엔 근거만 보자."]
};

/* ---------- 일행이 가끔 하는 말 ---------- */
export const CHATTER = {
  minjae: { near_it: "저거… 고개가 이상하게 꺾여 있어.", tv: "TV 뒤에 단자 있다. 카메라 꽂아 볼게." },
  sua: { near_it: "손전등 꺼. 빨리." },
  taeo: { near_it: "사물함! 사물함에 숨어요!" },
  haeun: { near_it: "왼쪽에서 와… 아니, 바로 앞이야." },
  seoyul: { near_it: "보지 마. 그냥 지나가." }
};

/* ---------- 막혔을 때 혼잣말 (공짜) ---------- */
export const NUDGE = {
  start: "교실 쪽에서 덜컹, 덜컹. 사물함 소리다.",
  needMinjae: "TV는 켜지는데, 볼 영상이 없다. 원본을 가진 사람이 있었는데…",
  needMinjaeProj: "환등기에 끼울 필름이 없다. 승우가 필름 카메라를 늘 들고 다녔는데.",
  door3: "숙직실 문이 꿈쩍도 안 한다. 안쪽에서 무거운 게 막고 있다.",
  needTaeo: "쪽문이 있지만 녹이 슬어 어디를 밀어야 할지 모르겠다. 섬 지리를 아는 사람이 있으면…",
  haeunLight: "이불이 움찔한다. 불빛이 닿자 더 움츠러든다… 손전등을 꺼 볼까?",
  tapesNoHaeun: "테이프가 늘어져서 소리가 뭉개진다. 귀가 밝은 사람이 있었으면.",
  needSeoyul: "업로드 기록 앱이 패턴으로 잠겨 있다. 서진 언니 패턴을 아는 사람은…",
  needTaeoFlyer: "이 그림, 어디서 본 것 같은데… 섬 사람한테 물어봐야 할 것 같다.",
  police: "경찰이 팔짱을 끼고 서 있다. 모은 증거로 설득해야 배가 기다려 준다."
};

/* ---------- 무서운 순간 ---------- */
export const EVENTS = {
  corridor: [{ who: "narr", text: "복도 끝에서 무언가가 천천히 고개를 꺾는다. 이쪽을 향해.", sfx: "whisper" },
             { who: "narr", text: "손전등 불빛 안에 들어가면 들킨다. 불을 끄고, 사물함에 숨을 수 있다." }],
  tv: [{ who: "narr", text: "꺼 둔 TV가 저절로 켜진다. 지지직—", sfx: "static" },
       { who: "voice", text: "어린 여자아이 목소리: “…나 여기 있어.”" },
       { who: "minjae", face: "scared", text: "방금… 들었지? 원본에 저런 소리 없었어.", needs: "minjae" }],
  phone: [{ who: "narr", text: "주머니 속 서진의 폰이 진동한다.", sfx: "vibrate" },
          { who: "voice", text: "📱 알 수 없는 번호: “거기서 나가.”" }],
  tape: [{ who: "voice", text: "마지막 테이프 끝, 잡음 사이로: “…아무도 원래 사진을 안 봤어.”", sfx: "static" },
         { who: "haeun", face: "scared", text: "이건 녹음된 소리가 아니야. 지금… 여기서 난 소리야.", needs: "haeun" }],
  device: [{ who: "narr", text: "제어 장치의 스위치를 내리는 순간, 건물의 모든 불이 꺼졌다.", sfx: "blackout", shake: true },
           { who: "narr", text: "어둠 속에서 툭, 하고 무언가 쓰러지는 소리." },
           { who: "narr", text: "다시 손전등을 켜자, 복도의 ‘그것’이 바닥에 엎어져 있다. 스피커와 타이머 조명, 그리고 마네킹." },
           { who: "seoyul", face: "normal", text: "…사람 쫓아내려고 이런 걸 해 놨던 거야. 폐교 터 사려고.", needs: "seoyul" }],
  ten: [{ who: "voice", text: "📢 선착장 방송: “막배 출항 10분 전입니다.”" }],
  five: [{ who: "narr", text: "창밖이 완전히 어두워졌다. 등 뒤에서 누군가 숨을 쉬는 것 같다." }]
};

/* ---------- ⑤ 경찰 ---------- */
export const POLICE = {
  open: [
    { who: "police", face: "normal", text: "너희 여기서 뭐 하는 거냐. 이 학교, 불난 데라 출입 금지야." },
    { who: "me", text: "서진 언니는 불을 안 냈어요. 증거가 있어요." },
    { who: "police", face: "normal", text: "증거? 인터넷에 영상까지 다 돌았는데. …좋아, 말해 봐. 논리가 맞으면 배 세워 줄게." }
  ],
  rebutAsk: [{ who: "police", face: "normal", text: "그 벽시계가 고장 났을 수도 있잖아? 그 말 하나로 시각을 믿으라고?" }],
  win: [
    { who: "police", face: "normal", text: "…백고동 두 번. 4시 10분 배 맞네. 그 배, 내가 직접 띄웠어." },
    { who: "police", face: "normal", text: "그럼 불은 그 전에 났다는 거고. 알겠다. 배 기다리라고 무전 넣을게." },
    { who: "haeun", face: "normal", text: "원본 영상 마지막에 배가 하나 더 지나가. 서진 언니가 탄 배야.", needs: "haeun" },
    { who: "taeo", face: "normal", text: "그 시간이면 녹동항 가는 배예요. 녹동… 거기 누가 살더라.", needs: "taeo" }
  ]
};

/* ---------- 엔딩 ---------- */
export const ENDINGS = {
  true: [
    { who: "narr", text: "6시 배가 섬을 떠난다. 갑판 위로 바람이 세다." },
    { who: "narr", text: "서진의 폰이 마지막 배터리로 울린다. 영상 통화." },
    { who: "seojin", face: "normal", text: "{name}…! 율아! …다 봤어. 너희가 올린 원본 영상, 댓글이 뒤집히고 있어." },
    { who: "seoyul", face: "sad", text: "언니, 나 그날… 미안해." },
    { who: "seojin", face: "normal", text: "나도. 그리고 소개할 사람이 있어." },
    { who: "jaehee", face: "normal", text: "안녕. 윤재희예요. 서진이가 며칠 저를 숨겨 줬어요. 아니, 제가 서진이를 숨겨 줬나." },
    { who: "jaehee", face: "normal", text: "1999년에 아무도 원래 사진을 안 봤어요. 그런데 오늘은 봐 준 사람들이 있네요." },
    { who: "seojin", face: "normal", text: "{name}, 이어 줘서 고마워." },
    { who: "narr", text: "화면 너머, 재희가 낡은 사진 한 장을 들어 보인다. 열네 살의 재희가 웃고 있다." }
  ],
  escape: [
    { who: "narr", text: "6시 배가 섬을 떠난다. 서진의 원본 영상이 올라가고, 쇼츠 밑 댓글이 하나둘 바뀐다." },
    { who: "seojin", face: "normal", text: "📱 서진: “{name}, 이어 줘서 고마워.”" },
    { who: "narr", text: "하지만 27년 전 재희의 이야기는 아직 반쯤 남아 있다. 일기장의 빈 장들처럼." }
  ],
  night: [
    { who: "narr", text: "6시. 뱃고동이 두 번 울리고, 배가 떠났다." },
    { who: "narr", text: "다음 날 아침, 구조선이 왔다. 그 사이 쇼츠는 하루 더 퍼졌다." },
    { who: "narr", text: "조회수 72만. 댓글은 아직 판결을 내리는 중이다." }
  ]
};
