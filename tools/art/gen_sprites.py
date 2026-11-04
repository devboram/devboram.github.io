"""스프라이트 작성 보조 v2 — 도형을 뒤에서 앞으로 겹쳐 그리고, 부위마다 외곽선을 두르고,
왼쪽 위 광원 기준으로 밝은 면/그림자를 자동으로 칠한 뒤 눈·볼 같은 세부를 얹는다.
결과: _data/sprites.yml(문자 격자) + _data/pixel_palette.yml + assets/pixel/ground.svg(땅 타일).
이 스크립트는 작성 도구라 저장소에 넣지 않는다."""
import sys, os, math

PALETTE = {
    'k': '#1b1a3a',                                   # 외곽선
    'w': '#ffffff', 'W': '#dfe6f7', 'L': '#b4bfdc',    # 흰색 램프
    'p': '#ff9ec4', 'P': '#e0709f',                   # 분홍
    'q': '#ff9ccb', 'r': '#ff4f9a', 'R': '#c92f74',    # 마젠타
    'z': '#fff3a8', 'y': '#ffd23f', 'Y': '#e3a600',    # 노랑
    'a': '#ffb37a', 'o': '#ff8a3d', 'O': '#d9601a',    # 주황
    'h': '#b6f7c4', 'g': '#6be58a', 'G': '#2fa84f',    # 초록
    'i': '#a8d8ff', 'b': '#5ab4ff', 'B': '#2f6fe0',    # 파랑
    'j': '#a6f6ff', 'c': '#35e0f0', 'C': '#139fb8',    # 하늘빛
    'u': '#c7a8ff', 'v': '#9b6bff', 'V': '#6a3fd6',    # 보라
    'l': '#c9d1e6', 'd': '#8f98b8', 'D': '#626a8a',    # 회색
    't': '#ff8a8a', 'x': '#ff3b3b', 'X': '#b3202a',    # 빨강
    'n': '#a8693f', 'N': '#7d4a2a', 'M': '#5e3720',    # 흙
    'm': '#2a2f5a',                                   # 화면(어두운 남색)
}
# 기본색 -> (밝은 면, 그림자)
RAMP = {'w': (None, 'W'), 'p': (None, 'P'), 'r': ('q', 'R'), 'y': ('z', 'Y'), 'o': ('a', 'O'),
        'g': ('h', 'G'), 'b': ('i', 'B'), 'c': ('j', 'C'), 'v': ('u', 'V'), 'l': ('w', 'd'),
        'x': ('t', 'X'), 'n': (None, 'N')}

class Canvas:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.px = [['.'] * w for _ in range(h)]
    def inb(self, x, y): return 0 <= x < self.w and 0 <= y < self.h
    def cells(self, test):
        return [(x, y) for y in range(self.h) for x in range(self.w) if test(x + .5, y + .5)]
    def blob(self, test, ch, outline=True):
        pts = self.cells(test); s = set(pts)
        if outline:
            for x, y in pts:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    n = (x + dx, y + dy)
                    if n not in s and self.inb(*n): self.px[n[1]][n[0]] = 'k'
        for x, y in pts: self.px[y][x] = ch
    def fill(self, test, ch): self.blob(test, ch, outline=False)
    def put(self, x, y, ch):
        if self.inb(x, y): self.px[y][x] = ch
    def rect(self, x0, y0, x1, y1, ch): self.fill(rect(x0, y0, x1, y1), ch)
    def shade(self, depth=1):
        src = [r[:] for r in self.px]
        def edge(x, y): return not self.inb(x, y) or src[y][x] in '.k'
        for y in range(self.h):
            for x in range(self.w):
                ch = src[y][x]
                if ch not in RAMP: continue
                light, dark = RAMP[ch]
                if any(edge(x + d, y) or edge(x, y + d) for d in range(1, depth + 1)):
                    self.px[y][x] = dark
                elif light and (edge(x - 1, y) or edge(x, y - 1)):
                    self.px[y][x] = light
    def rim(self):
        """네온 림라이트: 바깥 외곽선 바로 안쪽 픽셀을 왼쪽은 시안, 오른쪽은 핑크로 (밤 도시 조명)."""
        src = [r[:] for r in self.px]
        def clear(x, y): return not self.inb(x, y) or src[y][x] == '.'
        for y in range(self.h):
            for x in range(self.w):
                if src[y][x] in '.k': continue
                if self.inb(x - 1, y) and src[y][x - 1] == 'k' and clear(x - 2, y): self.px[y][x] = 'j'
                elif self.inb(x + 1, y) and src[y][x + 1] == 'k' and clear(x + 2, y): self.px[y][x] = 'q'
    def rows(self): return [''.join(r) for r in self.px]

def ell(cx, cy, rx, ry): return lambda x, y: ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1
def rect(x0, y0, x1, y1): return lambda x, y: x0 <= x < x1 and y0 <= y < y1
def rrect(x0, y0, x1, y1, r):
    def t(x, y):
        if not (x0 <= x < x1 and y0 <= y < y1): return False
        cx = min(max(x, x0 + r), x1 - r); cy = min(max(y, y0 + r), y1 - r)
        return (x - cx) ** 2 + (y - cy) ** 2 <= r * r
    return t
def poly(pts):
    def t(x, y):
        inside = False
        for i in range(len(pts)):
            (x1, y1), (x2, y2) = pts[i], pts[(i + 1) % len(pts)]
            if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1: inside = not inside
        return inside
    return t
def union(*ts): return lambda x, y: any(t(x, y) for t in ts)
def mirror_x(pts, w): return [(w - x, y) for x, y in pts]

def happy_eyes(c, y, xs):
    """^ ^ 웃는 눈: 가운데가 올라간 4픽셀 아치."""
    for x0 in xs:
        c.put(x0, y + 1, 'k'); c.put(x0 + 1, y, 'k'); c.put(x0 + 2, y, 'k'); c.put(x0 + 3, y + 1, 'k')

