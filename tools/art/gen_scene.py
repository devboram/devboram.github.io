"""사이버펑크 밤 도시 장면(480x150) + 별/스모그 배경 타일 + 빗줄기 타일 PNG 생성. 작성 도구라 저장소에 넣지 않는다.
레이어(뒤→앞): 스모그 하늘 → 메가타워(프레임 위로 뚫고 감) → 하늘 차선 불빛 → 스모그 띠 → 먼 스카이라인
→ 가까운 스카이라인 → 세로 글리프 간판·BORAM 간판 → 토끼 홀로그램 → 전선 → 옥상(젖은 바닥 반사·경고 줄무늬).
캐릭터는 HTML 스프라이트로 옥상(y=118) 위에 올린다."""
import sys, os, random
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_sprites import ell, poly, union  # 광고판 인물 도형

def rgb(h): return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
def mix(a, b, t): return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))
def lum(c): return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]

class Canvas:
    def __init__(self, w, h, c): self.w, self.h = w, h; self.p = [[c] * w for _ in range(h)]
    def inb(self, x, y): return 0 <= x < self.w and 0 <= y < self.h
    def get(self, x, y): return self.p[y][x]
    def put(self, x, y, c):
        if self.inb(x, y): self.p[y][x] = c
    def rect(self, x0, y0, x1, y1, c):
        for y in range(max(0, y0), min(self.h, y1)):
            for x in range(max(0, x0), min(self.w, x1)): self.p[y][x] = c
    def blend(self, x, y, c, t):
        if self.inb(x, y): self.p[y][x] = mix(self.p[y][x], c, t)
    def save(self, path):
        img = Image.new('RGB', (self.w, self.h)); img.putdata([px for row in self.p for px in row])
        img.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(path, optimize=True)

