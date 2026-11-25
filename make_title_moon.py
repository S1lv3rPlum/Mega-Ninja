"""Title background: night sky with a cratered moon whose craters make a NINJA FACE (headband, angry eyes, mask).
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
seas = []  # the face is drawn with the headband and the mask below, not with seas
craters = [  # (dx, dy, radius)
    # (the eyes, brows, headband knot and mask are drawn by hand below)
    # a few plain craters on the cloth and the sky side
    (-25, 5, 4), (25, 6, 3), (-7, -25, 4), (13, -24, 3), (-28, -13, 2), (1, 4, 2), (-31, 2, 2), (30, -2, 2),
    (-8, 22, 3), (10, 25, 3), (-18, 18, 2), (20, 19, 3), (-22, -24, 3), (4, -27, 2), (-1, 15, 2),
]
def sea_amount(dx, dy):
    a = 0.0
    for sx, sy, r in seas:
        d = math.hypot(dx - sx, dy - sy)
        if d < r:
            a = max(a, 1 - d / r)
    return a

def band(dx, dy):
    # (headband amount, mask amount): soft edged
    hb = max(0.0, min(1.0, 1 - (abs(dy + 15) - 2.5) / 1.5)) if abs(dx) < MR else 0.0
    mk = max(0.0, min(1.0, (dy - (11 + dx * dx / 70.0)) / 2.0 + 0.5))
    return hb, mk

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
        hb, mk = band(dx, dy)
        if hb > 0:
            col = mix(col, (176, 70, 74), hb * 0.62)  # red headband
        if mk > 0:
            col = mix(col, (112, 108, 128), mk * 0.72)  # dark cloth mask over the lower face
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


# ---- the face, drawn by hand on top of the craters ----
def put(x, y, col, t=1.0):
    if (x, y) in moon:
        moon[(x, y)] = mix(moon[(x, y)], col, t)
def ellipse(cx, cy, ax, ay, ang, fill, rim):
    ca, sa = math.cos(ang), math.sin(ang)
    for y in range(cy - 10, cy + 11):
        for x in range(cx - 10, cx + 11):
            ox, oy = x - cx, y - cy
            u, v = ox * ca + oy * sa, -ox * sa + oy * ca
            q = (u / ax) ** 2 + (v / ay) ** 2
            if q <= 1:
                put(x, y, fill, 0.92)
                if v > ay * 0.35:  # lit lower wall, like the other craters
                    put(x, y, (255, 250, 232), 0.4)
            elif q <= 1.5 and (ox * LIGHT[0] + oy * LIGHT[1]) < 0:
                put(x, y, rim, 0.5)
# fierce slanted eyes: outer ends up, inner ends down
ellipse(MCX - 12, MCY - 1, 7.5, 3.4, math.radians(22), (64, 58, 70), (255, 252, 238))
ellipse(MCX + 12, MCY - 1, 7.5, 3.4, math.radians(-22), (64, 58, 70), (255, 252, 238))
# a tiny bright glint in each eye
for gx in (-14, 10):
    put(MCX + gx, MCY - 2, (255, 250, 235), 0.9)
# thick angry brows
def line(x0, y0, x1, y1, col, w=2, t=0.85):
    n = max(abs(x1 - x0), abs(y1 - y0)) * 2
    for i in range(n + 1):
        x = x0 + (x1 - x0) * i / n; y = y0 + (y1 - y0) * i / n
        for k in range(w):
            put(round(x), round(y) + k, col, t)
line(MCX - 22, MCY - 10, MCX - 6, MCY - 5, (84, 78, 84))
line(MCX + 22, MCY - 10, MCX + 6, MCY - 5, (84, 78, 84))
# the headband knot on the right, with two tails
for (kx, ky, kr) in ((MCX + 25, MCY - 15, 3),):
    for y in range(ky - kr, ky + kr + 1):
        for x in range(kx - kr, kx + kr + 1):
            if math.hypot(x - kx, y - ky) <= kr + 0.3: put(x, y, (150, 44, 52), 0.9)
line(MCX + 27, MCY - 13, MCX + 32, MCY - 6, (150, 44, 52), 2, 0.9)
line(MCX + 26, MCY - 12, MCX + 29, MCY - 3, (150, 44, 52), 2, 0.9)
# a cloth fold across the mask
for x in range(MCX - 26, MCX + 27):
    dx = x - MCX
    y = MCY + round(11 + dx * dx / 70.0) + 1
    put(x, y, (86, 82, 100), 0.55)
    put(x, y + 1, (255, 252, 240), 0.18)

for (x, y), c in moon.items():
    px[x, y] = c

img.save(OUT)
print('wrote', OUT)