def bunny(pose='stand'):
    """pose: stand(지팡이를 옆에 듦) · wave(지팡이를 머리 위로 들고 웃음)."""
    c = Canvas(32, 32)
    c.blob(ell(10.5, 8, 3.2, 7.5), 'w'); c.blob(ell(21.5, 8, 3.2, 7.5), 'w')       # 귀
    c.fill(ell(10.5, 8.5, 1.2, 5), 'p'); c.fill(ell(21.5, 8.5, 1.2, 5), 'p')       # 귀 안쪽
    c.blob(ell(16, 26.2, 8.5, 4.6), 'w')                                           # 몸
    c.blob(ell(10.5, 29.4, 3.4, 1.9), 'w'); c.blob(ell(21.5, 29.4, 3.4, 1.9), 'w')   # 발
    if pose == 'stand': c.blob(poly([(24.4, 30.6), (25.8, 30.6), (29.4, 20.6), (28.0, 20.6)]), 'y')  # 지팡이 손잡이
    c.blob(ell(16, 17, 11.2, 8.2), 'w')                                            # 머리
    c.blob(union(ell(12.6, 9.4, 2.7, 1.9), ell(19.4, 9.4, 2.7, 1.9)), 'r')         # 머리 리본
    c.blob(ell(16, 9.6, 1.3, 1.4), 'r')
    c.blob(union(ell(11.8, 26.4, 3.4, 2.1), ell(20.2, 26.4, 3.4, 2.1)), 'r')       # 가슴 리본
    c.blob(ell(16, 26.4, 2.1, 2.1), 'y')                                           # 브로치
    if pose == 'wave': c.blob(poly([(23.2, 25.6), (24.6, 25.6), (29.4, 9.6), (28.0, 9.6)]), 'y')     # 번쩍 든 지팡이
    sx, sy = (28.6, 18.4) if pose == 'stand' else (28.8, 5.8)
    star_pts = [(sx + (3.8 if i % 2 == 0 else 1.6) * math.cos(-math.pi / 2 + i * math.pi / 5),
                 sy + (3.8 if i % 2 == 0 else 1.6) * math.sin(-math.pi / 2 + i * math.pi / 5)) for i in range(10)]
    c.blob(poly(star_pts), 'y')                                                    # 지팡이 끝 별
    c.shade()
    c.put(15, 26, 'r'); c.put(16, 26, 'r'); c.put(15, 25, 'q')                     # 브로치의 하트 보석
    c.rect(7, 20, 9, 21, 'p'); c.rect(23, 20, 25, 21, 'p')                          # 볼
    if pose == 'wave':
        happy_eyes(c, 16, (9, 19))
        c.rect(15, 20, 17, 21, 'r'); c.put(14, 21, 'k'); c.put(17, 21, 'k'); c.rect(15, 21, 17, 23, 'R')  # 벌린 입
    else:
        c.rect(10, 15, 13, 19, 'k'); c.rect(19, 15, 22, 19, 'k')                   # 눈
        c.put(11, 16, 'w'); c.put(20, 16, 'w'); c.put(12, 18, 'm'); c.put(21, 18, 'm')
        c.rect(15, 20, 17, 21, 'r')                                                 # 코
        c.put(15, 21, 'k'); c.put(16, 21, 'k'); c.put(14, 22, 'k'); c.put(17, 22, 'k')  # 입
    return c

def robot(pose='stand'):
    """pose: stand · fly(발밑 제트 불꽃으로 떠 있음, 캔버스 32x38)."""
    c = Canvas(32, 38 if pose == 'fly' else 32)
    c.blob(rect(15, 3, 17, 8), 'l')                                                 # 안테나 줄기
    c.blob(union(ell(15, 2.4, 1.6, 1.6), ell(17, 2.4, 1.6, 1.6), poly([(13.4, 3), (18.6, 3), (16, 5.6)])), 'r')  # 하트 안테나
    c.blob(rrect(1, 12, 5, 20, 1), 'y'); c.blob(rrect(27, 12, 31, 20, 1), 'y')      # 귀 볼트
    c.blob(rrect(4, 7, 28, 24, 3), 'l')                                             # 머리
    c.blob(rrect(13, 24, 19, 26, 0.5), 'd')                                         # 목
    c.blob(rrect(2, 25, 7, 31, 1.5), 'l'); c.blob(rrect(25, 25, 30, 31, 1.5), 'l')  # 팔
    c.blob(rrect(7, 25, 25, 31, 2), 'b')                                            # 몸
    c.blob(rect(11, 27, 21, 30), 'y')                                               # 가슴 패널
    c.shade()
    c.fill(rrect(7, 10, 25, 21, 2), 'm')                                            # 화면
    c.rect(10, 13, 13, 16, 'c'); c.rect(19, 13, 22, 16, 'c')                        # 눈
    c.put(10, 13, 'j'); c.put(19, 13, 'j')
    c.put(11, 18, 'c'); c.put(20, 18, 'c'); c.rect(12, 19, 20, 20, 'c')             # 웃는 입
    c.put(8, 11, 'D'); c.put(9, 11, 'D'); c.put(8, 12, 'D')                         # 화면 반사
    c.put(13, 28, 'x'); c.put(16, 28, 'g'); c.put(19, 28, 'c')                      # 패널 불빛
    if pose == 'fly':
        for cx in (12.5, 19.5):                                                     # 제트 불꽃
            c.fill(poly([(cx - 2.6, 31), (cx + 2.6, 31), (cx, 37.8)]), 'o')
            c.fill(poly([(cx - 1.4, 31), (cx + 1.4, 31), (cx, 35.2)]), 'y')
            c.put(int(cx), 31, 'z')
    return c

