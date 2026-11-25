"""Title background: night sky with a detailed cratered moon and a ninja silhouette on it.
Run from the project folder:  python3 make_title_moon.py   (writes public/assets/ui/title-bg.png, 320x240)
"""
import math, random
from PIL import Image

W, H = 320, 240
OUT = 'public/assets/ui/title-bg.png'
random.seed(7)

# the vertical sky gradient from the old background (top dark indigo -> bottom purple)
top, bot = (22, 14, 74), (62, 30, 96)
img = Image.new('RGB', (W, H))
px = img.load()
for y in range(H):
    t = y / (H - 1)
    c = tuple(round(top[i] + (bot[i] - top[i]) * t) for i in range(3))
    for x in range(W):
        px[x, y] = c

# ---- stars ----
def star(x, y, c, big=False):
    if 0 <= x < W and 0 <= y < H:
        px[x, y] = c
        if big:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                if 0 <= x + dx < W and 0 <= y + dy < H:
                    px[x + dx, y + dy] = tuple((a + b) // 2 for a, b in zip(px[x + dx, y + dy], c))
MCX, MCY, MR = 252, 56, 35  # moon centre and radius
for _ in range(70):
    x, y = random.randrange(W), random.randrange(150)
    if math.hypot(x - MCX, y - MCY) < MR + 8:
        continue
    star(x, y, random.choice([(150, 150, 200), (190, 190, 230), (120, 110, 180)]))
for x, y in [(30, 22), (84, 60), (150, 18), (300, 130), (20, 120), (205, 100)]:
    star(x, y, (255, 250, 220), big=True)

# ---- moon halo ----
for y in range(H):
    for x in range(W):
        d = math.hypot(x - MCX, y - MCY)
        if MR < d < MR + 12:
            k = (1 - (d - MR) / 12) ** 2 * 0.28
            r, g, b = px[x, y]
            px[x, y] = (round(r + (235 - r) * k), round(g + (225 - g) * k), round(b + (200 - b) * k))

# ---- moon surface ----
LIGHT = (-0.6, -0.8)  # light comes from the upper left
cream = (240, 233, 208)
def mix(a, b, t): return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))

# darker "seas" (maria): soft blobs
seas = [(-12, -14, 11), (-2, 8, 12), (14, -4, 9), (-20, 6, 7), (8, 18, 8)]
craters = [  # (dx, dy, radius)
    (-22, -6, 6), (20, -18, 5), (-8, -24, 4), (24, 8, 7), (4, -8, 3), (-16, 22, 5), (16, 26, 3),
    (-28, 10, 3), (28, -4, 3), (-2, 28, 3), (10, -26, 2), (-24, -18, 3), (30, 18, 2), (-12, 4, 2), (12, 10, 2),
]
def sea_amount(dx, dy):
    a = 0.0
    for sx, sy, r in seas:
        d = math.hypot(dx - sx, dy - sy)
        if d < r:
            a = max(a, 1 - d / r)
    return a

moon = {}
for y in range(MCY - MR, MCY + MR + 1):
    for x in range(MCX - MR, MCX + MR + 1):
        dx, dy = x - MCX, y - MCY
        d = math.hypot(dx, dy)
        if d > MR - 0.4:
            continue
        # round shading: bright upper-left, a little darker towards the lower right
        shade = 0.5 + 0.5 * (-(dx * LIGHT[0] + dy * LIGHT[1]) * -1) / MR  # -1..1 -> 0..1 (light side)
        shade = max(0.0, min(1.0, 0.5 + 0.5 * ((dx * LIGHT[0] + dy * LIGHT[1]) / MR) * -1))
        col = mix((196, 188, 168), cream, shade)
        s = sea_amount(dx, dy)
        if s > 0.25:
            col = mix(col, (176, 172, 164), min(1, (s - 0.25) * 2.2) * 0.85)
        # a soft darker rim at the very edge
        if d > MR - 1.6:
            col = mix(col, (160, 152, 140), 0.5)
        moon[(x, y)] = col

# craters: shadowed upper-left inside wall, lit lower-right inside wall, bright rim on the lower right
for cdx, cdy, r in craters:
    cx, cy = MCX + cdx, MCY + cdy
    for y in range(cy - r - 1, cy + r + 2):
        for x in range(cx - r - 1, cx + r + 2):
            if (x, y) not in moon:
                continue
            ox, oy = x - cx, y - cy
            d = math.hypot(ox, oy)
            base = moon[(x, y)]
            if d <= r:
                facing = (ox * LIGHT[0] + oy * LIGHT[1]) / max(r, 1)  # >0: upper-left half
                if facing > 0.15:
                    moon[(x, y)] = mix(base, (110, 104, 100), 0.62)  # in shadow
                elif facing < -0.35:
                    moon[(x, y)] = mix(base, (255, 250, 232), 0.45)  # sunlit wall
                else:
                    moon[(x, y)] = mix(base, (160, 154, 146), 0.35)  # floor
            elif d <= r + 1.1 and (ox * LIGHT[0] + oy * LIGHT[1]) < 0 and r >= 3:
                moon[(x, y)] = mix(base, (255, 252, 238), 0.55)  # raised rim catching the light

# ---- the ninja on the moon ----
NINJA = [
    "......kkkk......",
    ".....kkkkkk.....",
    "....rrrrrrrr.rr.",
    "....kwwkkwwk..rr",
    ".....kkkkkk.....",
    "......kkkk......",
    "....kkkkkkkk..g.",
    "...kkkkkkkkkk.g.",
    "..kkkkkkkkkkkkg.",
    "..kk.kkkkkk.kg..",
    "..kk.kkkkkk.kg..",
    "..kk.kkkkkk.k...",
    "..gk.kkkkkk.kg..",
    "......kkkk......",
    ".....kkkkkk.....",
    ".....kk..kk.....",
    "....kkk..kkk....",
    "....kk....kk....",
    "...kkk....kkk...",
    "..kkkk....kkkk..",
]
PAL = {'k': (34, 28, 58), 'r': (214, 44, 44), 'w': (250, 244, 225), 'g': (150, 150, 168)}
nx0, ny0 = MCX - 8 + 1, MCY - 11 - 1
for j, row in enumerate(NINJA):
    for i, ch in enumerate(row):
        if ch == '.':
            continue
        moon[(nx0 + i, ny0 + j)] = PAL[ch]

for (x, y), c in moon.items():
    px[x, y] = c

img.save(OUT)
print('wrote', OUT)
