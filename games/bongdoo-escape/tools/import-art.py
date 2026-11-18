"""받은 그림을 게임에 넣기:  python3 games/bongdoo-escape/tools/import-art.py <그림 파일> <이름>
이름: title · end_true · end_escape · end_night  → assets/art/<이름>.webp (가로 1600)
      minjae · sua · taeo · haeun · seoyul · seojin · jaehee · police → assets/portraits/<이름>.webp (480×600)"""
import sys, pathlib
from PIL import Image, ImageOps
root = pathlib.Path(__file__).resolve().parent.parent
src, name = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGB")
if name in ("title", "end_true", "end_escape", "end_night"):
    out = root / "assets/art" / f"{name}.webp"
    if im.width > 1600: im = im.resize((1600, round(im.height * 1600 / im.width)), Image.LANCZOS)
    q = 78
else:
    out = root / "assets/portraits" / f"{name}.webp"
    im = ImageOps.fit(im, (480, 600), Image.LANCZOS, centering=(0.5, 0.3))
    q = 82
out.parent.mkdir(parents=True, exist_ok=True)
im.save(out, "WEBP", quality=q, method=6)
print(out.relative_to(root), out.stat().st_size // 1024, "KB")