def cat_sleep():
    """엎드려 자는 고양이 32x20 — 간판 위에 눕힌다. 닫은 눈 · 말아 올린 꼬리 · 머리 위 Z."""
    c = Canvas(32, 20)
    c.blob(ell(27.6, 16.4, 4.2, 2.2), 'o')                                          # 꼬리
    c.blob(ell(18.4, 14.2, 10.6, 4.8), 'o')                                         # 몸
    c.blob(poly([(3.0, 3.2), (2.8, 10.6), (8.6, 8.0)]), 'o'); c.blob(poly([(12.6, 3.4), (13.8, 10.4), (8.0, 8.2)]), 'o')  # 귀
    c.fill(poly([(3.8, 5.4), (3.7, 9.6), (7.0, 8.2)]), 'p'); c.fill(poly([(11.8, 5.6), (12.6, 9.4), (9.4, 8.4)]), 'p')
    c.blob(ell(8.2, 12.2, 6.4, 5.2), 'o')                                           # 머리
    c.blob(union(ell(11.4, 6.6, 1.7, 1.2), ell(14.0, 7.2, 1.7, 1.2)), 'r')          # 귀 리본
    c.blob(ell(4.6, 17.8, 2.4, 1.3), 'o')                                           # 앞발
    c.shade()
    c.fill(ell(8.2, 14.6, 3.4, 2.0), 'w')                                           # 주둥이
    for x, y in ((4, 12), (5, 13), (6, 13), (7, 12), (9, 12), (10, 13), (11, 13), (12, 12)): c.put(x, y, 'k')  # 감은 눈
    c.put(8, 14, 'p')                                                               # 코
    for x in (17, 18, 21, 22, 25): c.put(x, 10, 'O')                                # 등 줄무늬
    for x, y in ((21, 1), (22, 1), (23, 1), (22, 2), (21, 3), (22, 3), (23, 3), (26, 4), (27, 4), (26, 5), (27, 5)): c.put(x, y, 'W')  # Z z
    return c

def cat():
    c = Canvas(32, 32)
    c.blob(ell(27.6, 21.5, 2.4, 7), 'o')                                            # 꼬리
    c.blob(ell(16, 25.6, 9.4, 5.1), 'o')                                            # 몸
    ear_l = [(5.2, 1.4), (4.6, 13.5), (13.4, 10)]
    c.blob(poly(ear_l), 'o'); c.blob(poly(mirror_x(ear_l, 32)), 'o')                 # 귀
    inner = [(6.4, 4.6), (6.2, 11.6), (11, 10.2)]
    c.fill(poly(inner), 'p'); c.fill(poly(mirror_x(inner, 32)), 'p')
    c.blob(ell(16, 15.6, 11.2, 8.6), 'o')                                           # 머리
    c.blob(union(ell(8.6, 8.4, 2.0, 1.4), ell(12.0, 8.8, 2.0, 1.4)), 'r')           # 귀 리본
    c.blob(rect(11, 22, 21, 24), 'r')                                               # 목걸이
    c.blob(rect(10, 25, 22, 31), 'w')                                               # 수첩
    c.blob(ell(16, 24.2, 1.7, 1.7), 'y')                                            # 방울
    c.blob(ell(9.6, 26.5, 2.2, 1.7), 'o'); c.blob(ell(22.4, 26.5, 2.2, 1.7), 'o')   # 앞발
    c.shade()
    c.fill(ell(16, 19.6, 5.2, 3.2), 'w')                                            # 주둥이
    c.rect(12, 27, 20, 28, 'l'); c.rect(12, 29, 18, 30, 'l')                        # 수첩 줄
    c.put(16, 25, 'Y')                                                              # 방울 틈
    c.rect(10, 13, 13, 17, 'g'); c.rect(19, 13, 22, 17, 'g')                        # 눈(홍채)
    c.rect(11, 13, 12, 17, 'k'); c.rect(20, 13, 21, 17, 'k')                        # 동공
    c.put(10, 13, 'w'); c.put(19, 13, 'w')
    for x in (14, 15, 16, 17): c.put(x, 8, 'O')                                    # 이마 줄무늬
    c.put(15, 9, 'O'); c.put(16, 9, 'O'); c.put(9, 9, 'O'); c.put(22, 9, 'O')
    c.rect(15, 18, 17, 19, 'p')                                                     # 코
    c.put(15, 19, 'k'); c.put(16, 19, 'k'); c.put(14, 20, 'k'); c.put(17, 20, 'k')  # 입
    c.rect(7, 19, 9, 20, 'p'); c.rect(23, 19, 25, 20, 'p')                          # 볼
    return c

def slime(pose='stand'):
    """pose: stand(바닥에 퍼짐) · jump(동그랗게 뭉쳐 뛰어오름, 아래 움직임 선)."""
    c = Canvas(32, 32)
    c.blob(rect(15, 6, 17, 11), 'g')                                                # 꽃 줄기
    c.blob(union(ell(16, 3.0, 1.7, 1.5), ell(13.8, 4.9, 1.7, 1.5), ell(18.2, 4.9, 1.7, 1.5),
                 ell(14.6, 7.0, 1.6, 1.4), ell(17.4, 7.0, 1.6, 1.4)), 'p')          # 꽃잎
    c.blob(ell(16, 5.2, 1.1, 1.1), 'y')                                             # 꽃술
    if pose == 'jump':
        c.blob(ell(16, 17.6, 12, 11), 'g')                                          # 동그랗게 뭉친 몸
        c.shade(depth=2)
        c.fill(ell(9.6, 12.6, 1.7, 2.6), 'h'); c.put(12, 9, 'h'); c.put(13, 9, 'h')
        happy_eyes(c, 16, (9, 19))
        c.rect(6, 20, 9, 21, 'p'); c.rect(23, 20, 26, 21, 'p')
        c.rect(14, 21, 18, 22, 'k'); c.rect(15, 22, 17, 24, 'r')
        for x, y in ((11, 30), (12, 30), (19, 30), (20, 30), (15, 31), (16, 31)): c.put(x, y, 'W')  # 움직임 선
        return c
    c.blob(lambda x, y: ((x - 16) / 13.6) ** 2 + ((y - 21.5) / 11.4) ** 2 <= 1 and y < 30.5, 'g')  # 몸
    c.shade(depth=2)
    c.fill(ell(9.2, 15.5, 1.8, 2.8), 'h'); c.put(12, 12, 'h'); c.put(13, 12, 'h')   # 광택
    c.fill(ell(11.5, 20.5, 2.1, 2.9), 'k'); c.fill(ell(20.5, 20.5, 2.1, 2.9), 'k')  # 눈
    c.put(11, 19, 'w'); c.put(20, 19, 'w'); c.put(12, 22, 'm'); c.put(21, 22, 'm')
    c.rect(6, 24, 9, 25, 'p'); c.rect(23, 24, 26, 25, 'p')                          # 볼
    c.rect(14, 24, 18, 25, 'k'); c.rect(15, 25, 17, 26, 'r')                        # 입
    return c

