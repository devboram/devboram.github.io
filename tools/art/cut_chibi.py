# ChatGPT 치비 시트(5열×3행, 흰 배경)를 칸별로 잘라 배경을 투명하게 만든다.
from PIL import Image, ImageDraw
A = 'assets/chars/'  # 저장소 루트에서 실행
im = Image.open(A + 'sheets/chibi.jpg').convert('RGBA')
W, H = im.size
keys = ['bunny', 'robot', 'cat', 'slime', 'villain']
rows = ['front', 'joy', 'doze']
cw, ch = W / 5, H / 3
for r, row in enumerate(rows):
    for c, key in enumerate(keys):
        cell = im.crop((int(c * cw), int(r * ch), int((c + 1) * cw), int((r + 1) * ch)))
        w, h = cell.size
        # 테두리 전체에서 흰색 영역을 채워 마젠타 표시 → 투명 처리 (외곽선 안쪽 흰색은 보존)
        for x in range(0, w, 3):
            for y in (0, h - 1):
                if sum(cell.getpixel((x, y))[:3]) > 690:
                    ImageDraw.floodfill(cell, (x, y), (255, 0, 255, 0), thresh=40)
        for y in range(0, h, 3):
            for x in (0, w - 1):
                if sum(cell.getpixel((x, y))[:3]) > 690:
                    ImageDraw.floodfill(cell, (x, y), (255, 0, 255, 0), thresh=40)
        px = cell.load()
        for y in range(h):
            for x in range(w):
                if px[x, y] == (255, 0, 255, 0):
                    px[x, y] = (0, 0, 0, 0)
        # 칸 좌우 끝에 닿은 조각 = 옆 칸 캐릭터의 일부 → 지운다
        seen = set()
        for sx in (0, 1, w - 2, w - 1):
            for sy in range(h):
                if px[sx, sy][3] == 0 or (sx, sy) in seen:
                    continue
                stack = [(sx, sy)]
                seen.add((sx, sy))
                comp = []
                while stack:
                    x, y = stack.pop()
                    comp.append((x, y))
                    for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                        if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in seen and px[nx, ny][3]:
                            seen.add((nx, ny))
                            stack.append((nx, ny))
                if len(comp) < 4000:  # 본체(수만 px)는 남기고 작은 조각만
                    for p in comp:
                        px[p] = (0, 0, 0, 0)
        bbox = cell.getbbox()
        out = cell.crop(bbox)
        out.save(A + f'chibi/{key}_{row}.png', optimize=True)
        print(key, row, out.size)
