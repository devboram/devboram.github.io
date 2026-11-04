# 소품 도감(assets/chars/sheets/items.jpg, 6열×4행, 흰 배경) → assets/chars/items/item_NN.png (투명, 긴 변 128px)
# 저장소 루트에서 실행: python3 -I tools/art/cut_items.py
import os
from PIL import Image, ImageDraw
SRC, OUT = 'assets/chars/sheets/items.jpg', 'assets/chars/items/'
os.makedirs(OUT, exist_ok=True)
im = Image.open(SRC).convert('RGBA')
W, H = im.size
cw, ch = W / 6, H / 4
for i in range(24):
    r, c = divmod(i, 6)
    cell = im.crop((int(c * cw), int(r * ch), int((c + 1) * cw), int((r + 1) * ch)))
    w, h = cell.size
    for x in range(0, w, 3):  # 테두리에서 흰색을 채워 지운다(외곽선 안쪽 흰색은 보존)
        for y in (0, h - 1):
            if sum(cell.getpixel((x, y))[:3]) > 690: ImageDraw.floodfill(cell, (x, y), (255, 0, 255, 0), thresh=40)
    for y in range(0, h, 3):
        for x in (0, w - 1):
            if sum(cell.getpixel((x, y))[:3]) > 690: ImageDraw.floodfill(cell, (x, y), (255, 0, 255, 0), thresh=40)
    px = cell.load()
    for y in range(h):
        for x in range(w):
            if px[x, y] == (255, 0, 255, 0): px[x, y] = (0, 0, 0, 0)
    out = cell.crop(cell.getbbox())
    out.thumbnail((128, 128), Image.LANCZOS)
    out.save(os.path.join(OUT, f'item_{i + 1:02d}.png'), optimize=True)
print('ok')
