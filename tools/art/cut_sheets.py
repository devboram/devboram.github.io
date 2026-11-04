# ChatGPT 원본 시트 → 사이트 에셋. 저장소 루트에서 실행: python3 -I tools/art/cut_sheets.py <원본 폴더>
# 원본 폴더 = 볼트 Projects/개인 프로젝트/devboram.github.io/리소스/원본 (파일명은 리소스 관리.md 표)
import os, sys
from PIL import Image
SRC = sys.argv[1]
A = 'assets/'

def find(name):
    return os.path.join(SRC, name)

os.makedirs(A + 'pixel/bg', exist_ok=True)
im = Image.open(find('chatgpt_page_backgrounds.png')).convert('RGB')
names = [['posts', 'projects'], ['characters', 'about'], ['guestbook', '404']]
xs = [(0, 888), (888, 1774)]
ys = [(0, 295), (295, 591), (591, 887)]
for r, (y0, y1) in enumerate(ys):
    for c, (x0, x1) in enumerate(xs):
        p = im.crop((x0 + 6, y0 + 6, x1 - 6, y1 - 6))
        p.save(A + f'pixel/bg/{names[r][c]}.jpg', quality=85, optimize=True)
        print(names[r][c], p.size)
Image.open(find('chatgpt_items_sheet.png')).convert('RGB').save(A + 'chars/sheets/items.jpg', quality=85, optimize=True)
Image.open(find('chatgpt_chibi_sheet.png')).convert('RGB').save(A + 'chars/sheets/chibi.jpg', quality=85, optimize=True)
