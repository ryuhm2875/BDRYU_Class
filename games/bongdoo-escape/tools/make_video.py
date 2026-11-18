"""원본 영상(가로, 카메라 표시) + 쇼츠(세로, 자막·음악) 만들기"""
import subprocess, numpy as np, wave, os, sys
SRC = "/tmp/vid"; OUT = sys.argv[1]; TMP = "/tmp/vid/out"; os.makedirs(TMP, exist_ok=True)
FONT = "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"
MUSIC = sys.argv[2]
def run(c): subprocess.run(c, check=True)
SR = 44100
def wav(path, x):
    x = np.clip(x, -1, 1); d = (x * 32000).astype(np.int16)
    with wave.open(path, "wb") as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(d.tobytes())
rng = np.random.default_rng(3)
def lowpass(x, a): 
    y = np.empty_like(x); s = 0.0
    for i in range(len(x)): s += a * (x[i] - s); y[i] = s
    return y
def wind(sec):
    n = int(sec * SR); x = rng.standard_normal(n)
    y = lowpass(x, 0.02); y /= np.abs(y).max() + 1e-9
    env = 0.6 + 0.4 * np.sin(np.linspace(0, sec * 0.9, n)) 
    return y * env * 0.18
def horn(n, at, dur=1.6, vol=0.22):
    t = np.arange(int(dur * SR)) / SR
    tone = (np.sign(np.sin(2*np.pi*98*t)) * 0.4 + np.sin(2*np.pi*98*t) + 0.5*np.sin(2*np.pi*147*t))
    env = np.minimum(1, t / 0.15) * np.minimum(1, (dur - t) / 0.4)
    y = lowpass(tone * env, 0.08) * vol; out = np.zeros(n); i = int(at * SR); out[i:i+len(y)] += y[:max(0, n-i)]; return out
