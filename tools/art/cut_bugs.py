# 버그 시트(chatgpt_bugs_sheet.png, 8열×5행, 초록 #00FF00 배경) → assets/chars/bugs/<key>.png (투명, 128×128 정사각 가운데 정렬)
# 칸 순서 = _data/bugs.yml 순서. 저장소 루트에서 실행: python3 -I tools/art/cut_bugs.py <원본 폴더>
# 게임(play.js)은 그림이 정사각이라고 보고 그린다 — 크기를 바꾸면 SIZE 만 고친다.
import os, re, sys
from PIL import Image

SRC = os.path.join(sys.argv[1], 'chatgpt_bugs_sheet.png')
OUT, COLS, ROWS, SIZE, PAD = 'assets/chars/bugs/', 8, 5, 128, 4
keys = re.findall(r'^- key: (\S+)', open('_data/bugs.yml', encoding='utf-8').read(), re.M)
assert len(keys) == COLS * ROWS, len(keys)

im = Image.open(SRC).convert('RGBA')
W, H = im.size
px = im.load()
for y in range(H):  # 초록 배경 제거 + 외곽선의 초록 번짐 제거 (make_strip.py 와 같은 기준)
    for x in range(W):
        r, g, b, a = px[x, y]
        m = max(r, b)
        if g > 120 and g > m + 60: px[x, y] = (0, 0, 0, 0)
        elif g > m + 20: px[x, y] = (r, m, b, a)

# 이어진 덩어리마다 무게중심이 든 칸에 넣는다 — 몸이 칸 경계를 조금 넘거나 종이·물방울처럼 떨어진 조각이 있어도 제 칸으로 간다
seen = bytearray(W * H)
cells = [[] for _ in keys]
for sy in range(H):
    for sx in range(W):
        if seen[sy * W + sx] or not px[sx, sy][3]: continue
        seen[sy * W + sx] = 1
        stack, comp = [(sx, sy)], []
        while stack:
            x, y = stack.pop(); comp.append((x, y))
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if 0 <= nx < W and 0 <= ny < H and not seen[ny * W + nx] and px[nx, ny][3]:
                    seen[ny * W + nx] = 1; stack.append((nx, ny))
        if len(comp) < 12: continue  # 먼지
        cx, cy = sum(p[0] for p in comp) / len(comp), sum(p[1] for p in comp) / len(comp)
        cells[min(ROWS - 1, int(cy * ROWS / H)) * COLS + min(COLS - 1, int(cx * COLS / W))].append(comp)

os.makedirs(OUT, exist_ok=True)
total = 0
for key, comps in zip(keys, cells):
    pts = [p for c in comps for p in c]
    x0, y0 = min(p[0] for p in pts), min(p[1] for p in pts)
    x1, y1 = max(p[0] for p in pts) + 1, max(p[1] for p in pts) + 1
    cut = Image.new('RGBA', (x1 - x0, y1 - y0), (0, 0, 0, 0))
    cp = cut.load()
    for x, y in pts: cp[x - x0, y - y0] = px[x, y]
    cut.thumbnail((SIZE - PAD * 2, SIZE - PAD * 2), Image.LANCZOS)
    out = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    out.alpha_composite(cut, ((SIZE - cut.width) // 2, (SIZE - cut.height) // 2))
    path = os.path.join(OUT, key + '.png')
    out.save(path, optimize=True)
    total += os.path.getsize(path)
print(len(keys), 'files,', round(total / 1024), 'KB')
