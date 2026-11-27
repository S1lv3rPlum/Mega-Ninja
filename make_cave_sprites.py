# Sprites for the cave teacher (a map-maker with a rolled-up map and a green hat) and the treasure chest.
# Run: python3 make_cave_sprites.py
from PIL import Image
OUT = 'public/assets/sprites/'
def px(im, pts, c):
    for x, y in pts: im.putpixel((x, y), c)
def rect(im, x0, y0, x1, y1, c):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1): im.putpixel((x, y), c)

t = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
HAT, BAND, SKIN, COAT, SCROLL, LEG, BEARD = (58, 130, 84, 255), (230, 200, 90, 255), (240, 200, 160, 255), (120, 90, 150, 255), (236, 222, 180, 255), (70, 56, 48, 255), (230, 230, 236, 255)
rect(t, 4, 0, 11, 2, HAT); rect(t, 2, 3, 13, 3, HAT); rect(t, 4, 2, 11, 2, BAND)
rect(t, 5, 4, 10, 7, SKIN); px(t, [(6, 5), (9, 5)], (30, 30, 40, 255))
rect(t, 5, 7, 10, 8, BEARD)
rect(t, 3, 8, 12, 13, COAT)
rect(t, 10, 8, 14, 12, SCROLL); rect(t, 10, 8, 14, 8, (190, 170, 120, 255)); rect(t, 10, 12, 14, 12, (190, 170, 120, 255))
px(t, [(11, 10), (12, 10), (13, 10)], (150, 90, 70, 255))   # a little red line on the map
rect(t, 5, 14, 7, 15, LEG); rect(t, 9, 14, 11, 15, LEG)
t.save(OUT + 'cavemaster.png')

W, WD, GOLD, DK = (150, 100, 56, 255), (104, 68, 40, 255), (240, 200, 70, 255), (60, 40, 24, 255)
def chest(open_):
    c = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    if not open_:
        rect(c, 2, 5, 13, 8, W); rect(c, 2, 5, 13, 5, (190, 130, 76, 255))     # lid
        rect(c, 2, 9, 13, 14, WD)                                                # body
        rect(c, 7, 7, 8, 10, GOLD); rect(c, 7, 8, 8, 9, (255, 236, 130, 255))   # lock
        rect(c, 2, 5, 3, 14, GOLD); rect(c, 12, 5, 13, 14, GOLD)                 # bands
        rect(c, 2, 14, 13, 14, DK)
    else:
        rect(c, 2, 1, 13, 4, W); rect(c, 2, 1, 13, 1, (190, 130, 76, 255)); rect(c, 2, 1, 3, 4, GOLD); rect(c, 12, 1, 13, 4, GOLD)  # lid up
        rect(c, 2, 5, 13, 6, (30, 20, 16, 255))                                  # dark inside
        rect(c, 4, 4, 11, 6, GOLD); px(c, [(5, 4), (8, 3), (10, 4), (7, 5)], (255, 244, 170, 255)); px(c, [(6, 5), (9, 5)], (120, 200, 255, 255))
        rect(c, 2, 7, 13, 14, WD); rect(c, 2, 7, 3, 14, GOLD); rect(c, 12, 7, 13, 14, GOLD); rect(c, 2, 14, 13, 14, DK)
    return c
chest(False).save(OUT + 'chest.png')
chest(True).save(OUT + 'chest-open.png')