def crackle(n, vol=0.12):
    x = np.zeros(n); idx = rng.integers(0, n, n // 900); x[idx] = rng.uniform(-1, 1, len(idx))
    return lowpass(x, 0.5) * vol * 6

# ---------- 원본 ----------
# (장면, 시작, 길이, 영상 시간표 초, 카메라 시계 4시 몇 분 몇 초(초 단위))
SEG = [("a", 0.0, 5.5, 0, 11*60+20), ("b", 0.5, 6.0, 41, 12*60+1), ("c", 1.5, 6.0, 52, 12*60+12), ("d", 2.0, 6.0, 90, 12*60+50)]
parts = []
for i, (s, st, du, tc, ck) in enumerate(SEG):
    osd = (
      f"drawtext=fontfile={FONT}:text='● REC':x=24:y=20:fontsize=20:fontcolor=red@0.9:enable='lt(mod(t,1),0.6)',"
      f"drawtext=fontfile={FONT}:text='%{{eif\\:trunc(({tc}+t)/60)\\:d\\:2}}\\:%{{eif\\:mod({tc}+t,60)\\:d\\:2}}':x=w-tw-24:y=20:fontsize=20:fontcolor=white@0.9:shadowcolor=black@0.6:shadowx=1:shadowy=1,"
      f"drawtext=fontfile={FONT}:text='PM 04\\:%{{eif\\:trunc(({ck}+t)/60)\\:d\\:2}}\\:%{{eif\\:mod({ck}+t,60)\\:d\\:2}}':x=w-tw-22:y=h-th-18:fontsize=13:fontcolor=white@0.85:shadowcolor=black@0.6:shadowx=1:shadowy=1"
    )
    o = f"{TMP}/o{i}.mp4"
    run(["ffmpeg","-loglevel","error","-y","-ss",str(st),"-t",str(du),"-i",f"{SRC}/{s}.mp4",
         "-vf",f"scale=854:480,eq=saturation=0.92,{osd},fade=t=in:st=0:d=0.25,fade=t=out:st={du-0.3}:d=0.3",
         "-an","-c:v","libx264","-preset","veryfast","-crf","26","-pix_fmt","yuv420p","-r","24",o])
    parts.append(o)
with open(f"{TMP}/o.txt","w") as f: f.write("".join(f"file '{p}'\n" for p in parts))
run(["ffmpeg","-loglevel","error","-y","-f","concat","-safe","0","-i",f"{TMP}/o.txt","-c","copy",f"{TMP}/o_v.mp4"])
total = sum(d for _,_,d,_,_ in SEG); n = int(total * SR)
au = wind(total)
b0 = SEG[0][2]  # b 시작 위치
au += horn(n, b0 + 0.9) + horn(n, b0 + 3.2)        # 41초쯤 뱃고동 두 번
cr = crackle(int(SEG[1][2]*SR)); au[int(b0*SR):int(b0*SR)+len(cr)] += cr
wav(f"{TMP}/o.wav", au)
run(["ffmpeg","-loglevel","error","-y","-i",f"{TMP}/o_v.mp4","-i",f"{TMP}/o.wav","-c:v","copy","-c:a","aac","-b:a","64k","-shortest","-movflags","+faststart",f"{OUT}/original.mp4"])

# 확대용 정지 화면 (카메라 표시 포함) + 카드용 그림
t0 = 0
for i, (s, st, du, tc, ck) in enumerate(SEG):
    run(["ffmpeg","-loglevel","error","-y","-ss",str(t0 + du*0.6),"-i",f"{OUT}/original.mp4","-frames:v","1","-q:v","4",f"{OUT}/orig_{s}.jpg"])
    run(["ffmpeg","-loglevel","error","-y","-ss",str(st + du*0.6),"-i",f"{SRC}/{s}.mp4","-frames:v","1","-vf","scale=480:270","-q:v","5",f"{OUT}/scene_{s}.jpg"])
    t0 += du

# ---------- 쇼츠 (세로) ----------
SH = [("d", 2.5, 4.5, (0.45, 0.82), "봉두분교 화재 현장"), ("a", 1.5, 4.0, (0.36, 0.5), "그런데 이 사람…"), ("c", 2.0, 5.5, (0.36, 0.5), "범인은 현장에 돌아온다")]
parts = []
for i, (s, st, du, cx, cap) in enumerate(SH):
    o = f"{TMP}/s{i}.mp4"
    c0, c1 = cx
    crop = f"crop=405:720:'min(max(0,({c0}+({c1}-{c0})*min(1,t/{du}))*1280-202),875)':0"
    zoom = "scale=360*1.06:640*1.06,crop=360:640:(iw-360)/2+sin(t*9)*3:(ih-640)/2+cos(t*7)*3"
    txt = (f"drawtext=fontfile={FONT}:text='{cap}':x=(w-tw)/2:y=h*0.70:fontsize=30:fontcolor=white:borderw=4:bordercolor=black,"
           f"drawtext=fontfile={FONT}:text='봉두분교 방화 사건':x=(w-tw)/2:y=44:fontsize=22:fontcolor=yellow:borderw=3:bordercolor=black")
    run(["ffmpeg","-loglevel","error","-y","-ss",str(st),"-t",str(du),"-i",f"{SRC}/{s}.mp4",
         "-vf",f"{crop},scale=360:640,eq=contrast=1.12:saturation=1.15,{zoom},{txt}",
         "-an","-c:v","libx264","-preset","veryfast","-crf","27","-pix_fmt","yuv420p","-r","24",o])
    parts.append(o)
with open(f"{TMP}/s.txt","w") as f: f.write("".join(f"file '{p}'\n" for p in parts))
run(["ffmpeg","-loglevel","error","-y","-f","concat","-safe","0","-i",f"{TMP}/s.txt","-c","copy",f"{TMP}/s_v.mp4"])
tot = sum(x[2] for x in SH)
run(["ffmpeg","-loglevel","error","-y","-i",f"{TMP}/s_v.mp4","-ss","20","-t",str(tot),"-i",MUSIC,
     "-filter_complex",f"[1:a]volume=1.6,afade=t=in:d=0.4,afade=t=out:st={tot-0.8}:d=0.8[a]","-map","0:v","-map","[a]",
     "-c:v","copy","-c:a","aac","-b:a","64k","-shortest","-movflags","+faststart",f"{OUT}/shorts.mp4"])
run(["ffmpeg","-loglevel","error","-y","-ss","1","-i",f"{OUT}/shorts.mp4","-frames:v","1","-q:v","5",f"{OUT}/shorts_poster.jpg"])
print("ok")
