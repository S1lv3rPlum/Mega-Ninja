# Sprites for the snowy pines (Frozen Peaks) and the travelling tinker. Run: python3 make_tinker_pines.py
from PIL import Image
OUT = 'public/assets/sprites/'
def px(im, pts, c):
    for x, y in pts: im.putpixel((x, y), c)
def rect(im, x0, y0, x1, y1, c):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1): im.putpixel((x, y), c)

# ---- snow pine: three tiers of dark green with snow on the tips, brown trunk
pine = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
G1, G2, SN, TR, OUTL = (38, 92, 70, 255), (58, 124, 92, 255), (236, 246, 250, 255), (104, 70, 44, 255), (18, 52, 44, 255)
tiers = [(0, 5, 3), (4, 9, 5), (8, 12, 7)]   # (top y, bottom y, half-width at the bottom)
for top, bot, hw in tiers:
    for y in range(top, bot + 1):
        w = 1 + (y - top) * hw // max(1, bot - top)
        w = min(w, hw)
        for x in range(8 - w, 8 + w):
            im_c = G2 if (x + y) % 5 == 0 else G1
            pine.putpixel((x, y), im_c)
        pine.putpixel((8 - w - 1 if 8 - w - 1 >= 0 else 0, y), OUTL)
        pine.putpixel((8 + w if 8 + w < 16 else 15, y), OUTL)
# snow on each tier's top edge
for top, bot, hw in tiers:
    px(pine, [(7, top), (8, top)], SN)
    px(pine, [(6, top + 1), (7, top + 1), (8, top + 1), (9, top + 1)], SN)
px(pine, [(5, 5), (10, 5), (3, 9), (12, 9), (1, 12), (14, 12)], SN)
rect(pine, 7, 13, 8, 15, TR)
pine.save(OUT + 'snow-pine.png')

# ---- stump with a snow cap
st = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
rect(st, 4, 9, 11, 14, (104, 70, 44, 255)); rect(st, 5, 8, 10, 9, (170, 128, 80, 255))
rect(st, 4, 7, 11, 8, SN); px(st, [(3, 8), (12, 8)], SN)
rect(st, 4, 14, 11, 14, (70, 46, 30, 255))
st.save(OUT + 'snow-pine-stump.png')

# ---- tinker: orange cap with goggles, grey apron, tool belt
t = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
CAP, SKIN, GOG, APR, BELT, LEG = (222, 130, 40, 255), (240, 200, 160, 255), (110, 190, 220, 255), (150, 156, 170, 255), (110, 74, 44, 255), (70, 56, 48, 255)
rect(t, 4, 1, 11, 3, CAP); rect(t, 3, 3, 12, 3, CAP)
rect(t, 5, 4, 10, 7, SKIN)
rect(t, 5, 4, 7, 5, GOG); rect(t, 8, 4, 10, 5, GOG); px(t, [(6, 4), (9, 4)], (255, 255, 255, 255))
rect(t, 3, 8, 12, 13, APR); rect(t, 3, 11, 12, 11, BELT)
px(t, [(5, 11), (7, 11), (9, 11)], (220, 220, 230, 255))   # little tools in the belt
rect(t, 5, 14, 7, 15, LEG); rect(t, 9, 14, 11, 15, LEG)
t.save(OUT + 'tinker.png')