def heart():
    c = Canvas(16, 16)
    c.blob(union(ell(5.2, 5.6, 3.6, 3.6), ell(10.8, 5.6, 3.6, 3.6), poly([(1.8, 6.6), (14.2, 6.6), (8, 14.4)])), 'x')
    c.shade(); c.put(4, 4, 'w'); c.put(5, 4, 'w'); c.put(4, 5, 'w')
    return c

def star():
    c = Canvas(16, 16)
    pts = []
    for i in range(10):
        r = 7.4 if i % 2 == 0 else 3.3
        a = -math.pi / 2 + i * math.pi / 5
        pts.append((8 + r * math.cos(a), 8.6 + r * math.sin(a)))
    c.blob(poly(pts), 'y'); c.shade(); c.put(6, 6, 'w')
    return c

def coin():
    c = Canvas(16, 16)
    c.blob(ell(8, 8, 5.8, 7.1), 'y'); c.shade()
    c.fill(ell(8, 8, 3.2, 4.6), 'Y'); c.rect(7, 5, 9, 11, 'z')
    return c

def cloud():
    c = Canvas(32, 16)
    c.fill(union(ell(8, 10, 5.5, 4.5), ell(15.5, 7, 7, 6), ell(24, 9.5, 5.6, 5), rect(3, 10, 29, 14)), 'w')
    c.shade(depth=2)
    return c

def ground_tile():
    """16x16 땅 타일: 위 잔디(잎 끝이 하늘로 삐죽) + 아래 어두운 흙과 자갈. 푸터 글자는 흙 위에 오므로 흙은 어둡게."""
    c = Canvas(16, 16)
    blades = {1: 0, 4: 1, 6: 0, 9: 1, 12: 0, 14: 1}
    for x, top in blades.items():
        for y in range(top, 3): c.put(x, y, 'g')
    c.rect(0, 2, 16, 6, 'g')
    for x, y in ((2, 3), (7, 2), (11, 3), (14, 4)): c.put(x, y, 'h')
    for x, y in ((4, 5), (9, 4), (13, 5)): c.put(x, y, 'G')
    c.rect(0, 6, 16, 7, 'G')
    for x in (2, 5, 10, 13): c.put(x, 7, 'G')
    c.rect(0, 7, 16, 16, 'N'); [c.put(x, 7, 'G') for x in (2, 5, 10, 13)]
    for x, y in ((3, 10), (4, 10), (9, 12), (12, 9), (13, 9), (6, 14), (1, 13), (14, 14)): c.put(x, y, 'M')
    return c

def sparkle(arm, light):
    def f():
        c = Canvas(7, 7)
        for y in range(7): c.put(3, y, arm)
        for x in range(7): c.put(x, 3, arm)
        for x, y in ((3, 2), (3, 4), (2, 3), (4, 3)): c.put(x, y, light)
        c.put(3, 3, 'w')
        return c
    return f

def hovercar(body, light, dark):
    def f():
        c = Canvas(14, 6)
        c.blob(rrect(1, 2, 13, 5, 1), body)                 # 차체
        c.blob(rrect(4, 0.6, 10, 3, 1), 'm')                # 유리 덮개
        c.shade()
        c.put(5, 1, 'j'); c.put(12, 3, 'w'); c.put(1, 3, 'x')  # 유리 반사·전조등·후미등
        c.rect(3, 5, 11, 6, light)                          # 바닥 추진광
        return c
    return f

def moon():
    c = Canvas(16, 16)
    c.blob(lambda x, y: ell(7.6, 8.2, 6.4, 6.4)(x, y) and not ell(10.4, 6.4, 5.4, 5.4)(x, y), 'y')
    c.shade(); c.put(3, 8, 'w'); c.put(3, 9, 'w')
    return c

def heartgem():
    c = Canvas(16, 16)
    c.blob(union(ell(5.2, 5.6, 3.6, 3.6), ell(10.8, 5.6, 3.6, 3.6), poly([(1.8, 6.6), (14.2, 6.6), (8, 14.4)])), 'r')
    c.shade()
    for x, y in ((8, 5), (8, 6), (7, 7), (9, 7)): c.put(x, y, 'q')                 # 보석 면
    c.put(4, 4, 'w'); c.put(5, 4, 'w'); c.put(4, 5, 'w')
    return c

