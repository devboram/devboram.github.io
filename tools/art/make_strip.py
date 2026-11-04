# 초록 배경 4프레임 시트 → 투명 배경 가로 스트립(같은 칸 크기, 칸 안 위치 보존)
# 사용: python3 -I make_strip.py <입력.png> <출력.png> <프레임 수> <출력 칸 높이>
import sys
from PIL import Image

src, out, n, H = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
rows = int(sys.argv[5]) if len(sys.argv) > 5 else 1   # 격자 입력이면 행 수 (왼→오, 위→아래 순)
im = Image.open(src).convert('RGBA')
px = im.load()
W, Ht = im.size
for y in range(Ht):
    for x in range(W):
        r, g, b, a = px[x, y]
        m = max(r, b)
        if g > 120 and g > m + 60:          # 초록 배경
            px[x, y] = (0, 0, 0, 0)
        elif g > m + 20:                     # 외곽선 초록 번짐 제거
            px[x, y] = (r, m, b, a)

cols = n // rows
cw, chh = W // cols, Ht // rows
cells = [im.crop(((i % cols) * cw, (i // cols) * chh, (i % cols + 1) * cw, (i // cols + 1) * chh)) for i in range(n)]
# 칸마다 위치를 그대로 두고, 전 프레임 합집합 박스로 잘라 흔들림 없이 맞춘다
boxes = [c.getbbox() for c in cells]
x0 = min(b[0] for b in boxes); y0 = min(b[1] for b in boxes)
x1 = max(b[2] for b in boxes); y1 = max(b[3] for b in boxes)
fw, fh = x1 - x0, y1 - y0
scale = H / fh
tw = round(fw * scale)
strip = Image.new('RGBA', (tw * n, H), (0, 0, 0, 0))
for i, c in enumerate(cells):
    f = c.crop((x0, y0, x1, y1)).resize((tw, H), Image.LANCZOS)
    strip.alpha_composite(f, (i * tw, 0))
strip.save(out, optimize=True)
print('frame', tw, 'x', H, 'strip', strip.size)
