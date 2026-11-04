# 홈 장면(scene-night)에서 하늘을 뺀 스카이라인 → assets/pixel/skyline.png (3D 시험 스테이지의 배경판)
# 하늘을 두 가지 색으로 그려 달라진 픽셀 = 하늘(투명). 초승달은 따로 지운다. 옥상(아래 34줄)은 잘라낸다.
# 실행: cd tools/art && python3 -I gen_skyline.py ../../assets/pixel/skyline.png
import os, sys, tempfile
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # 같은 폴더의 gen_scene
import gen_scene as gs

out = sys.argv[1]
tmp = tempfile.mkdtemp()
a_path, b_path = os.path.join(tmp, 'a.png'), os.path.join(tmp, 'b.png')
gs.scene(a_path, sky_override=(0, 0, 0))
gs.scene(b_path, sky_override=(255, 0, 255))
a = Image.open(a_path).convert('RGBA'); b = Image.open(b_path).convert('RGBA')
W, H = a.size
CROP = 116  # 이 아래는 옥상(바닥·난간)
pa, pb = a.load(), b.load()
img = Image.open(a_path).convert('RGBA')
ref = Image.new('RGBA', (W, H)); gs_scene_normal = os.path.join(tmp, 'n.png'); gs.scene(gs_scene_normal)
n = Image.open(gs_scene_normal).convert('RGBA'); pn = n.load()
res = Image.new('RGBA', (W, CROP), (0, 0, 0, 0)); pr = res.load()
mx, my, mr = 272, 27, 23  # 초승달 + 번짐
for y in range(CROP):
    for x in range(W):
        if pa[x, y] != pb[x, y]: continue
        if (x - mx) ** 2 + (y - my) ** 2 <= mr * mr: continue
        pr[x, y] = pn[x, y]
res.save(out, optimize=True)
print('ok', res.size)

