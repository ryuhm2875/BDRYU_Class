# 마지막 배는 6시

폐교에 갇힌 2~5명이 30분 안에 단서를 모아
두 사람의 누명을 벗기는 공포 방탈출.
칠판(선생님 PC)이 심판, 학생은 태블릿 1대씩.

> 지금은 **뼈대 단계**입니다.
> ① 교실 퍼즐은 실제로 돌아가고, ②~⑤는 임시 자물쇠(두 사람이 두 자리씩 나눠 든 번호)로 흐름만 이어 둡니다.

## 폴더

```
games/bongdoo-escape/
├─ index.html
├─ css/escape.css
├─ vendor/three.module.min.js   three.js r170 (설치 없이 그대로)
├─ js/app.js            처음 화면 · 참가 · 길 나누기
├─ js/net.js            류노 net.js 그대로 (Firebase / ?local=1 시험 모드)
├─ js/firebase-config.js  데이터 자리 rooms/escape-방번호
├─ js/data.js           캐릭터 5명 · 방 5개 · 지도 · ‘그것’ 순찰 길 (공용)
├─ js/split.js          방 나누기 · 캐릭터 나누기 (칠판)
├─ js/judge.js          판정 · 벌칙 · 힌트 · 엔딩 (칠판)
├─ js/answers.js        정답 · 단서 내용 · 힌트 (칠판만 불러옴)
├─ js/board.js          칠판: 대기실 · 모둠별 단면도 · 결과
├─ js/player.js         학생: 캐릭터 소개 · 조작 · HUD
├─ js/world.js          3D 폐교 (쿼터뷰 · 손전등 그림자 · 저해상도 디더링)
├─ js/puzzles.js        2D 화면: 단서 · 장면 카드 · 자물쇠 · 일기장
├─ js/sound.js          WebAudio 소리 (파일 없음)
├─ tests/rules.test.mjs 규칙 자동 시험
└─ tools/bump-version.py
```

## 주소

| 주소 | 쓰임 |
|---|---|
| `games/bongdoo-escape/` | 처음 화면 |
| `?board=1` | 칠판 |
| `?join=방번호` | 학생 (QR로 들어오면 자동) |
| `?local=1` 덧붙임 | 인터넷 없이 한 브라우저 탭끼리 시험 |

## 데이터 구조

```
rooms/escape-방번호/
├─ meta              { host, at }
├─ pub               { phase, cfg:{fear}, startAt, teams:{ T1:{ m, c, solved, part, ev, wrong, lock, bo, bat, hint, diary, threat, end, msg } } }
├─ seats/기기        { name, on, at }                ← 학생
├─ priv/기기         { tid, clues:{ 방:{ 캐릭터: 단서 } } }  ← 칠판이 그 학생에게만
├─ pos/모둠/캐릭터   { x, z, a, f(손전등), h(숨음), fr(굳음), bat, emo, by }  ← 학생이 직접 (움직일 때 1초 5번)
└─ inbox/기기/요청   { t: order|code|diary|hint, room, v }  ← 학생이 쓰고 칠판이 지움
```

- 모든 시각은 ‘게임 시작부터 지난 ms’로 적어서, 기기마다 시계가 달라도 같게 보입니다.
- ‘그것’의 위치는 시작 시각만으로 계산합니다. 모두의 화면에서 같은 자리에 있고, 네트워크를 쓰지 않습니다.

## 시험

- `node games/bongdoo-escape/tests/rules.test.mjs` (방 나누기 · 캐릭터 · 판정 137가지)
- 화면: `?local=1` 로 칠판 탭 1개 + 학생 탭 여러 개

## 배포

1. `python3 games/bongdoo-escape/tools/bump-version.py`
2. 커밋하고 `main` 에 올리기
