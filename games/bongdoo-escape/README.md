# 마지막 배는 6시 (1인판)

태블릿 한 대, 학생 한 명이 30분 동안 폐교를 빠져나오는 공포 방탈출.
학생은 자기 이름으로 들어가 서진의 후배가 되고,
방마다 숨어 있던 친구를 찾아 일행을 늘려 갑니다.

> 지금 단계: 다섯 방 · 친구 다섯 · 세 엔딩까지 처음부터 끝까지 플레이 가능.
> 남은 것: 소리(무료 효과음 연결), 수채화 초상화·엔딩 그림, 태블릿 성능 점검.

## 폴더

```
games/bongdoo-escape/
├─ index.html
├─ css/escape.css
├─ vendor/three.module.min.js   three.js r170
├─ js/app.js        처음 화면 (이름 · 점퍼 색 · 공포 강도 · 이어 하기)
├─ js/game.js       게임 본체: 움직임 · 일행 따라오기 · 살펴보기 · ‘그것’ · 저장 · 결과 카드
├─ js/world.js      3D 폐교 (쿼터뷰 · 손전등 그림자 · 디더링 · 꼭짓점 흔들림 · 벽 낮춰 보기)
├─ js/textures.js   픽셀 텍스처 (그림 파일 없이 캔버스로. 바닥 그늘까지 구움)
├─ js/rig.js        관절 인형 · 마네킹 (걷기 · 숨기 · 겁먹기 · 굳기 · 눈 깜빡임)
├─ js/story.js      대사 (인트로 · 친구를 찾았을 때 · 사연과 대답 고르기)
├─ js/dialog.js     대화창 (초상화 · 한 자씩 · 고르기)
├─ js/puzzles.js    2D 화면: 단서 수첩 · 서진의 폰 · 장면 카드 · 자물쇠 · 사진 드래그 · 일기장
├─ js/judge.js      판정 · 벌칙 · 힌트 · 엔딩
├─ js/answers.js    정답 · 단서 내용 · 힌트
├─ js/data.js       방 · 지도 · 살펴볼 것 · ‘그것’ 순찰 길
├─ js/sound.js      WebAudio 소리
├─ tests/rules.test.mjs
└─ tools/bump-version.py
```

## 주소

| 주소 | 쓰임 |
|---|---|
| `games/bongdoo-escape/` | 게임 |
| `?debug=1` 덧붙임 | 개발 확인용 (콘솔에서 `__G` 로 상태 보기) |

## 저장

태블릿 브라우저에 자동 저장(`escape-solo-v1`). 껐다 켜도 이어 하기.
시간은 화면을 보고 있을 때만 흐름.

## 결과 카드

엔딩 뒤 이름 · 엔딩 · 걸린 시간 · 증거 · 일기장 · 틀림 · 힌트 · 친구에게 고른 대답 · 확인 번호.
확인 번호는 위 기록으로 만든 4자리라, 숫자를 고치면 번호가 맞지 않습니다
(`game.js` 의 `check()` 로 다시 계산해 볼 수 있음).

## 나중에 넣을 그림 · 소리

- 초상화: `assets/portraits/<아이디>_<표정>.webp` (아이디: minjae, sua, taeo, haeun, seoyul, me / 표정: normal, scared, sad).
  파일이 있으면 대화창이 자동으로 씀.
- 무료 소리(CC0)와 마네킹 동작(Quaternius Universal Animation Library 2): 받아서 넣으면 sound.js · rig.js 에 연결.

## 시험 · 배포

- `node games/bongdoo-escape/tests/rules.test.mjs`
- 고친 뒤 `python3 games/bongdoo-escape/tools/bump-version.py` → 커밋 → `main`