FONT = {  # 5x7
    'B': ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
    'O': [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
    'R': ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
    'A': [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
    'M': ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
    'S': [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
    'N': ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
    'T': ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
    'E': ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
    ' ': [".....", ".....", ".....", ".....", ".....", ".....", "....."],
}
SOFT_PINK, SOFT_CYAN = rgb('#ff9ad5'), rgb('#4ef3ff')

def _idol_billboard_v1(c):
    """(이전 시안 — 사용 안 함) 미래도시 광고판: 오리지널 마법소녀 아이돌(라벤더 사이드 포니테일·금별 핀·프릴 칼라·하트 브로치·별 지팡이).
    특정 작품 캐릭터를 따라 그리지 않는다. 부위를 뒤→앞으로 겹치며 외곽선을 두르고 오른쪽·아래 가장자리에 그늘을 넣는다."""
    x0, y0, x1, y1 = 366, 12, 442, 92
    OUT = rgb('#2a1640')
    HAIR, HAIR_D, HAIR_L = rgb('#c79cff'), rgb('#8f5fd6'), rgb('#efdcff')
    SKIN, SKIN_D = rgb('#ffe3d3'), rgb('#f3b9a7')
    DRESS, DRESS_D = rgb('#fff4fb'), rgb('#ffc9e8')
    GOLD, GOLD_D, PINKc = rgb('#ffd76a'), rgb('#c99a2e'), rgb('#ff5fb7')
    c.rect(374, y1, 376, 118, rgb('#2a2058')); c.rect(432, y1, 434, 118, rgb('#2a2058'))      # 지지대
    for y in range(y0, y1):                                                                  # 화면: 라벤더 → 베이비 핑크
        col = mix(rgb('#3a2382'), SOFT_PINK, (y - y0) / (y1 - y0) * .8)
        for x in range(x0, x1): c.put(x, y, col)
    for y in range(y0 + 2, y1 - 12, 4):                                                       # 하프톤 점
        for x in range(x0 + ((y // 4) % 2) * 2, x1, 4): c.blend(x, y, rgb('#ffffff'), .14)
    for y in range(y0 + 4, y0 + 24):                                                           # 화면 속 초승달
        for x in range(x0 + 3, x0 + 23):
            if ell(x0 + 12, y0 + 13, 8, 8)(x + .5, y + .5) and not ell(x0 + 15, y0 + 11, 7, 7)(x + .5, y + .5):
                c.blend(x, y, GOLD, .7)
    box = [(x, y) for y in range(y0, y1) for x in range(x0, x1)]
    def part(test, col):
        pts = [(x, y) for x, y in box if test(x + .5, y + .5)]; s = set(pts)
        for x, y in pts:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                if (x + dx, y + dy) not in s and x0 <= x + dx < x1 and y0 <= y + dy < y1: c.put(x + dx, y + dy, OUT)
        for p in pts: c.put(*p, col)
        return s
    cx = 404
    part(union(ell(cx, 50, 20, 24), ell(cx + 22, 50, 6, 10), ell(cx + 24, 64, 5, 10), ell(cx + 23, 77, 4, 7)), HAIR)  # 뒷머리+사이드 포니테일
    part(ell(cx, 94, 25, 15), DRESS)                                                                                   # 어깨·드레스
    for fx in range(cx - 16, cx + 17, 5): part(ell(fx, 81, 2.6, 2.4), DRESS)                                           # 프릴 칼라
    part(rect_t(cx - 3, 64, cx + 4, 80), SKIN)                                                                         # 목
    part(union(ell(cx, 53, 12.5, 13.5), poly([(cx - 9.5, 58), (cx + 9.5, 58), (cx, 69.5)])), SKIN)                     # 얼굴
    bangs = [poly([(cx + k * 4 - 5, 36), (cx + k * 4 + 5, 36), (cx + k * 4 + (1 if k > 0 else -1), 49 + (k % 2) * 2)]) for k in range(-3, 4)]
    part(union(ell(cx, 39, 15.5, 8), *bangs), HAIR)                                                                    # 앞머리
    part(poly([(cx - 13, 40), (cx - 10, 42), (cx - 12, 70), (cx - 16, 72)]), HAIR)                                     # 옆머리
    part(poly([(cx + 13, 40), (cx + 10, 42), (cx + 12, 70), (cx + 16, 72)]), HAIR)
    part(union(ell(cx - 5, 83, 4.2, 2.6), ell(cx + 5, 83, 4.2, 2.6)), PINKc)                                           # 리본
    part(union(ell(cx - 1.6, 87.4, 2, 2), ell(cx + 1.6, 87.4, 2, 2), poly([(cx - 3.6, 88), (cx + 3.6, 88), (cx, 91.6)])), GOLD)  # 하트 브로치
    sp = [(cx + 11 + (3.6 if i % 2 == 0 else 1.5) * math_cos(i), 35 + (3.6 if i % 2 == 0 else 1.5) * math_sin(i)) for i in range(10)]
    part(poly(sp), GOLD)                                                                                               # 금별 머리핀
    part(poly([(377, 90), (379.5, 90), (387.5, 64), (385, 64)]), GOLD)                                                 # 지팡이 손잡이
    wp = [(386.5 + (5.2 if i % 2 == 0 else 2.2) * math_cos(i), 59.5 + (5.2 if i % 2 == 0 else 2.2) * math_sin(i)) for i in range(10)]
    part(poly(wp), GOLD)                                                                                               # 지팡이 별
    shade_map = {HAIR: (HAIR_L, HAIR_D), SKIN: (None, SKIN_D), DRESS: (None, DRESS_D), GOLD: (rgb('#fff3c4'), GOLD_D)}
    src = {p: c.get(*p) for p in box}
    for (x, y), col in src.items():
        if col not in shade_map: continue
        light, dark = shade_map[col]
        if src.get((x + 1, y)) == OUT or src.get((x, y + 1)) == OUT: c.put(x, y, dark)
        elif light and (src.get((x - 1, y)) == OUT or src.get((x, y - 1)) == OUT): c.put(x, y, light)
    for ex in (cx - 8, cx + 3):                                                                                        # 큰 눈
        c.rect(ex - 1, 49, ex + 7, 51, OUT)
        for yy, ic in ((51, '#5a2aa8'), (52, '#5a2aa8'), (53, '#8a3fd0'), (54, '#a64fd6'), (55, '#d45fd0'), (56, '#ff7ac8')):
            c.rect(ex, yy, ex + 6, yy + 1, rgb(ic))
        c.rect(ex - 1, 51, ex, 57, OUT); c.rect(ex + 6, 51, ex + 7, 57, OUT); c.rect(ex, 57, ex + 6, 58, OUT)
        c.rect(ex + 1, 52, ex + 3, 54, rgb('#ffffff')); c.put(ex + 4, 55, rgb('#ffffff'))
    c.put(cx - 10, 48, OUT); c.put(cx + 10, 48, OUT)                                                                   # 속눈썹 끝
    c.rect(cx - 8, 46, cx - 3, 47, HAIR_D); c.rect(cx + 4, 46, cx + 9, 47, HAIR_D)                                     # 눈썹
    c.rect(cx - 11, 59, cx - 7, 60, rgb('#ff9ab8')); c.rect(cx + 8, 59, cx + 12, 60, rgb('#ff9ab8'))                    # 볼
    c.put(cx, 60, SKIN_D)                                                                                              # 코
    c.rect(cx - 2, 63, cx + 3, 64, OUT); c.rect(cx - 1, 64, cx + 2, 66, rgb('#ff7a9c')); c.put(cx, 65, rgb('#ffb3c6'))  # 웃는 입
    for sx, sy, col in ((372, 42, '#ffffff'), (434, 26, '#ffd76a'), (380, 74, '#ffd76a'), (438, 60, '#ffffff'), (392, 30, '#ffb3e6')):
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)): c.put(sx + dx, sy + dy, rgb(col))
        c.put(sx, sy, rgb('#ffffff'))
    for y in range(y0, y1, 2):                                                                                         # 스캔라인
        for x in range(x0, x1): c.blend(x, y, rgb('#1a0f3c'), .06)
    c.rect(x0, y1 - 11, x1, y1, rgb('#1a0f3c'))                                                                        # 캡션 바
    cap = text_cells("STAR NOTE", x0 + 11, y1 - 9, scale=1, gap=1)
    neon(c, cap, rgb('#ffb3e6'), rgb('#ffffff'), glow=(0, .25))
    for x in range(x0 - 1, x1 + 1): c.put(x, y0 - 1, SOFT_CYAN); c.put(x, y1, SOFT_CYAN)                               # 홀로그램 프레임
    for y in range(y0 - 1, y1 + 1): c.put(x0 - 1, y, SOFT_CYAN); c.put(x1, y, SOFT_CYAN)
    for x in range(x0 - 4, x1 + 4):
        for y in (y0 - 3, y1 + 2):
            if (x + y) % 2 == 0: c.blend(x, y, SOFT_CYAN, .3)
    for (bx, by) in ((x0 - 1, y0 - 1), (x1 - 4, y0 - 1), (x0 - 1, y1 - 3), (x1 - 4, y1 - 3)):                          # 코너 브래킷
        c.rect(bx, by, bx + 5, by + 1, rgb('#ffffff')); c.rect(bx + (0 if bx < 400 else 4), by, bx + (1 if bx < 400 else 5), by + 4, rgb('#ffffff'))

import math
def math_cos(i): return math.cos(-math.pi / 2 + i * math.pi / 5)
def math_sin(i): return math.sin(-math.pi / 2 + i * math.pi / 5)
def rect_t(x0, y0, x1, y1): return lambda x, y: x0 <= x < x1 and y0 <= y < y1

def neon(c, cells, color, core, glow=(0.2, 0.42)):
    for d, t in ((2, glow[0]), (1, glow[1])):
        for x, y in cells:
            for dy in range(-d, d + 1):
                for dx in range(-d, d + 1):
                    if (x + dx, y + dy) not in cells: c.blend(x + dx, y + dy, color, t)
    for x, y in cells:
        c.put(x, y, core if ((x - 1, y) not in cells or (x, y - 1) not in cells) else color)

def text_cells(text, x0, y0, scale=2, gap=2):
    cells = set(); x = x0
    for ch in text:
        for gy, row in enumerate(FONT[ch]):
            for gx, v in enumerate(row):
                if v == '#':
                    for sy in range(scale):
                        for sx in range(scale): cells.add((x + gx * scale + sx, y0 + gy * scale + sy))
        x += 5 * scale + gap
    return cells

def glyph_sign(c, rnd, x, y, n, color, core):
    """세로 간판: 3x5 무작위 글리프 n개(읽히지 않는 외국 문자 느낌)."""
    c.rect(x - 2, y - 2, x + 5, y + n * 7, rgb('#07061a'))
    cells = set()
    for i in range(n):
        gy = y + i * 7
        pattern = [[rnd.random() < .55 for _ in range(3)] for _ in range(5)]
        pattern[0][rnd.randrange(3)] = True; pattern[4][rnd.randrange(3)] = True
        for yy in range(5):
            for xx in range(3):
                if pattern[yy][xx]: cells.add((x + xx, gy + yy))
    neon(c, cells, color, core, glow=(0.16, 0.34))

def scene(path):
    W, H = 480, 150
    rnd = random.Random(11)
    sky = [rgb(h) for h in ('#06041a', '#0d0828', '#1a0f3c', '#2f1356', '#52196e', '#7a2a86')]  # 아래로 갈수록 파스텔 핑크
    bands = [0, 24, 46, 66, 84, 100, H]
    c = Canvas(W, H, sky[0])
    for k in range(6):
        c.rect(0, bands[k], W, bands[k + 1], sky[k])
        if k < 5:
            y0 = bands[k + 1]
            for x in range(W):
                if (x + y0) % 4 == 0: c.put(x, y0 - 2, sky[k + 1])
                if (x + y0) % 2 == 0: c.put(x, y0 - 1, sky[k + 1])
                if (x + y0) % 4 == 2: c.put(x, y0, sky[k])
    for _ in range(110):  # 스모그 사이로 보이는 파스텔 별
        c.put(rnd.randrange(W), rnd.randrange(0, 48),
              rnd.choice([rgb('#6b5fc0'), rgb('#c4bcf2'), rgb('#ffd76a'), rgb('#ffb3e6'), rgb('#f6f3ff')]))

    # 금빛 초승달: 철탑 오른쪽 하늘. 가려진 면은 희미하게 비치고, 빛나는 쪽 둘레에 핑크 번짐 + 작은 반짝이
    mx, my, mr = 272, 27, 18
    disk, lit = set(), set()
    for y in range(my - mr - 1, my + mr + 2):
        for x in range(mx - mr - 1, mx + mr + 2):
            if ((x + .5 - mx) ** 2 + (y + .5 - my) ** 2) ** .5 > mr: continue
            disk.add((x, y))
            if ((x + .5 - (mx + 8)) ** 2 + (y + .5 - (my - 5)) ** 2) ** .5 > mr * .9: lit.add((x, y))
    for x, y in disk - lit: c.put(x, y, rgb('#1a1238'))
    for x, y in lit:
        inner = any((x + dx, y + dy) in disk - lit for dx, dy in ((1, 0), (0, -1), (1, -1)))
        edge = any((x + dx, y + dy) not in disk for dx, dy in ((-1, 0), (0, 1), (-1, 1)))
        c.put(x, y, rgb('#ffd76a') if inner else (rgb('#fff6d0') if not edge else rgb('#ffe9a0')))
    halo = {}
    for x, y in lit:
        for dy in range(-4, 5):
            for dx in range(-4, 5):
                n = (x + dx, y + dy)
                if n not in lit: halo[n] = min(halo.get(n, 9), max(abs(dx), abs(dy)))
    for (x, y), d in halo.items():
        if (x + y) % 2 == 0 or d == 1: c.blend(x, y, rgb('#ff9ad5'), {1: .26, 2: .17, 3: .1, 4: .06}[d])
    for ox, oy, col in ((-26, -10, '#ffd76a'), (-22, 16, '#ffb3e6'), (24, -14, '#ffd76a'), (26, 12, '#ffb3e6'), (-4, 24, '#f6f3ff')):
        x, y = mx + ox, my + oy
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)): c.put(x + dx, y + dy, rgb(col))
        c.put(x, y, rgb('#ffffff'))

    # ---------- 빌딩 도구 상자: 몸체·창 패턴·지붕 형태를 섞어 서로 다른 빌딩을 만든다 ----------
    PINK, CYAN, YEL, GRN, VIO = rgb('#ff2a6d'), rgb('#4ef3ff'), rgb('#fcee0a'), rgb('#6bff9a'), rgb('#a78bff')
    WARM = rgb('#ffcf6b')
    def body(x0, x1, top, col, lit=None, rimc=None):
        c.rect(x0, top, x1, H, col)
        if lit: c.rect(x0, top, x0 + 1, H, lit)          # 왼쪽: 시안 반사광
        if rimc: c.rect(x1 - 1, top, x1, H, rimc)        # 오른쪽: 핑크 림
    def win_grid(x0, x1, top, pal, dens, dx=3, dy=4, w=2, h=1):
        for y in range(top, H, dy):
            for x in range(x0, x1 - w + 1, dx):
                if rnd.random() < dens: c.rect(x, y, x + w, y + h, rnd.choice(pal))
    def win_floors(x0, x1, top, pal):                    # 층 전체가 켜진 사무실 + 듬성듬성
        for y in range(top, H, 4):
            r = rnd.random()
            if r < .22: c.rect(x0, y, x1, y + 2, rnd.choice(pal))
            elif r < .6:
                for x in range(x0, x1, 2):
                    if rnd.random() < .45: c.put(x, y, rnd.choice(pal))
    def spire(cx, top, col, h=10, light=PINK):
        for i in range(h):
            half = max(0, (h - i) // 4)
            c.rect(cx - half, top - i - 1, cx + half + 1, top - i, col)
        c.rect(cx, top - h - 6, cx + 1, top - h, col); c.put(cx, top - h - 7, light)
    def dome(x0, x1, top, col, hi, ratio=.7):
        rx = (x1 - x0) / 2; cx = x0 + rx; ry = max(3, rx * ratio)
        for x in range(x0, x1):
            d = (x + .5 - cx) / rx
            if abs(d) >= 1: continue
            hh = int(round(ry * (1 - d * d) ** .5))
            c.rect(x, top - hh, x + 1, top, col)
            if -.75 < d < -.25: c.put(x, top - hh, hi); c.put(x, top - hh + 1, hi)
        return int(top - ry)
    def stepped(x0, x1, top, col, lit, rimc, tiers=3, step=8, inset=4, trim=None):
        for i in range(tiers):
            a, b = x0 + i * inset, x1 - i * inset
            if b - a < 4: break
            body(a, b, top - i * step, col, lit, rimc)
            if trim: c.rect(a, top - i * step, b, top - i * step + 1, trim)
        return top - (tiers - 1) * step
    def slant(x0, x1, top, col, lit, trimc, rise=12, left_high=True):
        for x in range(x0, x1):
            t = (x - x0) / max(1, x1 - x0 - 1); ty = top + int((t if left_high else 1 - t) * rise)
            c.rect(x, ty, x + 1, H, col); c.put(x, ty, trimc)
            if x % 3 == 0: c.put(x, ty + 2, rgb('#2e2a6a')); c.put(x, ty + 3, rgb('#2e2a6a'))  # 태양광 패널
        c.rect(x0, top, x0 + 1, H, lit)
    def cylinder(x0, x1, top, ramp):                     # 왼쪽이 밝고 오른쪽이 어두운 원통 + 가로 띠창
        w = x1 - x0
        for x in range(x0, x1): c.rect(x, top, x + 1, H, ramp[[1, 0, 2, 3][min(3, int((x - x0) / w * 4))]])
        for x in range(x0 + 1, x1 - 1): c.put(x, top - 1, ramp[0])
        for y in range(top + 4, H, 5):
            col = YEL if rnd.random() < .35 else CYAN
            for x in range(x0 + 1, x1 - 1):
                if rnd.random() < .7: c.blend(x, y, col, .75 * (1 - abs((x - x0) / w - .35)))
    def glass(x0, x1, top, base=rgb('#0f2236'), mull=rgb('#1c3a52'), band=rgb('#2f6f8f')):
        c.rect(x0, top, x1, H, base)
        for x in range(x0 + 2, x1, 3): c.rect(x, top, x + 1, H, mull)
        for y in range(top + 3, H, 6):
            if rnd.random() < .8: c.rect(x0, y, x1, y + 1, band)
        for i in range(0, 46):                           # 유리에 비친 사선 반사
            for k in range(2):
                x, y = x0 + 2 + i // 3 + k, top + 2 + i
                if x < x1 - 1 and y < H: c.blend(x, y, rgb('#a6f6ff'), .22)
        c.rect(x0, top, x1, top + 1, CYAN)
    def apartment(x0, x1, top, col, slab):
        body(x0, x1, top, col, rgb('#2a2058'), None)
        for y in range(top + 3, H, 5):
            c.rect(x0, y + 3, x1, y + 4, slab)            # 발코니 슬래브
            for x in range(x0 + 2, x1 - 2, 4):
                r = rnd.random()
                if r < .42: c.rect(x, y, x + 2, y + 2, WARM if rnd.random() < .7 else PINK)
                elif r < .55: c.rect(x, y + 1, x + 2, y + 3, rgb('#3d3488'))   # 실외기
                elif r < .6: c.put(x, y + 2, rnd.choice([PINK, CYAN, GRN]))  # 빨래
    def pagoda(x0, x1, top, col, roofc, tiers=3, tier_h=8):
        for i in range(tiers):                           # 위층일수록 좁아지는 처마
            a, b = x0 + (tiers - 1 - i) * 3, x1 - (tiers - 1 - i) * 3
            yt = top + i * tier_h
            c.rect(a, yt + 2, b, yt + tier_h, col)
            c.rect(a - 3, yt, b + 3, yt + 2, roofc); c.put(a - 4, yt - 1, roofc); c.put(b + 3, yt - 1, roofc)
            for lx in range(a, b, 5): c.put(lx, yt + 3, rgb('#ff3b3b')); c.blend(lx, yt + 4, rgb('#ff3b3b'), .35)  # 등불
        c.rect(x0, top + tiers * tier_h, x1, H, col)
        win_grid(x0 + 2, x1 - 2, top + tiers * tier_h + 3, [WARM, PINK], .4)
        spire((x0 + x1) // 2, top, roofc, h=4, light=YEL)
    def led_screen(x0, y0, w, h, kind):
        c.rect(x0 - 1, y0 - 1, x0 + w + 1, y0 + h + 1, rgb('#07061a'))
        for y in range(y0, y0 + h):
            for x in range(x0, x0 + w):
                if kind == 'wave':
                    t = (x - x0) / w; s = (y - y0 + int(2 * ((x // 3) % 3))) / h
                    col = mix(mix(PINK, VIO, t), CYAN, s * .8)
                else:                                     # 세로 색 막대 광고
                    col = [PINK, YEL, CYAN, GRN, VIO][((x - x0) // 3) % 5]
                    col = mix(col, rgb('#07061a'), .25 if (y - y0) % 3 == 0 else 0)
                c.put(x, y, col)
        for x in range(x0 - 2, x0 + w + 2):
            for y in (y0 - 2, y0 + h + 1): c.blend(x, y, CYAN if kind == 'wave' else PINK, .3)
    def roof_props(x0, x1, top):
        for ax in range(x0 + 2, x1 - 4, 7):
            r = rnd.random()
            if r < .35: c.rect(ax, top - 3, ax + 4, top, rgb('#2a2058')); c.put(ax + 1, top - 2, rgb('#07061a'))  # 실외기
            elif r < .5: c.rect(ax + 1, top - 7, ax + 2, top, rgb('#3d3488')); c.put(ax + 1, top - 8, PINK)       # 안테나
    def helipad(x0, x1, top, col):
        body(x0, x1, top, col, rgb('#2a2058'), PINK)
        win_floors(x0 + 2, x1 - 2, top + 5, [CYAN, rgb('#ffe9a8'), YEL])
        cx = (x0 + x1) // 2
        c.rect(x0 + 2, top - 1, x1 - 2, top, rgb('#3d3488'))
        for dy in range(5):                              # H 표시
            c.put(cx - 2, top - 2 - dy, rgb('#f6f3ff')); c.put(cx + 2, top - 2 - dy, rgb('#f6f3ff'))
        for dx in range(-1, 2): c.put(cx + dx, top - 4, rgb('#f6f3ff'))
        for px in (x0 + 2, x1 - 3): c.put(px, top - 2, YEL)
    def neon_bar(x, y, w, col):
        neon(c, {(x + i, y) for i in range(w)} | {(x + i, y + 1) for i in range(w)}, col, mix(col, rgb('#ffffff'), .6), glow=(.12, .3))

    # ---------- 1) 뒤쪽 메가구조물: 실루엣이 서로 다르게 (스모그 색, 창은 흐리게) ----------
    haze, haze_hi, haze_win = rgb('#1c1640'), rgb('#2a2058'), rgb('#3d3488')
    t = stepped(14, 52, 34, haze, haze_hi, None, tiers=3, step=12, inset=6); spire(33, t, haze, h=12)      # 계단식 + 첨탑
    win_grid(16, 50, 38, [haze_win], .2, dy=5)
    cylinder(110, 140, 26, [rgb('#30286a'), rgb('#251e56'), rgb('#1c1640'), rgb('#151034')])                # 원통 타워
    dtop = dome(110, 140, 26, rgb('#251e56'), rgb('#3d3488'), ratio=.5)
    for x in range(104, 147):                                                                               # 안테나 링
        if (x + 1) % 2 == 0: c.blend(x, dtop + 2, CYAN, .5)
    c.rect(125, dtop - 10, 126, dtop, haze); c.put(125, dtop - 11, CYAN)
    body(170, 192, 12, haze, haze_hi); body(202, 224, 22, haze, haze_hi)                                    # 쌍둥이 + 스카이브리지
    for by in (38, 60): c.rect(192, by, 202, by + 3, rgb('#2e2470')); c.rect(192, by + 1, 202, by + 2, rgb('#4c3a8c'))
    win_grid(172, 190, 16, [haze_win, rgb('#4c3a8c')], .25, dy=5); win_grid(204, 222, 26, [haze_win], .25, dy=5)
    for x in range(170, 192, 4): c.blend(x, 12, VIO, .6)
    slant(296, 330, 10, haze, haze_hi, VIO, rise=16)                                                        # 사선 지붕 타워
    for y in range(26, H, 3): c.blend(312, y, PINK, .25)
    body(388, 444, 30, haze, haze_hi); dome(388, 444, 30, rgb('#221a4c'), rgb('#3d3488'), ratio=.45)        # 돔 아콜로지
    win_grid(390, 442, 34, [haze_win], .2, dy=5)
    pagoda(450, 476, 22, haze, rgb('#2e1a4a'), tiers=3, tier_h=10)                                         # 파고다 타워

    # 격자 철탑: 아래로 벌어지는 다리 + X 자 버팀 + 관측대 두 단 + 안테나 경고등
    def lattice(tcx, ttop, tbase, TP, TPL, spread=15, decks=((46, 7), (70, 9)), mast=10):
        def half(y): return 1 + spread * ((y - ttop) / (tbase - ttop)) ** 1.8
        for y in range(ttop, tbase):
            w = half(y)
            for x in range(int(tcx - w) + 1, int(tcx + w)): c.blend(x, y, rgb('#0d0828'), .35)  # 속이 비치는 격자
            c.put(int(tcx - w), y, TP); c.put(int(tcx + w), y, TP)
        for y0 in range(ttop + 6, tbase - 6, 7):
            y1 = y0 + 7
            for i in range(8):
                t = i / 7; y = int(y0 + (y1 - y0) * t)
                c.blend(int(tcx - half(y0) + (2 * half(y1)) * t), y, TPL, .55)
                c.blend(int(tcx + half(y0) - (2 * half(y1)) * t), y, TPL, .55)
            c.rect(int(tcx - half(y1)), y1, int(tcx + half(y1)) + 1, y1 + 1, TP)
        for dy, dw in decks:
            c.rect(tcx - dw, dy, tcx + dw + 1, dy + 4, rgb('#2a1550')); c.rect(tcx - dw, dy, tcx + dw + 1, dy + 1, TPL)
            for x in range(tcx - dw + 1, tcx + dw, 2): c.put(x, dy + 2, rgb('#ffd76a'))
        c.rect(tcx, ttop - mast, tcx + 1, ttop, TPL); c.put(tcx, ttop - mast, rgb('#ff3b3b')); c.put(tcx, ttop - mast // 2, rgb('#ff3b3b'))
    lattice(232, 10, 118, rgb('#ff5fb7'), rgb('#ffb3e6'))                                         # 초승달 왼쪽: 핑크 철탑
    lattice(408, 34, 118, rgb('#a78bff'), rgb('#d9c8ff'), spread=11, decks=((60, 5), (80, 7)), mast=8)  # 오른쪽 멀리: 베이비 블루 철탑
    # 송신탑(오른쪽): 가는 기둥 + 둥근 전망대 + 창 띠 + 안테나
    ncx = 354
    c.rect(ncx - 2, 40, ncx + 2, H, rgb('#2a2058')); c.rect(ncx - 2, 40, ncx - 1, H, rgb('#3d3488'))
    for y in range(30, 42):
        hw = int(8 * (1 - ((y - 35.5) / 6.5) ** 2) ** .5) if abs(y - 35.5) < 6.5 else 0
        c.rect(ncx - hw, y, ncx + hw + 1, y + 1, rgb('#221a4c'))
    for x in range(ncx - 7, ncx + 8): c.put(x, 35, rgb('#4ef3ff') if x % 2 else rgb('#ffd76a'))
    for x in range(ncx - 9, ncx + 10):
        if x % 2 == 0: c.blend(x, 42, rgb('#4ef3ff'), .5)
    c.rect(ncx, 8, ncx + 1, 30, rgb('#c4bcf2')); c.put(ncx, 7, rgb('#ff3b3b')); c.put(ncx, 18, rgb('#f6f3ff'))

    # 원통 타워를 감싸는 홀로그램 링(앞쪽 반원만)
    for ry_c in (52, 72, 92):
        for x in range(104, 147):
            d = (x + .5 - 125) / 21
            if abs(d) < 1: c.blend(x, ry_c + int(round(2.6 * (1 - d * d) ** .5)), CYAN, .5)
    # 하늘 차선: 길게 끌리는 차량 빛줄기(꼬리는 흐리고 머리는 밝게) — 달 앞은 비워 둔다
    for lane_y, col in ((30, rgb('#f6f3ff')), (34, PINK), (50, YEL), (54, PINK)):
        x = rnd.randrange(20)
        while x < W:
            L = rnd.randint(6, 18)
            if not (244 <= x <= 300 and lane_y < 50):
                for i in range(L): c.blend(x + i, lane_y, col, .12 + .7 * i / L)
                c.put(x + L, lane_y, rgb('#ffffff'))
            x += L + rnd.randint(14, 40)

    # 스모그 띠(디더) — 뒤쪽을 가라앉혀 깊이를 만든다
    for y in range(66, 100):
        for x in range(W):
            if (x + y) % 2 == 0: c.blend(x, y, rgb('#6a2478'), .1 + (y - 66) / 34 * .14)

    # ---------- 2) 먼 스카이라인: 지붕 형태를 무작위로 섞은 흐린 실루엣 ----------
    far, farhi, farwin = rgb('#25184e'), rgb('#33256a'), rgb('#4c3a8c')
    x = 0
    while x < W:
        bw, top = rnd.randint(10, 24), rnd.randint(54, 90)
        kind = rnd.choice(['flat', 'flat', 'spire', 'dome', 'slant', 'step'])
        if 236 <= x <= 284: top = max(top, 60)
        if kind == 'step': stepped(x, x + bw, top, far, farhi, None, tiers=2, step=6, inset=3)
        elif kind == 'slant': slant(x, x + bw, top, far, farhi, farhi, rise=8, left_high=rnd.random() < .5)
        else:
            body(x, x + bw, top, far, farhi)
            if kind == 'spire': spire(x + bw // 2, top, far, h=7, light=PINK)
            if kind == 'dome': dome(x, x + bw, top, far, farhi, ratio=.5)
        win_grid(x + 2, x + bw - 2, top + 3, [farwin], .3, dx=3, dy=4, w=1)
        x += bw + rnd.randint(0, 2)

    # ---------- 3) 가까운 스카이라인: 빌딩 종류를 하나씩 배치해 단조롭지 않게 ----------
    mid, mid2, mid3, midhi = rgb('#120c30'), rgb('#18103a'), rgb('#0f1430'), rgb('#261d58')
    wins = [YEL, CYAN, PINK, rgb('#ffe9a8'), GRN]
    apartment(-4, 18, 92, mid2, rgb('#2a2058'))
    glass(18, 48, 78)
    # 50..134: BORAM 간판 건물(계단식) — 간판은 아래에서 올린다
    t = stepped(50, 134, 84, mid, midhi, PINK, tiers=2, step=12, inset=8, trim=PINK)
    win_floors(54, 130, 88, wins); win_grid(60, 124, t + 4, wins, .35)
    cylinder(136, 156, 86, [rgb('#3a2f78'), rgb('#2a2260'), rgb('#1a1442'), rgb('#120c30')])
    pagoda(160, 184, 88, mid2, rgb('#5a1838'), tiers=2, tier_h=7)
    slant(186, 210, 84, mid, midhi, CYAN, rise=10, left_high=False); win_grid(190, 208, 98, wins, .35)
    body(212, 246, 100, mid3, midhi, PINK); led_screen(215, 102, 28, 12, 'wave'); roof_props(212, 246, 100)
    t = stepped(248, 270, 82, mid, midhi, CYAN, tiers=2, step=10, inset=4, trim=CYAN); win_grid(250, 268, 86, wins, .3)
    apartment(272, 302, 92, mid2, rgb('#2a2058')); roof_props(272, 302, 92)
    glass(304, 324, 74)
    helipad(326, 366, 88, mid)
    cylinder(368, 386, 96, [rgb('#3a2f78'), rgb('#2a2260'), rgb('#1a1442'), rgb('#120c30')])
    body(388, 418, 82, mid, midhi, PINK); dome(388, 418, 82, rgb('#1d1548'), rgb('#3d3488'), ratio=.4)
    win_grid(391, 416, 86, wins, .3, dy=4)
    body(420, 456, 92, mid3, midhi, None); led_screen(423, 95, 30, 14, 'bars'); roof_props(420, 456, 92)
    slant(458, 484, 76, mid, midhi, PINK, rise=12); win_floors(462, 482, 90, wins)
    for nx, ny, nw, col in ((20, 90, 10, PINK), (188, 104, 8, YEL), (274, 100, 12, CYAN), (330, 100, 10, GRN), (392, 98, 8, PINK)):
        neon_bar(nx, ny, nw, col)

    # 세로 글리프 간판: 빌딩 옆면에 매단다
    for gx, gy, n, col, core in ((12, 56, 6, PINK, rgb('#ffc4d8')), (134, 66, 6, CYAN, rgb('#d6fdff')),
                                 (184, 60, 7, YEL, rgb('#fffbc4')), (470, 54, 6, CYAN, rgb('#d6fdff'))):
        glyph_sign(c, rnd, gx, gy, n, col, core)
    # 네온 초승달 간판(유리 빌딩 옆) · 네온 하트 간판(원통 빌딩 옆)
    cr_cells = {(x, y) for y in range(54, 72) for x in range(298, 316)
                if ((x + .5 - 306) ** 2 + (y + .5 - 63) ** 2) ** .5 <= 7 and ((x + .5 - 309) ** 2 + (y + .5 - 61) ** 2) ** .5 > 6}
    c.rect(296, 53, 316, 73, rgb('#07061a')); neon(c, cr_cells, rgb('#ffd76a'), rgb('#fff6d0'))
    heart_rows = [".##.##.", "#######", "#######", ".#####.", "..###..", "...#..."]
    hcells = {(362 + x * 2 + sx, 72 + y * 2 + sy) for y, row in enumerate(heart_rows) for x, v in enumerate(row) if v == '#'
              for sx in range(2) for sy in range(2)}
    c.rect(360, 70, 378, 86, rgb('#07061a')); neon(c, hcells, PINK, rgb('#ffd1e0'))

    # BORAM 간판(계단식 빌딩 꼭대기에 다리로 받친다)
    c.rect(54, 40, 134, 66, rgb('#07061a')); c.rect(54, 40, 134, 41, PINK); c.rect(54, 65, 134, 66, PINK)
    c.rect(70, 66, 72, 72, rgb('#261d58')); c.rect(116, 66, 118, 72, rgb('#261d58'))
    cells = text_cells("BORAM", 65, 46)
    neon(c, {(x - 1, y) for x, y in cells}, rgb('#4ef3ff'), rgb('#4ef3ff'), glow=(0, .25))  # 글리치: 시안 잔상
    neon(c, cells, rgb('#ff2a6d'), rgb('#ffd1e0'))


    (BILLBOARD or neon_billboard)(c)

    # 늘어진 전선
    for (ax, ay, bx, by) in ((0, 40, 120, 52), (120, 52, 220, 38), (300, 36, 362, 40), (176, 60, 300, 66)):
        for x in range(ax, bx + 1):
            t = (x - ax) / (bx - ax); y = int(round(ay + (by - ay) * t + 10 * t * (1 - t)))
            c.put(x, y, rgb('#07061a'))

    # 옥상: 난간 + 네온 튜브, 젖은 바닥(위쪽 밝은 빛 반사), 경고 줄무늬, 앞벽
    rail = rgb('#2a2058')
    c.rect(0, 108, W, 109, rail)
    for px in range(4, W, 16): c.rect(px, 108, px + 1, 118, rail)
    for x in range(W): c.put(x, 107, rgb('#ff2a6d') if (x // 40) % 2 == 0 else rgb('#4ef3ff'))
    floor = rgb('#120e2a')
    c.rect(0, 118, W, 134, floor); c.rect(0, 118, W, 119, rgb('#3d3488'))
    for y in range(119, 134):
        dy = y - 118
        for x in range(W):
            sx = x + (1 if (y + x // 7) % 3 == 0 else 0)
            sy = 118 - dy * 2
            if 0 <= sx < W and sy >= 0:
                src = c.get(sx, sy)
                if lum(src) > 90: c.blend(x, y, src, max(.05, .34 - dy * .018) if (x + y) % 2 == 0 else .06)
    # 빛나는 옥상 엣지(미래도시: 경고 줄무늬 대신 매끈한 발광선 + 점등 패널)
    c.rect(0, 134, W, 135, SOFT_CYAN); c.rect(0, 135, W, 136, rgb('#2a6f9a')); c.rect(0, 136, W, 138, rgb('#0d0a22'))
    for x in range(6, W, 12): c.put(x, 137, PINK)
    c.rect(0, 138, W, H, rgb('#0d0a22'))
    for y in range(141, H, 4): c.rect(0, y, W, y + 1, rgb('#161034'))
    for x in range(0, W, 24): c.rect(x, 138, x + 1, H, rgb('#161034'))
    # 소품: 신호등 기둥(링 조명), 실외기·증기, 위성 접시, 안테나
    c.rect(30, 80, 32, 118, rgb('#3d3488'))
    for ry_ in (84, 92, 100): c.rect(27, ry_, 35, ry_ + 1, CYAN if ry_ != 92 else PINK)
    c.put(30, 79, rgb('#ffffff')); c.put(31, 79, rgb('#ffffff'))
    c.rect(420, 102, 454, 118, rgb('#221a4c')); c.rect(420, 102, 454, 103, rgb('#3d3488'))
    for y in range(105, 116, 2): c.rect(424, y, 440, y + 1, rgb('#0d0a22'))
    for i, (sx, sy) in enumerate(((446, 98), (448, 94), (445, 90), (449, 86), (446, 82))):  # 증기
        for dx in range(-2 + i // 2, 3 - i // 2 + i):
            if (dx + sy) % 2 == 0: c.blend(sx + dx, sy, rgb('#c4bcf2'), .28 - i * .04)
    for y in range(92, 102):  # 위성 접시
        half = int((10 - (y - 92)) * .9)
        c.rect(470 - half, y, 470 + half // 2, y + 1, rgb('#3d3488'))
    c.rect(470, 102, 471, 118, rgb('#3d3488'))
    c.rect(466, 54, 467, 92, rgb('#3d3488')); c.put(466, 53, rgb('#ff2a6d'))
    c.save(path)

def bg_tile(path):
    """페이지 배경 48x48: 아주 어두운 남색 + 희미한 별 + 2px 간격 스캔라인."""
    rnd = random.Random(3)
    c = Canvas(48, 48, rgb('#0b0a1f'))
    for y in range(0, 48, 2):
        for x in range(48): c.put(x, y, rgb('#0e0c26'))
    for _ in range(6):
        c.put(rnd.randrange(48), rnd.randrange(48), rnd.choice([rgb('#4a3f99'), rgb('#6b5fc0'), rgb('#2e7a8c')]))
    c.save(path)

def stardust_tile(path):
    """떨어지는 별가루 32x48 (투명 바탕) — 금·핑크·흰 점과 작은 십자 반짝이."""
    rnd = random.Random(5)
    img = Image.new('RGBA', (32, 48), (0, 0, 0, 0))
    cols = [(255, 215, 106), (255, 179, 230), (246, 243, 255)]
    for i in range(7):
        x, y = rnd.randrange(1, 31), rnd.randrange(1, 47); col = cols[i % 3]
        img.putpixel((x, y), col + (230,))
        if i % 3 == 0:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)): img.putpixel((x + dx, y + dy), col + (130,))
    img.save(path, optimize=True)

def heartline_tile(path):
    """푸터 위 장식 줄 16x8: 핑크 하트 + 금 반짝이 (투명 바탕)."""
    img = Image.new('RGBA', (16, 8), (0, 0, 0, 0))
    heart = [".##.##.", "#######", "#######", ".#####.", "..###..", "...#..."]
    for y, row in enumerate(heart):
        for x, v in enumerate(row):
            if v == '#': img.putpixel((1 + x, 1 + y), (255, 95, 183, 255))
    img.putpixel((2, 2), (255, 220, 240, 255))
    for x, y in ((12, 3), (11, 3), (13, 3), (12, 2), (12, 4)): img.putpixel((x, y), (255, 215, 106, 255))
    img.save(path, optimize=True)

def idol_billboard(c):
    """미래도시 광고판: 오리지널 마법소녀 아이돌 — 딸기핑크 긴 트윈테일·금별 머리장식·작은 천사 날개·
    흰·라벤더 드레스·프릴 칼라·하트 브로치·별 지팡이. 90년대 순정 마법소녀 감성. 특정 작품 캐릭터를 따라 그리지 않는다.
    외곽선은 부위마다 그 색의 어두운 톤(검정 대신)으로, 눈은 테두리 박스 없이 속눈썹·홍채 그라데이션·하이라이트로."""
    x0, y0, x1, y1 = 366, 12, 442, 92
    HAIR, HAIR_D, HAIR_L, HAIR_O = rgb('#ff8fc8'), rgb('#e0569c'), rgb('#ffd1ea'), rgb('#8a2a5e')
    SKIN, SKIN_D, SKIN_O = rgb('#ffe6d8'), rgb('#f7c4b2'), rgb('#c98274')
    DRESS, DRESS_D, DRESS_O = rgb('#fff6fb'), rgb('#e6c8f0'), rgb('#8a5fb0')
    WHITE, WHITE_D, WHITE_O = rgb('#ffffff'), rgb('#e4ecfa'), rgb('#8a9cc8')
    GOLD, GOLD_D, GOLD_O = rgb('#ffd76a'), rgb('#e0a93a'), rgb('#9a6a1a')
    PK, PK_O = rgb('#ff6fae'), rgb('#a3245f')
    c.rect(374, y1, 376, 118, rgb('#2a2058')); c.rect(432, y1, 434, 118, rgb('#2a2058'))      # 지지대
    for y in range(y0, y1):                                                                  # 화면: 깊은 보라 → 마젠타
        col = mix(rgb('#2a1460'), rgb('#c23c8c'), (y - y0) / (y1 - y0) * .9)
        for x in range(x0, x1): c.put(x, y, col)
    for y in range(y0 + 2, y1 - 12, 4):
        for x in range(x0 + ((y // 4) % 2) * 2, x1, 4): c.blend(x, y, rgb('#ffffff'), .12)
    for y in range(y0 + 3, y0 + 23):                                                          # 배경 초승달
        for x in range(x0 + 2, x0 + 22):
            if ell(x0 + 11, y0 + 12, 8, 8)(x + .5, y + .5) and not ell(x0 + 14, y0 + 10, 7, 7)(x + .5, y + .5):
                c.blend(x, y, GOLD, .75)
    box = [(x, y) for y in range(y0, y1 - 11) for x in range(x0, x1)]; bset = set(box)
    def part(test, col, out):
        pts = [(x, y) for x, y in box if test(x + .5, y + .5)]; s = set(pts)
        for x, y in pts:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                n = (x + dx, y + dy)
                if n not in s and n in bset: c.put(*n, out)
        for p in pts: c.put(*p, col)
    cx = 404
    for sgn in (-1, 1):                                                                       # 천사 날개
        part(union(ell(cx + sgn * 20, 64, 8, 4.6), ell(cx + sgn * 25, 58, 6, 3.8), ell(cx + sgn * 27, 52, 4, 3)), WHITE, WHITE_O)
    for sgn in (-1, 1):                                                                       # 트윈테일
        part(union(ell(cx + sgn * 19, 40, 5, 8), ell(cx + sgn * 22, 54, 5.2, 9), ell(cx + sgn * 22, 68, 4.4, 8)), HAIR, HAIR_O)
    part(ell(cx, 42, 17.5, 18), HAIR, HAIR_O)                                                 # 뒷머리
    part(ell(cx, 80, 20, 11), DRESS, DRESS_O)                                                 # 드레스
    part(rect_t(cx - 3, 56, cx + 3, 70), SKIN, SKIN_O)                                        # 목
    for fx in range(cx - 13, cx + 14, 4): part(ell(fx + .5, 70.5, 2.3, 2.1), WHITE, WHITE_O)  # 프릴 칼라
    part(union(ell(cx, 45, 11.5, 11.5), poly([(cx - 9, 48), (cx + 9, 48), (cx, 59)])), SKIN, SKIN_O)  # 얼굴
    strands = [poly([(cx + k - 5, 30), (cx + k + 5, 30), (cx + k + (1 if k > 0 else (-1 if k < 0 else 0)), ay)])
               for k, ay in ((-10, 41), (-5, 44), (0, 40), (5, 44), (10, 41))]
    part(union(ell(cx, 31, 14.5, 7), *strands), HAIR, HAIR_O)                                 # 앞머리
    part(poly([(cx - 12, 33), (cx - 9, 35), (cx - 10, 56), (cx - 13, 58)]), HAIR, HAIR_O)     # 옆머리
    part(poly([(cx + 12, 33), (cx + 9, 35), (cx + 10, 56), (cx + 13, 58)]), HAIR, HAIR_O)
    for sgn in (-1, 1):                                                                       # 금별 머리장식
        pts = [(cx + sgn * 16 + (3.4 if i % 2 == 0 else 1.4) * math_cos(i), 31 + (3.4 if i % 2 == 0 else 1.4) * math_sin(i)) for i in range(10)]
        part(poly(pts), GOLD, GOLD_O)
    part(union(ell(cx - 4.5, 73, 3.6, 2.2), ell(cx + 4.5, 73, 3.6, 2.2)), PK, PK_O)           # 리본
    part(union(ell(cx - 1.5, 75.2, 1.8, 1.8), ell(cx + 1.5, 75.2, 1.8, 1.8), poly([(cx - 3.3, 75.8), (cx + 3.3, 75.8), (cx, 78.9)])), GOLD, GOLD_O)  # 하트 브로치
    part(poly([(378, 81), (380.5, 81), (387, 58), (384.5, 58)]), GOLD, GOLD_O)                # 지팡이
    wp = [(386 + (5 if i % 2 == 0 else 2.1) * math_cos(i), 54 + (5 if i % 2 == 0 else 2.1) * math_sin(i)) for i in range(10)]
    part(poly(wp), GOLD, GOLD_O)
    shade_map = {HAIR: (HAIR_L, HAIR_D), SKIN: (None, SKIN_D), DRESS: (None, DRESS_D), WHITE: (None, WHITE_D), GOLD: (rgb('#fff3c4'), GOLD_D)}
    outs = {HAIR_O, SKIN_O, DRESS_O, WHITE_O, GOLD_O, PK_O}
    src = {p: c.get(*p) for p in box}
    for (x, y), col in src.items():
        if col not in shade_map: continue
        light, dark = shade_map[col]
        if src.get((x + 1, y)) in outs or src.get((x, y + 1)) in outs: c.put(x, y, dark)
        elif light and (src.get((x - 1, y)) in outs or src.get((x, y - 1)) in outs): c.put(x, y, light)
    for x in range(cx - 10, cx - 2): c.put(x, 28 + (1 if x < cx - 7 else 0), HAIR_L)        # 머리 광택(천사링)
    c.put(cx, 47, rgb('#ff9cc0'))
    for i, (x, y) in enumerate(((cx - 2, 74), (cx - 1, 74))): c.put(x, y, rgb('#fff3c4'))     # 브로치 반짝
    LASH = rgb('#3a1a4a')
    for sgn in (-1, 1):                                                                       # 트윈테일 머리결
        for y in range(46, 76):
            for x in (cx + sgn * 21, cx + sgn * 23):
                if y % 4 != (0 if x % 2 else 2) and c.get(x, y) in (HAIR, HAIR_L): c.put(x, y, HAIR_D)
    for x, y in ((cx - 6, 33), (cx - 6, 34), (cx + 2, 33), (cx + 2, 34), (cx + 7, 32)): c.put(x, y, HAIR_D)  # 앞머리 결
    iris = ['#3f2fb8', '#4b3fc4', '#5b4fd6', '#7568ec', '#958af6', '#b8b0ff', '#d6d1ff']
    for ex, outer in ((cx - 10, -1), (cx + 3, 1)):                                            # 큰 눈(7x8)
        c.rect(ex - 1, 41, ex + 8, 43, LASH)
        c.put(ex - 2 if outer < 0 else ex + 8, 40, LASH); c.put(ex - 3 if outer < 0 else ex + 9, 39, LASH)
        for i, col in enumerate(iris):
            a, b = (ex + 1, ex + 6) if i in (0, 6) else (ex, ex + 7)
            c.rect(a, 43 + i, b, 44 + i, rgb(col))
        c.rect(ex + 2, 44, ex + 5, 47, rgb('#24124e'))
        c.rect(ex + 1, 43, ex + 3, 46, WHITE); c.put(ex + 5, 48, WHITE); c.put(ex + 4, 48, rgb('#efeaff'))
        c.rect(ex + 1, 50, ex + 6, 51, SKIN_O)
    for x in range(cx - 10, cx - 4): c.put(x, 37, HAIR_D)                                     # 눈썹
    for x in range(cx + 4, cx + 10): c.put(x, 37, HAIR_D)
    for x in (cx - 11, cx - 9, cx + 8, cx + 10): c.put(x, 52, rgb('#ff9cc0')); c.put(x + 1, 53, rgb('#ffb3cf'))  # 볼
    c.put(cx, 47, SKIN); c.put(cx, 52, SKIN_D)                                                # 코
    for x, y in ((cx - 2, 55), (cx - 1, 56), (cx, 56), (cx + 1, 55)): c.put(x, y, rgb('#e0607e'))  # 미소
    for sx, sy, col in ((372, 40, '#ffffff'), (436, 24, '#ffd76a'), (433, 46, '#ffffff'), (372, 62, '#ffd76a'), (394, 20, '#ffb3e6')):
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)): c.put(sx + dx, sy + dy, rgb(col))
        c.put(sx, sy, rgb('#ffffff'))
    for y in range(y0, y1, 2):                                                                # 스캔라인
        for x in range(x0, x1): c.blend(x, y, rgb('#1a0f3c'), .05)
    c.rect(x0, y1 - 11, x1, y1, rgb('#1a0f3c'))                                               # 캡션 바
    neon(c, text_cells("STAR NOTE", x0 + 11, y1 - 9, scale=1, gap=1), rgb('#ffb3e6'), rgb('#ffffff'), glow=(0, .25))
    for x in range(x0 - 1, x1 + 1): c.put(x, y0 - 1, SOFT_CYAN); c.put(x, y1, SOFT_CYAN)      # 프레임
    for y in range(y0 - 1, y1 + 1): c.put(x0 - 1, y, SOFT_CYAN); c.put(x1, y, SOFT_CYAN)
    for x in range(x0 - 4, x1 + 4):
        for y in (y0 - 3, y1 + 2):
            if (x + y) % 2 == 0: c.blend(x, y, SOFT_CYAN, .3)

def silhouette_billboard(c):
    """분위기용 전광판: 초승달을 등진 마법소녀 역광 실루엣(얼굴·머리 모양 등 특정 캐릭터를 알아볼 특징 없음), 윤곽만 핑크 네온."""
    x0, y0, x1, y1 = 366, 12, 442, 92
    c.rect(374, y1, 376, 118, rgb('#2a2058')); c.rect(432, y1, 434, 118, rgb('#2a2058'))
    for y in range(y0, y1):
        col = mix(rgb('#1a0f3c'), rgb('#8a2a7a'), (y - y0) / (y1 - y0))
        for x in range(x0, x1): c.put(x, y, col)
    for y in range(y0, y1):
        for x in range(x0, x1):
            if ell(410, 40, 22, 22)(x + .5, y + .5) and not ell(420, 33, 19, 19)(x + .5, y + .5): c.put(x, y, rgb('#ffd76a'))
            elif ell(410, 40, 26, 26)(x + .5, y + .5) and (x + y) % 2 == 0: c.blend(x, y, rgb('#ff9ad5'), .18)
    sil = union(ell(400, 38, 5, 5.5),                                     # 머리
                poly([(396, 36), (404, 35), (424, 46), (418, 50), (404, 44)]),   # 바람에 날리는 머리카락
                poly([(397, 43), (403, 43), (405, 58), (395, 58)]),       # 몸통
                poly([(395, 56), (405, 56), (414, 74), (388, 74)]),       # 치마
                poly([(398, 74), (400, 74), (399, 86), (397, 86)]), poly([(402, 74), (404, 74), (406, 86), (404, 86)]),  # 다리
                poly([(402, 45), (404, 44), (414, 26), (412, 25)]),       # 들어 올린 팔
                poly([(397, 46), (395, 45), (388, 56), (390, 57)]))       # 반대 팔
    pts = {(x, y) for y in range(y0, y1) for x in range(x0, x1) if sil(x + .5, y + .5)}
    for x, y in pts:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            if (x + dx, y + dy) not in pts: c.put(x + dx, y + dy, rgb('#ff5fb7'))
    for p in pts: c.put(*p, rgb('#140826'))
    c.rect(413, 17, 414, 26, rgb('#ffd76a'))                              # 지팡이
    star = ["..#..", ".###.", "#####", ".###.", ".#.#."]                    # 끝의 작은 별
    for yy, row in enumerate(star):
        for xx, v in enumerate(row):
            if v == '#': c.put(411 + xx, 12 + yy, rgb('#fff3c4') if (xx, yy) == (2, 2) else rgb('#ffd76a'))
    for sx, sy in ((376, 24), (434, 20), (380, 70), (436, 64), (392, 18)):
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)): c.put(sx + dx, sy + dy, rgb('#ffb3e6'))
        c.put(sx, sy, rgb('#ffffff'))
    for y in range(y0, y1, 2):
        for x in range(x0, x1): c.blend(x, y, rgb('#07061a'), .08)
    for x in range(x0 - 1, x1 + 1): c.put(x, y0 - 1, SOFT_CYAN); c.put(x, y1, SOFT_CYAN)
    for y in range(y0 - 1, y1 + 1): c.put(x0 - 1, y, SOFT_CYAN); c.put(x1, y, SOFT_CYAN)

def bunny_billboard(c):
    """전광판: 사이트 캐릭터 '보람이'(별 지팡이 인사 포즈)를 원래 색으로 2배 — 초승달·반짝이 배경 + STAR NOTE 캡션."""
    import gen_sprites as gs
    x0, y0, x1, y1 = 366, 12, 442, 92
    c.rect(374, y1, 376, 118, rgb('#2a2058')); c.rect(432, y1, 434, 118, rgb('#2a2058'))
    for y in range(y0, y1):
        col = mix(rgb('#1a0f3c'), rgb('#8a2a7a'), (y - y0) / (y1 - y0))
        for x in range(x0, x1): c.put(x, y, col)
    for y in range(y0, y1 - 11):
        for x in range(x0, x1):
            if ell(406, 44, 24, 24)(x + .5, y + .5) and not ell(416, 37, 21, 21)(x + .5, y + .5): c.put(x, y, rgb('#ffd76a'))
            elif ell(406, 44, 28, 28)(x + .5, y + .5) and (x + y) % 2 == 0: c.blend(x, y, rgb('#ff9ad5'), .16)
    rows = [] if NO_BILLBOARD_BUNNY else gs.lit(lambda: gs.bunny('wave'))().rows()  # 일러스트를 HTML 로 얹을 땐 비운다
    for sy, row in enumerate(rows):
        for sx, ch in enumerate(row):
            if ch == '.': continue
            col = rgb(gs.PALETTE[ch])
            for k in range(2):
                for l in range(2): c.put(372 + sx * 2 + l, 16 + sy * 2 + k, col)
    for sx, sy, col in ((376, 22, '#ffb3e6'), (436, 20, '#ffd76a'), (378, 66, '#ffd76a'), (437, 60, '#ffb3e6'), (430, 40, '#ffffff')):
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)): c.put(sx + dx, sy + dy, rgb(col))
        c.put(sx, sy, rgb('#ffffff'))
    for y in range(y0, y1, 2):
        for x in range(x0, x1): c.blend(x, y, rgb('#07061a'), .05)
    c.rect(x0, y1 - 11, x1, y1, rgb('#1a0f3c'))
    neon(c, text_cells("STAR NOTE", x0 + 11, y1 - 9, scale=1, gap=1), rgb('#ffb3e6'), rgb('#ffffff'), glow=(0, .25))
    for x in range(x0 - 1, x1 + 1): c.put(x, y0 - 1, SOFT_CYAN); c.put(x, y1, SOFT_CYAN)
    for y in range(y0 - 1, y1 + 1): c.put(x0 - 1, y, SOFT_CYAN); c.put(x1, y, SOFT_CYAN)

def holo_billboard(c):
    """처음 시안: 흐릿한 시안 토끼 홀로그램(반투명 + 스캔라인 + 핑크 잔상)."""
    import gen_sprites as gs
    hx0, hy0, hx1, hy1 = 368, 14, 440, 90
    for y in range(hy0, hy1):
        for x in range(hx0, hx1): c.blend(x, y, rgb('#4ef3ff'), .10 if y % 2 else .05)
    for x in range(hx0, hx1): c.blend(x, hy0, rgb('#4ef3ff'), .7); c.blend(x, hy1 - 1, rgb('#4ef3ff'), .7)
    for sy, row in enumerate(gs.bunny().rows()):
        for sx, ch in enumerate(row):
            if ch == '.': continue
            for k in range(2):
                for l in range(2):
                    x, y = hx0 + 4 + sx * 2 + l, hy0 + 8 + sy * 2 + k
                    if y % 2 == 0 or ch == 'k':
                        c.blend(x - 2, y, rgb('#ff2a6d'), .22)
                        c.blend(x, y, rgb('#7ff8ff') if ch != 'k' else rgb('#d6fdff'), .55 if ch != 'k' else .8)
    c.rect(368, 90, 370, 118, rgb('#261d58')); c.rect(438, 90, 440, 118, rgb('#261d58'))

# 현재 사이트 장면(assets/pixel/scene-night.png)과 바이트 단위로 같은 설정 — STAR NOTE 광고판 틀만 그리고
# 안의 토끼는 HTML 일러스트(.cast--ad)로 얹는다. 다른 *_billboard 는 철회된 시안(컨셉 기록 참고).
BILLBOARD = bunny_billboard
NO_BILLBOARD_BUNNY = True

def neon_billboard(c):
    """네온사인 광고판: 토끼(지팡이 인사 포즈)의 윤곽선을 네온관으로 — 몸 시안, 리본 핑크, 별 지팡이 금 + 번짐."""
    import gen_sprites as gs
    x0, y0, x1, y1 = 366, 12, 442, 92
    c.rect(374, y1, 376, 118, rgb('#2a2058')); c.rect(432, y1, 434, 118, rgb('#2a2058'))
    for y in range(y0, y1):                                                                # 반투명 유리: 뒤 불빛이 틈틈이 비친다
        for x in range(x0, x1): c.blend(x, y, rgb('#07061a'), .5 if (x + y) % 3 else .35)
    for x in range(x0, x1): c.put(x, y0, rgb('#2a2058')); c.put(x, y1 - 1, rgb('#2a2058'))
    for y in range(y0, y1): c.put(x0, y, rgb('#2a2058')); c.put(x1 - 1, y, rgb('#2a2058'))
    rows = gs.bunny_vpose().rows()
    groups = {'c': set(), 'p': set(), 'y': set()}
    for sy, row in enumerate(rows):
        for sx, ch in enumerate(row):
            if ch != 'k': continue
            nb = ''.join(rows[sy + dy][sx + dx] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
                         if 0 <= sx + dx < 32 and 0 <= sy + dy < 32)
            g = 'p' if any(ch2 in 'rRq' for ch2 in nb) else ('y' if any(ch2 in 'yYz' for ch2 in nb) else 'c')
            for k in range(2):
                for l in range(2): groups[g].add((372 + sx * 2 + l, 14 + sy * 2 + k))
    neon(c, groups['c'], rgb('#4ef3ff'), rgb('#d6fdff'))
    neon(c, groups['p'], rgb('#ff2a6d'), rgb('#ffd1e0'))
    neon(c, groups['y'], rgb('#ffd76a'), rgb('#fff6d0'))
    neon(c, text_cells("STAR NOTE", x0 + 11, y1 - 10, scale=1, gap=1), rgb('#ff5fb7'), rgb('#ffffff'), glow=(.12, .3))

if __name__ == '__main__':
    out = sys.argv[1]
    scene(f'{out}/scene-night.png'); bg_tile(f'{out}/stars.png')
    stardust_tile(f'{out}/stardust.png'); heartline_tile(f'{out}/heartline.png')
    print('ok')
