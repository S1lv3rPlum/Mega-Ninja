# Sprites for the Cursed Hollow: six fairies (bright), six corrupted guardians (dark, with the fairy's colour in their eyes),
# a thorn cage, a dark wisp, the rainbow fairy and the Fairy Charm is an item icon (no sprite). Run: python3 make_hollow_assets.py
from PIL import Image
OUT = 'public/assets/sprites/'
COLORS = {
    'red': (230, 60, 70), 'orange': (255, 150, 40), 'yellow': (255, 220, 60),
    'green': (80, 200, 90), 'blue': (70, 140, 255), 'purple': (170, 90, 230),
}
def lighter(c, k=0.55): return tuple(int(v + (255 - v) * k) for v in c) + (255,)
def solid(c): return tuple(c) + (255,)
def px(im, pts, c):
    for x, y in pts:
        if 0 <= x < 16 and 0 <= y < 16: im.putpixel((x, y), c)

WING = [(2, 5), (3, 4), (3, 5), (4, 5), (2, 6), (3, 6), (4, 6), (3, 7), (4, 7), (4, 8)]
def mirror(pts): return [(15 - x, y) for x, y in pts]
BODY = [(7, 6), (8, 6), (7, 7), (8, 7), (7, 8), (8, 8), (7, 9), (8, 9), (6, 8), (9, 8)]
HEAD = [(7, 3), (8, 3), (6, 4), (7, 4), (8, 4), (9, 4), (7, 5), (8, 5), (6, 5), (9, 5)]
LEGS = [(7, 10), (8, 10), (7, 11), (8, 11)]

def fairy(c, wing_c, body_c, eye_c, glow=True):
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    if glow: px(im, [(1, 2), (14, 2), (12, 13), (3, 12), (8, 1)], lighter(c, 0.8))
    px(im, WING + mirror(WING), wing_c)
    px(im, HEAD, (252, 224, 196, 255) if glow else (60, 40, 70, 255))
    px(im, [(6, 3), (9, 3), (7, 2), (8, 2)], body_c)  # hair / hood
    px(im, BODY, body_c)
    px(im, LEGS, body_c)
    px(im, [(7, 5), (8, 5)], eye_c)
    return im

for name, c in COLORS.items():
    fairy(c, lighter(c, 0.45), solid(c), (60, 40, 40, 255)).save(OUT + f'fairy-{name}.png')
    # corrupted guardian: dark body, ragged dark wings, glowing eyes in the fairy's colour, little thorns
    g = fairy(c, (60, 30, 80, 255), (40, 24, 56, 255), solid(c), glow=False)
    px(g, [(5, 2), (10, 2), (4, 11), (11, 11), (6, 12), (9, 12)], (90, 40, 110, 255))
    g.save(OUT + f'guard-{name}.png')

# thorn cage: brown arching thorns with a dim glow inside
cage = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
T = (96, 56, 40, 255); T2 = (60, 30, 28, 255)
for x in range(2, 14):
    px(cage, [(x, 2), (x, 13)], T)
for y in range(2, 14):
    px(cage, [(2, y), (13, y)], T)
for x in (5, 8, 10):
    for y in range(3, 13): px(cage, [(x, y)], T2)
px(cage, [(1, 1), (14, 1), (1, 14), (14, 14), (7, 0), (8, 15)], T2)
px(cage, [(6, 6), (7, 6), (6, 7), (7, 7), (9, 8), (9, 9)], (200, 180, 255, 255))
cage.save(OUT + 'fairy-cage.png')

# dark wisp
w = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
for y in range(4, 13):
    for x in range(4, 12):
        if (x - 7.5) ** 2 / 14 + (y - 8) ** 2 / 17 < 1: w.putpixel((x, y), (54, 30, 80, 255))
px(w, [(5, 5), (10, 5), (4, 12), (11, 12), (7, 13), (8, 14)], (54, 30, 80, 255))
px(w, [(6, 7), (9, 7)], (255, 90, 160, 255))
px(w, [(7, 10), (8, 10)], (20, 10, 30, 255))
w.save(OUT + 'wisp.png')

# rainbow fairy: bands of every colour in the wings, white dress, a golden crown
r = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
order = ['red', 'orange', 'yellow', 'green', 'blue', 'purple']
side = [(0, 4), (1, 3), (2, 3), (3, 3), (1, 4), (2, 4), (3, 4), (4, 4),
        (0, 5), (1, 5), (2, 5), (3, 5), (4, 5), (1, 6), (2, 6), (3, 6), (4, 6), (2, 7), (3, 7), (4, 7), (3, 8), (4, 8), (4, 9)]
for i, (x, y) in enumerate(side):
    col = solid(COLORS[order[(y - 3 + (x // 2)) % 6]])
    px(r, [(x, y), (15 - x, y)], col)
px(r, HEAD, (252, 230, 210, 255))
px(r, BODY + LEGS, (250, 250, 255, 255))
px(r, [(7, 1), (8, 1), (6, 2), (7, 2), (8, 2), (9, 2), (5, 2), (10, 2)], (255, 210, 60, 255))
px(r, [(7, 5), (8, 5)], (80, 60, 120, 255))
px(r, [(5, 10), (10, 10), (6, 11), (9, 11)], (250, 250, 255, 255))
r.save(OUT + 'rainbow-fairy.png')
print('hollow sprites done')
