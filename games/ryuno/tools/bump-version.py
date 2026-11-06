"""고칠 때마다 실행:  python3 games/ryuno/tools/bump-version.py
js·css 주소 뒤에 ?v=시각 을 붙여, 학생 기기에 남은 옛 파일 대신 새 파일을 받게 합니다."""
import re, time, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
v = time.strftime("%Y%m%d%H%M")
for p in list((root / "js").glob("*.js")) + [root / "index.html"]:
    s = p.read_text(encoding="utf-8")
    s2 = re.sub(r'(from\s+"\./[\w-]+\.js)(\?v=\d+)?(")', rf'\1?v={v}\3', s)
    s2 = re.sub(r'(import\(`\$\{base\}[^`]*`\))', r'\1', s2)
    s2 = re.sub(r'((?:src|href)="(?:js|css)/[\w-]+\.(?:js|css))(\?v=\d+)?(")', rf'\1?v={v}\3', s2)
    if s2 != s: p.write_text(s2, encoding="utf-8")
print("버전", v)