def shooting():
    c = Canvas(16, 5)
    for i, x in enumerate(range(0, 12)):                                           # 꼬리: 핑크 → 금
        c.put(x, 3 - (x // 6), 'p' if i < 6 else 'q')
        if i > 5: c.put(x, 2 - (x // 8), 'z')
    for x, y in ((13, 1), (12, 1), (14, 1), (13, 0), (13, 2)): c.put(x, y, 'z')
    c.put(13, 1, 'w')
    return c

def villain(rage=False):
    """빌런 보스 '글리치 킹'(꼬마 악당): 동그란 얼굴 · 큰 붉은 눈 · 작은 뿔 · 비스듬한 미니 왕관 · 송곳니 · 짧은 망토 · 살짝 글리치."""
    c = Canvas(32, 32)
    c.blob(union(ell(16, 26.5, 11, 5.2), poly([(6, 27), (26, 27), (28, 31.4), (4, 31.4)])), 'V')   # 짧은 망토
    c.blob(ell(16, 27.4, 6.4, 4), 'm')                                             # 몸
    c.blob(poly([(8.4, 10), (7.2, 4.6), (11.6, 8)]), 'l'); c.blob(poly([(23.6, 10), (24.8, 4.6), (20.4, 8)]), 'l')  # 작은 뿔
    c.blob(ell(16, 15.6, 10.4, 9), 'v')                                            # 동그란 얼굴
    c.blob(poly([(16.5, 7.4), (17.6, 3.2), (19.4, 5.6), (21.4, 3.4), (22.4, 6.4), (23.2, 4.2), (23.6, 8.4)]), 'y')  # 비스듬한 미니 왕관
    if rage: c.blob(ell(4.6, 22, 2.4, 2.4), 'v'); c.blob(ell(27.4, 22, 2.4, 2.4), 'v')   # 번쩍 든 주먹
    c.shade()
    for ex in (10, 19):                                                            # 큰 눈
        c.rect(ex, 13, ex + 4, 18, 'k'); c.rect(ex + 1, 14, ex + 3, 17, 'x')
        c.put(ex + 1, 14, 'w'); c.put(ex + 2, 16, 't')
    c.put(9, 12, 'k'); c.put(23, 12, 'k')                                         # 장난스러운 눈꼬리
    c.rect(7, 19, 9, 20, 'p'); c.rect(23, 19, 25, 20, 'p')                         # 볼
    c.rect(14, 20, 19, 21, 'k'); c.put(17, 21, 'w')                                # 씨익 입 + 송곳니
    c.put(20, 5, 'x')
    if rage:
        for y in (12, 13, 24): 
            for x in range(32):
                if c.px[y][x] != '.' and (x == 0 or c.px[y][x - 1] == '.'): c.put(x - 1, y, 'c'); break
    else:
        for x in range(32):
            if c.px[15][x] != '.': c.put(x - 1, 15, 'c'); break
        for x in range(31, -1, -1):
            if c.px[24][x] != '.': c.put(x + 1, 24, 'r'); break
    return c

def bunny_vpose():
    """결정 포즈: 한쪽 앞발로 눈가에 브이 + 윙크, 다른 손은 허리에 얹고 하트·초승달 요술봉을 든다."""
    c = Canvas(32, 32)
    c.blob(ell(10.5, 8, 3.2, 7.5), 'w'); c.blob(ell(21.5, 8, 3.2, 7.5), 'w')
    c.fill(ell(10.5, 8.5, 1.2, 5), 'p'); c.fill(ell(21.5, 8.5, 1.2, 5), 'p')
    c.blob(ell(16, 26.2, 8.5, 4.6), 'w')
    c.blob(ell(10.5, 29.4, 3.4, 1.9), 'w'); c.blob(ell(21.5, 29.4, 3.4, 1.9), 'w')
    c.blob(rect(27, 19, 28.2, 31.5), 'p')                                          # 요술봉 손잡이(허리 쪽)
    c.blob(ell(16, 17, 11.2, 8.2), 'w')
    c.blob(union(ell(12.6, 9.4, 2.7, 1.9), ell(19.4, 9.4, 2.7, 1.9)), 'r'); c.blob(ell(16, 9.6, 1.3, 1.4), 'r')
    c.blob(union(ell(11.8, 26.4, 3.4, 2.1), ell(20.2, 26.4, 3.4, 2.1)), 'r'); c.blob(ell(16, 26.4, 2.1, 2.1), 'y')
    c.blob(ell(25.4, 25.2, 2.4, 2.0), 'w')                                          # 허리에 얹은 손
    c.blob(lambda x, y: ell(27.6, 15.6, 3.6, 3.6)(x, y) and not ell(29.0, 14.6, 3.0, 3.0)(x, y), 'y')  # 봉 머리 초승달
    c.blob(union(ell(26.9, 15.2, 1.4, 1.4), ell(28.7, 15.2, 1.4, 1.4), poly([(25.5, 15.6), (30.1, 15.6), (27.8, 18.6)])), 'r')  # 하트
    c.blob(union(ell(25.6, 19.6, 1.5, 1.0), ell(30.0, 19.6, 1.5, 1.0)), 'p')        # 리본
    c.blob(ell(6.8, 19.2, 2.2, 2.4), 'w')                                           # 브이 하는 앞발
    c.blob(rect(4.4, 13.0, 5.6, 17.2), 'w'); c.blob(rect(7.2, 12.4, 8.4, 17.2), 'w')  # 브이 손가락
    c.shade()
    c.put(15, 26, 'r'); c.put(16, 26, 'r'); c.put(15, 25, 'q'); c.put(26, 14, 'w')
    c.rect(23, 20, 25, 21, 'p'); c.rect(10, 20, 12, 21, 'p')                        # 볼
    for x, y in ((10, 17), (11, 16), (12, 16), (13, 17)): c.put(x, y, 'k')         # 윙크
    c.rect(19, 15, 22, 19, 'k'); c.put(20, 16, 'w'); c.put(21, 18, 'm')            # 뜬 눈
    c.rect(15, 20, 17, 21, 'r'); c.put(15, 21, 'k'); c.put(16, 21, 'k'); c.put(14, 22, 'k'); c.put(17, 22, 'k')
    return c

def wand():
    """요술봉 아이템 16x32: 초승달에 감싼 하트 · 작은 날개 · 보석 박힌 금 고리 · 리본 · 사탕 줄무늬 손잡이 · 별 끝장식."""
    c = Canvas(16, 32)
    c.blob(union(ell(2.6, 7.0, 2.4, 1.6), ell(2.4, 9.4, 2.0, 1.3)), 'w')
    c.blob(union(ell(13.4, 7.0, 2.4, 1.6), ell(13.6, 9.4, 2.0, 1.3)), 'w')
    c.blob(lambda x, y: ell(8, 8, 6.0, 6.0)(x, y) and not ell(9.8, 6.8, 5.0, 5.0)(x, y), 'y')
    c.blob(union(ell(6.6, 7.4, 2.2, 2.2), ell(9.4, 7.4, 2.2, 2.2), poly([(4.4, 8.2), (11.6, 8.2), (8, 12.6)])), 'r')
    c.blob(rect(7, 16, 9, 29), 'p')
    c.blob(rect(5.6, 13.6, 10.4, 15.8), 'y')
    c.blob(union(ell(5.0, 17.2, 2.6, 1.6), ell(11.0, 17.2, 2.6, 1.6)), 'p'); c.blob(ell(8, 17.2, 1.3, 1.3), 'r')
    c.blob(poly([(6.4, 17.8), (7.4, 18.2), (5.4, 22.6), (4.2, 21.6)]), 'p'); c.blob(poly([(9.6, 17.8), (8.6, 18.2), (10.6, 22.6), (11.8, 21.6)]), 'p')
    c.blob(poly([(8, 27.4), (9.2, 29.4), (8, 31.4), (6.8, 29.4)]), 'y')
    c.shade()
    for y in range(19, 28, 3): c.put(7, y, 'w'); c.put(8, y + 1, 'w')
    c.put(6, 6, 'w'); c.put(7, 6, 'q'); c.put(8, 14, 'c'); c.put(7, 14, 'j'); c.put(8, 29, 'z')
    c.put(14, 2, 'z'); c.put(13, 2, 'y'); c.put(14, 1, 'y'); c.put(1, 13, 'q')
    return c

def heart_shape(cx, cy, r):
    return union(ell(cx - r * .62, cy - r * .3, r * .62, r * .62), ell(cx + r * .62, cy - r * .3, r * .62, r * .62),
                 poly([(cx - r * 1.2, cy), (cx + r * 1.2, cy), (cx, cy + r * 1.3)]))
def star_shape(cx, cy, ro, ri):
    return poly([(cx + (ro if i % 2 == 0 else ri) * math.cos(-math.pi / 2 + i * math.pi / 5),
                  cy + (ro if i % 2 == 0 else ri) * math.sin(-math.pi / 2 + i * math.pi / 5)) for i in range(10)])

def item_compact():      # 하트 콤팩트: 금 테 둥근 거울 + 핑크 하트 뚜껑 + 보석
    c = Canvas(16, 16); c.blob(ell(8, 8.4, 6.6, 6.2), 'y'); c.blob(ell(8, 8.4, 5, 4.6), 'p')
    c.blob(heart_shape(8, 8, 3), 'r'); c.shade(); c.put(8, 9, 'c'); c.put(7, 6, 'w'); c.put(4, 5, 'z'); return c
def item_brooch():       # 별 브로치 + 리본 꼬리
    c = Canvas(16, 16)
    c.blob(poly([(6, 10), (7.5, 10.5), (5, 15.4), (3.6, 14.4)]), 'p'); c.blob(poly([(10, 10), (8.5, 10.5), (11, 15.4), (12.4, 14.4)]), 'p')
    c.blob(star_shape(8, 7.6, 6.6, 2.9), 'y'); c.blob(ell(8, 7.8, 1.8, 1.8), 'r'); c.shade(); c.put(7, 7, 'q'); c.put(6, 4, 'w'); return c
def item_pendant():      # 초승달 펜던트 + 하트 장식 + 줄
    c = Canvas(16, 16)
    for x, y in ((3, 0), (4, 1), (5, 2), (12, 0), (11, 1), (10, 2)): c.put(x, y, 'y')
    c.blob(lambda x, y: ell(8, 9, 5.6, 5.6)(x, y) and not ell(10.2, 7.8, 4.6, 4.6)(x, y), 'y')
    c.blob(heart_shape(10.4, 9.4, 2), 'r'); c.shade(); c.put(4, 8, 'w'); c.put(10, 8, 'q'); return c
def item_potion():       # 하트 물약: 코르크 + 하트 병 + 반짝임
    c = Canvas(16, 16); c.blob(rect(6.5, 0.6, 9.5, 3.4), 'n'); c.blob(rect(6, 3, 10, 5.4), 'l')
    c.blob(heart_shape(8, 9.6, 4.6), 'u'); c.fill(heart_shape(8, 10.6, 3.2), 'r'); c.shade()
    c.put(5, 8, 'w'); c.put(5, 9, 'w'); c.put(10, 11, 'q'); c.put(13, 3, 'z'); return c
def item_crystal():      # 수정구: 라벤더 구슬 속 별 + 금 받침
    c = Canvas(16, 16); c.blob(poly([(3.6, 15.4), (12.4, 15.4), (10.6, 12), (5.4, 12)]), 'y')
    c.blob(ell(8, 7.4, 5.6, 5.6), 'u'); c.fill(star_shape(8, 7.8, 2.8, 1.2), 'z'); c.shade()
    c.put(5, 4, 'w'); c.put(6, 4, 'w'); c.put(5, 5, 'w'); return c
def item_book():         # 마법책: 핑크 표지 + 금 초승달 문양 + 책갈피 리본
    c = Canvas(16, 16); c.blob(rect(2.6, 1.6, 13.4, 14.4), 'r'); c.blob(rect(11.4, 1.6, 13.4, 14.4), 'w')
    c.shade(); c.fill(lambda x, y: ell(7, 8, 3.2, 3.2)(x, y) and not ell(8.4, 7.2, 2.6, 2.6)(x, y), 'y')
    for y in range(12, 16): c.put(5, y, 'c')
    c.put(9, 5, 'z'); c.put(4, 3, 'q'); return c
def item_bow():          # 큰 리본: 핑크 날개 + 금 매듭
    c = Canvas(16, 16)
    c.blob(poly([(8, 7), (1, 2.4), (1.4, 12.4)]), 'r'); c.blob(poly([(8, 7), (15, 2.4), (14.6, 12.4)]), 'r')
    c.blob(poly([(7, 8.6), (5, 15.4), (7.6, 14.2)]), 'p'); c.blob(poly([(9, 8.6), (11, 15.4), (8.4, 14.2)]), 'p')
    c.blob(ell(8, 7.4, 2, 2), 'y'); c.shade(); c.put(3, 5, 'q'); c.put(12, 5, 'q'); c.put(7, 7, 'z'); return c
def item_tiara():        # 하트 보석 티아라
    c = Canvas(16, 16)
    c.blob(poly([(1, 12.4), (15, 12.4), (13.4, 7), (11, 9.6), (8, 4.4), (5, 9.6), (2.6, 7)]), 'y')
    c.blob(heart_shape(8, 8.2, 2), 'r'); c.shade()
    c.put(3, 9, 'c'); c.put(12, 9, 'c'); c.put(8, 4, 'w'); c.put(7, 7, 'q'); return c
def item_milk():         # 딸기우유 팩 (보람이 최애)
    c = Canvas(16, 16); c.blob(poly([(3.6, 4.6), (8, 1.4), (12.4, 4.6)]), 'w'); c.blob(rect(3.6, 4.6, 12.4, 15.4), 'w')
    c.blob(rect(10, 0.4, 11, 4), 'c'); c.shade(); c.fill(rect(4.6, 8, 11.4, 13), 'p'); c.fill(heart_shape(8, 10, 1.6), 'r')
    c.put(5, 6, 'r'); c.put(10, 6, 'r'); return c
def item_lens():         # 디버그 돋보기: 별 테 + 손잡이 (버그를 비추는 도구)
    c = Canvas(16, 16); c.blob(poly([(10.4, 11.4), (12, 10), (15.4, 13.6), (13.8, 15.2)]), 'r')
    c.blob(ell(6.6, 6.6, 5.4, 5.4), 'y'); c.fill(ell(6.6, 6.6, 3.6, 3.6), 'i'); c.shade()
    c.put(5, 4, 'w'); c.put(4, 5, 'w'); c.put(7, 7, 'g'); c.put(11, 1, 'z'); return c

def item_duck():         # 러버덕: 노란 오리 + 주황 부리 + 핑크 볼
    c = Canvas(16, 16); c.blob(ell(8.6, 11.4, 6.4, 3.8), 'y'); c.blob(ell(6.4, 6.4, 3.6, 3.4), 'y')
    c.blob(ell(2.4, 7.4, 1.8, 1.0), 'o'); c.blob(ell(11.6, 9.6, 2.2, 1.6), 'y'); c.shade()
    c.put(6, 5, 'k'); c.put(5, 8, 'p'); c.put(7, 4, 'w'); return c
def item_coffee():       # 하트 라테: 컵 + 하트 거품 + 김
    c = Canvas(16, 16); c.blob(ell(13, 9.6, 2.2, 2.4), 'w'); c.blob(rect(2.6, 6, 12.4, 14.4), 'w')
    c.blob(rect(3.6, 6, 11.4, 8), 'n'); c.shade(); c.fill(heart_shape(7.5, 6.8, 1.4), 'a')
    for x, y in ((5, 3), (6, 2), (9, 3), (10, 2), (5, 1)): c.put(x, y, 'W'); c.rect(4, 10, 11, 11, 'p'); return c
def item_keycap():       # 하트 키캡
    c = Canvas(16, 16); c.blob(rrect(1.6, 3.6, 14.4, 14.4, 2), 'u'); c.blob(rrect(3, 3, 13, 11.6, 2), 'w')
    c.shade(); c.fill(heart_shape(8, 6.8, 2.2), 'r'); c.put(7, 6, 'q'); return c
def item_net():          # 버그 잠자리채: 손잡이 + 링 + 그물 + 잡힌 반짝 버그
    c = Canvas(16, 16); c.blob(poly([(1, 15), (2.2, 15.4), (8.6, 8.6), (7.4, 7.8)]), 'n')
    c.blob(lambda x, y: ell(10.6, 5.4, 4.6, 4.6)(x, y) and not ell(10.6, 5.4, 3.4, 3.4)(x, y), 'y')
    c.fill(ell(10.6, 5.4, 3.4, 3.4), 'W'); c.shade()
    for x in range(8, 14): c.put(x, 5, 'l')
    for y in range(3, 9): c.put(10, y, 'l')
    c.put(11, 4, 'x'); c.put(12, 6, 'z'); return c
def item_laptop():       # 스티커 붙은 노트북
    c = Canvas(16, 16); c.blob(rect(2.4, 2.4, 13.6, 10.6), 'l'); c.blob(poly([(0.6, 11), (15.4, 11), (14.4, 14), (1.6, 14)]), 'd')
    c.shade(); c.fill(rect(3.6, 3.6, 12.4, 9.4), 'm'); c.fill(heart_shape(10.4, 5.4, 1.2), 'r'); c.put(5, 6, 'c'); c.put(6, 6, 'c'); c.put(5, 7, 'g'); return c
def item_floppy():       # 하트 플로피디스크
    c = Canvas(16, 16); c.blob(rrect(1.6, 1.6, 14.4, 14.4, 1), 'v'); c.shade()
    c.fill(rect(4, 1.6, 12, 5.6), 'l'); c.fill(rect(9, 2.4, 10.6, 5), 'm'); c.fill(rect(3.6, 8, 12.4, 14.4), 'w')
    c.fill(heart_shape(8, 10.4, 1.6), 'r'); return c
def item_wrench():       # 별 렌치
    c = Canvas(16, 16); c.blob(poly([(2.4, 14.4), (4, 15.6), (10.6, 8.6), (9, 7.2)]), 'l')
    c.blob(lambda x, y: ell(11, 5, 4, 4)(x, y) and not rect(10, 0, 16, 4.4)(x, y), 'l'); c.shade()
    c.fill(star_shape(4, 12.8, 2, .9), 'y'); c.put(12, 7, 'w'); return c
def item_lamp():         # 별 랜턴
    c = Canvas(16, 16); c.blob(rect(6.6, 0.6, 9.4, 2.6), 'y'); c.blob(rrect(3.6, 2.6, 12.4, 13.6, 1.5), 'y')
    c.fill(rect(5, 4, 11, 12.4), 'z'); c.blob(rect(3, 13.4, 13, 15.4), 'y'); c.shade()
    c.fill(star_shape(8, 8.2, 2.6, 1.1), 'o'); c.put(6, 5, 'w'); return c
def item_candy():        # 별사탕 병
    c = Canvas(16, 16); c.blob(rect(5, 0.8, 11, 3), 'r'); c.blob(rrect(2.6, 3, 13.4, 15, 2.5), 'i'); c.shade()
    for (x, y, ch) in ((5, 7, 'p'), (8, 6, 'y'), (10, 9, 'g'), (6, 11, 'c'), (9, 12, 'r'), (11, 6, 'u'), (7, 9, 'z')):
        c.put(x, y, ch); c.put(x + 1, y, ch)
    c.put(4, 5, 'w'); c.put(4, 6, 'w'); return c
def item_cookie():       # 초승달 쿠키
    c = Canvas(16, 16); c.blob(lambda x, y: ell(8, 8.6, 6.6, 6.6)(x, y) and not ell(10.8, 6.8, 5.4, 5.4)(x, y), 'a'); c.shade()
    for x, y in ((4, 10), (6, 13), (3, 7), (8, 14)): c.put(x, y, 'N')
    c.put(4, 5, 'p'); c.put(10, 14, 'p'); return c

def lit(f):
    def g():
        c = f(); c.rim(); return c
    return g

SPRITES = {'bunny': lit(bunny), 'robot': lit(robot), 'cat': lit(cat), 'slime': lit(slime),
           'bunny_wave': lit(lambda: bunny('wave')), 'robot_fly': lit(lambda: robot('fly')),
           'cat_sleep': lit(cat_sleep), 'slime_jump': lit(lambda: slime('jump')),
           'villain': villain, 'bunny_vpose': lit(bunny_vpose), 'wand': wand, 'item_compact': item_compact, 'item_brooch': item_brooch, 'item_pendant': item_pendant, 'item_potion': item_potion, 'item_crystal': item_crystal, 'item_book': item_book, 'item_bow': item_bow, 'item_tiara': item_tiara, 'item_milk': item_milk, 'item_lens': item_lens, 'item_duck': item_duck, 'item_coffee': item_coffee, 'item_keycap': item_keycap, 'item_net': item_net, 'item_laptop': item_laptop, 'item_floppy': item_floppy, 'item_wrench': item_wrench, 'item_lamp': item_lamp, 'item_candy': item_candy, 'item_cookie': item_cookie, 'villain_rage': lambda: villain(True),
           'star': star, 'moon': moon, 'heartgem': heartgem, 'shooting': shooting,
           'sparkle_c': sparkle('c', 'j'), 'sparkle_p': sparkle('r', 'q'), 'sparkle_y': sparkle('y', 'z'),
           'hovercar_p': hovercar('r', 'c', 'R'), 'hovercar_c': hovercar('c', 'r', 'C')}

def to_svg(rows, px=None):
    w, h = len(rows[0]), len(rows)
    paths = {}
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch != '.': paths.setdefault(ch, []).append(f"M{x} {y}h1v1h-1z")
    body = ''.join(f'<path fill="{PALETTE[ch]}" d="{"".join(d)}"/>' for ch, d in paths.items())
    size = f' width="{w * px}" height="{h * px}"' if px else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}"{size} '
            f'shape-rendering="crispEdges">{body}</svg>')

def main():
    mode, out = sys.argv[1], sys.argv[2]
    built = {n: f().rows() for n, f in SPRITES.items()}
    for n, rows in built.items():
        for r in rows:
            for ch in r: assert ch == '.' or ch in PALETTE, (n, ch)
    if mode == 'preview':
        cells = ''.join(f'<div style="text-align:center;font:12px monospace;color:#c4bcf2">{to_svg(r, 6 if len(r[0]) >= 32 else 8)}<br>{n}</div>'
                        for n, r in built.items())
        with open(out, 'w') as f:
            f.write('<!doctype html><meta charset="utf-8"><body style="margin:0;padding:20px;background:#1a1240;'
                    f'display:flex;flex-wrap:wrap;gap:24px;align-items:flex-end;width:1200px">{cells}</body>')
    else:
        root = out
        with open(os.path.join(root, '_data/pixel_palette.yml'), 'w') as f:
            f.write("# 스프라이트 문자 -> 색. '.' 는 투명. _data/sprites.yml 의 rows 가 이 문자를 쓴다.\n")
            for k, v in PALETTE.items(): f.write(f'"{k}": "{v}"\n')
        with open(os.path.join(root, '_data/sprites.yml'), 'w') as f:
            f.write("# 픽셀 스프라이트 — rows 는 문자 격자('.' 투명). 렌더링은 _includes/sprite.html, 색은 _data/pixel_palette.yml.\n")
            f.write("# 캐릭터 32x32 · 아이콘 16x16 · 구름 32x16. 새 캐릭터는 같은 모양으로 항목 하나 추가.\n")
            for n, rows in built.items():
                f.write(f"{n}:\n  w: {len(rows[0])}\n  h: {len(rows)}\n  rows:\n")
                for r in rows: f.write(f'    - "{r}"\n')
        # CSS 배경으로 쓰는 반짝이(창 모서리 장식)
        for name, key in (('sparkle-gold', 'sparkle_y'), ('sparkle-pink', 'sparkle_p')):
            with open(os.path.join(root, f'assets/pixel/{name}.svg'), 'w') as f: f.write(to_svg(built[key]) + '\n')
    print('ok', {n: f'{len(r[0])}x{len(r)}' for n, r in built.items()})

if __name__ == '__main__':
    main()
