"""Builds the Desert and the Bazaar: maps desert.json + bazaar.json, desert-tiles.png + bazaar-tiles.png, sprites, and data.
Run from the project folder: python3 make_desert_assets.py
Run make_crystal_assets.py first (it makes the sealed archway that leads here). Order: cave, crystal, market, peaks, ruins, desert."""
import json, random
from collections import deque
from PIL import Image

A = 'public/assets'
random.seed(61)

def sprite(rows, pal, path):
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch in pal:
                im.putpixel((x, y), pal[ch])
    im.save(path)

# ---------------------------------------------------------------- sprites
sprite([
    "................",
    "..........kk....",
    ".........kook...",
    "........kok.ok..",
    "...kkk..kook.k..",
    "..kooookkook....",
    ".kooooooooook...",
    ".kowwoooooook...",
    "..kkoooooook....",
    "..k.k.k.k.k.....",
    ".k..k.k.k..k....",
    "................",
    "................", "................", "................", "................",
], {'k': (80, 40, 20, 255), 'o': (210, 150, 70, 255), 'w': (255, 255, 255, 255)}, f'{A}/sprites/scorpion.png')
sprite([
    "................",
    "................",
    "................",
    "...kk...........",
    "..kggk..........",
    ".kgwgggkkkkkk...",
    ".kggggggggggggk.",
    "..kggyggyggggggk",
    "...kgggggggggk..",
    "...kg.kg.kg.k...",
    "...kk.kk.kk.....",
    "................",
    "................", "................", "................", "................",
], {'k': (60, 80, 30, 255), 'g': (150, 200, 80, 255), 'w': (255, 255, 255, 255), 'y': (250, 220, 90, 255)}, f'{A}/sprites/sandlizard.png')
sprite([
    "....k......k....",
    "...kok....kok...",
    "...kook..kook...",
    "..kkooook.okk...",
    ".kooookkkoooook.",
    "kooookooooookooo",
    "kooowwoooowwooo.",
    "kooowwoooowwooo.",
    ".koooooyyooook..",
    "..kooooooooook..",
    "..kkoookkoookk..",
    ".kokkookkookkok.",
    "kok.kokkkkok.kok",
    "kk..k..kk..k..kk",
    "................",
    "................",
], {'k': (70, 20, 20, 255), 'o': (200, 80, 50, 255), 'w': (255, 255, 255, 255), 'y': (255, 220, 90, 255)}, f'{A}/sprites/scorpionking.png')
def cactus(path, fruit):
    rows = [
        "................",
        "......kk........",
        ".....kggk.......",
        ".kk..kggk..kk...",
        "kggk.kggk.kggk..",
        "kggk.kggkkggk...",
        ".kggkkggggggk...",
        "..kkkkggggkk....",
        "....kkggggk.....",
        "....kggfggk.....",
        "....kggggk......",
        "....kggggk......",
        ".....kkkk.......",
        "................", "................", "................",
    ]
    if not fruit:
        rows = [r.replace('f', 'g') for r in rows]
    sprite(rows, {'k': (20, 70, 40, 255), 'g': (70, 170, 90, 255), 'f': (240, 90, 160, 255)}, path)
cactus(f'{A}/sprites/cactus-fruit.png', True)
cactus(f'{A}/sprites/cactus-fruit-bare.png', False)
sprite([
    "................",
    "................",
    ".....kkkkkk.....",
    "....kssssssk....",
    "...kssyyyyssk...",
    "...ksyyyyyysk...",
    "..kkyyyyyyyykk..",
    ".kssyyyyyyyyssk.",
    ".kssssssssssssk.",
    "..kkkssssssskk..",
    "....kkkkkkkk....",
    "................", "................", "................", "................", "................",
], {'k': (110, 90, 40, 255), 's': (190, 160, 90, 255), 'y': (255, 200, 60, 255)}, f'{A}/sprites/rock-sun.png')
# the princess: a small figure with a crown and a long dress
sprite([
    "................",
    "....y.y.y.......",
    "....yyyyy.......",
    "....kkkkk.......",
    "...kpskpsk......",
    "...kppppk.......",
    "....kkkk........",
    "...kddddk.......",
    "..kddwddwdk.....",
    "..kdddddddk.....",
    "..kdddddddk.....",
    ".kdddddddddk....",
    ".kdddddddddk....",
    ".kkkkkkkkkkk....",
    "................", "................",
], {'k': (40, 20, 60, 255), 'y': (255, 215, 70, 255), 'p': (255, 215, 180, 255), 's': (60, 40, 30, 255), 'd': (120, 80, 200, 255), 'w': (255, 255, 255, 255)}, f'{A}/sprites/princess.png')
def hooded(cloak, trim, path):
    rows = [
        "................", "......kkkk......", ".....kccccck....", "....kcccccck....", "....kcckkcck....", "....kcyykyck....", "....kcckkcck....",
        ".....kccccck....", "....kcctttcck...", "...kccctttccck..", "...kcccttcccck..", "...kccccccccck..", "...kccccccccck..", "....kcccccccck..",
        "....kkkkkkkkkk..", "................",
    ]
    sprite(rows, {'k': (40, 24, 10, 255), 'c': cloak, 't': trim, 'y': (255, 220, 90, 255)}, path)
hooded((190, 120, 40, 255), (255, 230, 150, 255), f'{A}/sprites/bzsmith.png')
hooded((170, 50, 50, 255), (255, 200, 160, 255), f'{A}/sprites/bzspice.png')
hooded((60, 130, 150, 255), (190, 250, 255, 255), f'{A}/sprites/bzgem.png')

# ---------------------------------------------------------------- tilesets
def mk(fs, path):
    sheet = Image.new('RGBA', (16 * len(fs), 16))
    for i, f in enumerate(fs):
        im = Image.new('RGBA', (16, 16))
        for y in range(16):
            for x in range(16):
                im.putpixel((x, y), f(x, y))
        sheet.paste(im, (i * 16, 0))
    sheet.save(path)
def sand(x, y, dark=False):
    v = ((x * 7 + y * 11) % 9)
    if dark:
        return (205 + v, 170 + v, 100, 255)
    return (232 + v, 200 + v, 130 + v, 255)
def cliff(x, y):
    base = (180, 120, 70, 255)
    if y % 6 < 2:
        base = (150, 96, 56, 255)
    if y < 3:
        base = (225, 170, 110, 255)
    return base
def cactus_t(x, y):
    d = abs(x - 7.5)
    if d < 2.2 and y > 2:
        return (70, 170, 90, 255)
    if (3 < y < 9) and (abs(x - 3.5) < 1.6 or abs(x - 11.5) < 1.6):
        return (70, 170, 90, 255)
    return sand(x, y)
def palm(x, y):
    if abs(x - 7.5) < 1.2 and y > 6:
        return (130, 90, 50, 255)
    dd = ((x - 7.5) ** 2 + (y - 4) ** 2) ** 0.5
    if dd < 6.5 and y < 8:
        return (60, 160, 70, 255) if (x + y) % 3 else (40, 120, 50, 255)
    return sand(x, y)
def water(x, y):
    return (60, 150, 200, 255) if (x * 2 + y) % 8 else (110, 190, 230, 255)
def arch(x, y):
    d = abs(x - 7.5) + abs(y - 7.5)
    return (40, 24, 20, 255) if d < 10 else sand(x, y)
def pathy(x, y):
    return (200, 170, 120, 255) if (x * 5 + y * 3) % 6 else (180, 150, 100, 255)
mk([lambda x, y: sand(x, y), lambda x, y: sand(x, y, True), cliff, cactus_t, palm, water, arch, pathy], f'{A}/tilesets/desert-tiles.png')
SAND, SAND2, CLIFF, CACTUS, PALM, WATER, ARCH, PATH = 1, 2, 3, 4, 5, 6, 7, 8

def flag(x, y, lite=0):
    seam = (x % 8 == 0) or (y % 8 == 0)
    if seam:
        return (150, 110, 70, 255)
    v = (x * 3 + y * 5) % 7
    return (206 + v * 2 + lite, 172 + v * 2 + lite, 120 + lite, 255)
def lamp(x, y):
    d = ((x - 7.5) ** 2 + (y - 7.5) ** 2) ** 0.5
    if d < 2.2:
        return (255, 240, 160, 255)
    c = flag(x, y)
    if d < 6:
        k = (6 - d) / 6
        return (min(255, int(c[0] + 40 * k)), min(255, int(c[1] + 40 * k)), min(255, int(c[2] + 10 * k)), 255)
    return c
def awning(c1, c2):
    def f(x, y):
        base = c1 if (x // 4) % 2 == 0 else c2
        return (base[0] // 2, base[1] // 2, base[2] // 2, 255) if y >= 13 else base + (255,)
    return f
def bwall(x, y):
    base = (200, 150, 100, 255)
    if y % 8 == 0 or (x + (4 if (y // 8) % 2 else 0)) % 8 == 0:
        base = (160, 112, 70, 255)
    return base
def counter(x, y):
    if y < 4:
        return (190, 130, 80, 255)
    return (140, 90, 56, 255) if y < 6 else (100, 64, 40, 255)
def rug(x, y):
    return (170, 40, 60, 255) if (x + y) % 4 else (230, 190, 90, 255)
mk([lambda x, y: flag(x, y), lambda x, y: flag(x, y, 10), lamp, awning((230, 140, 40), (170, 90, 20)), awning((200, 60, 60), (240, 230, 220)),
    bwall, counter, rug], f'{A}/tilesets/bazaar-tiles.png')
BFLOOR, BFLOOR2, BLAMP, AW1, AW2, BWALL, COUNTER, RUG = 1, 2, 3, 4, 5, 6, 7, 8

# ---------------------------------------------------------------- helpers
def props(**kw):
    out = []
    for k, v in kw.items():
        t = 'int' if isinstance(v, int) and not isinstance(v, bool) else 'string'
        out.append({'name': k, 'type': t, 'value': v})
    return out
oid = [1200]
def obj(name, x, y, **kw):
    oid[0] += 1
    return {'height': 16, 'id': oid[0], 'name': name, 'properties': props(**kw), 'rotation': 0, 'type': '', 'visible': True,
            'width': 16, 'x': x * 16, 'y': y * 16}
def layers(ground, obst, W, H, doors, npcs, targets=None, enemies=None):
    L = [
        {'data': ground, 'height': H, 'width': W, 'id': 1, 'name': 'ground', 'opacity': 1, 'type': 'tilelayer', 'visible': True, 'x': 0, 'y': 0},
        {'data': obst, 'height': H, 'width': W, 'id': 2, 'name': 'obstacles', 'opacity': 1, 'type': 'tilelayer', 'visible': True, 'x': 0, 'y': 0},
        {'draworder': 'topdown', 'id': 3, 'name': 'doors', 'objects': doors, 'opacity': 1, 'type': 'objectgroup', 'visible': True, 'x': 0, 'y': 0},
        {'draworder': 'topdown', 'id': 4, 'name': 'npcs', 'objects': npcs, 'opacity': 1, 'type': 'objectgroup', 'visible': True, 'x': 0, 'y': 0},
    ]
    if targets is not None:
        L.append({'draworder': 'topdown', 'id': 5, 'name': 'targets', 'objects': targets, 'opacity': 1, 'type': 'objectgroup', 'visible': True, 'x': 0, 'y': 0})
    if enemies is not None:
        L.append({'draworder': 'topdown', 'id': 6, 'name': 'enemies', 'objects': enemies, 'opacity': 1, 'type': 'objectgroup', 'visible': True, 'x': 0, 'y': 0})
    return L
def mapjson(W, H, tileset, count, layers_, nextid):
    return {'compressionlevel': -1, 'height': H, 'width': W, 'infinite': False, 'orientation': 'orthogonal', 'renderorder': 'right-down',
            'tiledversion': '1.10.2', 'tileheight': 16, 'tilewidth': 16, 'type': 'map', 'version': '1.10', 'nextlayerid': 8, 'nextobjectid': nextid,
            'tilesets': [{'columns': count, 'firstgid': 1, 'image': f'../tilesets/{tileset}.png', 'imageheight': 16, 'imagewidth': 16 * count,
                          'margin': 0, 'name': tileset, 'spacing': 0, 'tilecount': count, 'tileheight': 16, 'tilewidth': 16}], 'layers': layers_}

# ---------------------------------------------------------------- the desert (44 x 30)
W, H = 44, 30
ground = [SAND] * (W * H)
obst = [0] * (W * H)
def idx(x, y): return y * W + x
for y in range(H):
    for x in range(W):
        if (x * 5 + y * 7) % 11 == 0:
            ground[idx(x, y)] = SAND2
        if x in (0, W - 1) or y in (0, H - 1):
            obst[idx(x, y)] = CLIFF
def rect(g, x0, y0, x1, y1, v):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            g[idx(x, y)] = v
rect(obst, 14, 1, 14, 12, CLIFF); rect(obst, 14, 18, 14, 28, CLIFF)              # the west ridge with a gap at y 13..17
rect(obst, 20, 10, 26, 15, WATER); rect(ground, 20, 10, 26, 15, WATER)           # the oasis pool
rect(obst, 30, 19, 41, 19, CLIFF); rect(obst, 30, 28, 41, 28, CLIFF)              # the Scorpion King's pit
rect(obst, 30, 19, 30, 28, CLIFF); rect(obst, 41, 19, 41, 28, CLIFF)
for x in (34, 35, 36):
    obst[idx(x, 19)] = 0
for (x0, y0, x1, y1) in [(15, 15, 40, 15)]:                                      # a worn path east
    pass
# palms around the oasis, cacti in the open sand
for (x, y) in [(19, 9), (27, 9), (19, 16), (27, 16), (23, 9), (23, 16), (19, 12), (27, 12)]:
    obst[idx(x, y)] = PALM
keep = {(1, 15), (2, 15), (42, 5), (41, 5), (43, 5)}
for _ in range(90):
    x, y = random.randint(2, W - 3), random.randint(2, H - 3)
    if obst[idx(x, y)] or (x, y) in keep or ground[idx(x, y)] in (WATER,):
        continue
    if 29 <= x <= 42 and 18 <= y <= 29:     # keep the pit clear
        continue
    if any(abs(x - a) + abs(y - b) < 3 for a, b in [(1, 15), (42, 5), (14, 15), (34, 18)]):
        continue
    obst[idx(x, y)] = CACTUS
ground[idx(0, 15)] = ARCH; obst[idx(0, 15)] = 0
ground[idx(43, 5)] = ARCH; obst[idx(43, 5)] = 0

def free(x, y): return 0 <= x < W and 0 <= y < H and obst[idx(x, y)] in (0,)
def clear(cells):
    for (x, y) in cells:
        if obst[idx(x, y)] in (CACTUS, PALM):
            obst[idx(x, y)] = 0
        assert free(x, y) and ground[idx(x, y)] != WATER, (x, y)
bushes = [(4, 8), (6, 22), (10, 11), (10, 20), (18, 5), (18, 25), (22, 6), (22, 20), (28, 6), (38, 8), (33, 13), (12, 26)]
foxes = []
lizards = [(8, 12), (11, 18), (17, 13), (24, 8), (28, 22 - 8)]
scorp = [(6, 16), (16, 8), (17, 22), (24, 20), (31, 10), (38, 13), (36, 24)]
rocks_pos = [(3, 12), (3, 19), (12, 6), (12, 24), (21, 4), (21, 25), (30, 4), (39, 3), (39, 15), (32, 25 - 12)]
king = (35, 23)
clear(bushes + lizards + scorp + rocks_pos + [king])
targets = [obj(f'cact{i}', x, y, id=f'cact{i}', texture='cactus-fruit', tool='', variants='forageDesert', hits=1, respawnMs=90000,
               stump='cactus-fruit-bare', clearedMsg='Picked!') for i, (x, y) in enumerate(bushes)]
targets += [obj(f'drock{i}', x, y, id=f'drock{i}', texture='rock-sun', tool='pickaxe', variants='desertRocks', hits=3, respawnMs=120000,
                stump='rubble', hint='You need a pickaxe to break that rock.') for i, (x, y) in enumerate(rocks_pos)]
enemies = [obj(f'lizard{i}', x, y, id=f'lizard{i}', type='sandlizard') for i, (x, y) in enumerate(lizards)]
enemies += [obj(f'scorp{i}', x, y, id=f'scorp{i}', type='scorpion') for i, (x, y) in enumerate(scorp)]
enemies.append(obj('scorpionking', king[0], king[1], id='scorpionking', type='scorpionking', hideIfFlag='scorpionking_defeated'))
clear([(3, 15), (41, 5)])
npcs = [obj('desertsign', 3, 15, id='desertsign', texture='sign', dialogue='desertsign'),
        obj('bazaarsign', 41, 5, id='bazaarsign', texture='sign', dialogue='bazaarsign')]
doors = [obj('to-crystal', 0, 15, toMap='crystal', toX=30, toY=13), obj('to-bazaar', 43, 5, toMap='bazaar', toX=16, toY=21)]
desert = mapjson(W, H, 'desert-tiles', 8, layers(ground, obst, W, H, doors, npcs, targets, enemies), oid[0] + 1)
# reachability
blocked = {(o['x'] // 16, o['y'] // 16) for o in targets + npcs}
seen, q = {(1, 15)}, deque([(1, 15)])
while q:
    x, y = q.popleft()
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        nx, ny = x + dx, y + dy
        if free(nx, ny) and (nx, ny) not in seen and (nx, ny) not in blocked and (nx, ny) not in {(0, 15), (43, 5)}:
            seen.add((nx, ny)); q.append((nx, ny))
assert (42, 5) in seen, 'bazaar door reachable'
assert (35, 22) in seen, 'pit reachable'
for (x, y) in bushes + lizards + scorp + rocks_pos:
    assert any((x + dx, y + dy) in seen for dx, dy in ((0, 1), (0, -1), (1, 0), (-1, 0))), ('unreachable', x, y)
json.dump(desert, open(f'{A}/maps/desert.json', 'w'), separators=(',', ':'))

# ---------------------------------------------------------------- the bazaar (34 x 24)
W, H = 34, 24
ground = [BFLOOR] * (W * H)
obst = [0] * (W * H)
for y in range(H):
    for x in range(W):
        if x in (0, W - 1) or y in (0, 1, H - 1):
            obst[idx(x, y)] = BWALL
        elif (x * 7 + y * 3) % 11 == 0:
            ground[idx(x, y)] = BFLOOR2
for (lx, ly) in [(5, 8), (13, 8), (21, 8), (29, 8), (9, 15), (25, 15), (16, 12), (4, 19), (29, 19)]:
    ground[idx(lx, ly)] = BLAMP
for (x0, y0, x1, y1) in [(14, 4, 18, 22)]:      # a long red rug down the middle
    pass
for y in range(4, H - 1):
    ground[idx(16, y)] = RUG
obst[idx(16, H - 1)] = 0; ground[idx(16, H - 1)] = RUG
stalls = {5: AW1, 12: AW2, 20: AW1, 28: AW2}
for cx, aw in stalls.items():
    for x in (cx - 1, cx, cx + 1):
        obst[idx(x, 2)] = aw
    obst[idx(cx - 1, 3)] = COUNTER; obst[idx(cx + 1, 3)] = COUNTER
for (cx, cy) in [(8, 12), (9, 12), (24, 12), (25, 12), (12, 17), (21, 17)]:
    obst[idx(cx, cy)] = COUNTER
npcs = [
    obj('bzsmith', 5, 3, id='bzsmith', texture='bzsmith', dialogue='bzsmith', smith='armor'),
    obj('bzspice', 12, 3, id='bzspice', texture='bzspice', dialogue='bzspice', shop='bzspice'),
    obj('bzgem', 20, 3, id='bzgem', texture='bzgem', dialogue='bzgem', shop='bzgem'),
    obj('princess', 28, 3, id='princess', texture='princess', dialogue='princess', giveItem='waystone-charm', giveWhen='scorpionking_defeated'),
    obj('bzcust1', 8, 9, id='bzcust1', texture='npc', dialogue='bzcust1', walkRadius=3),
    obj('bzcust2', 24, 9, id='bzcust2', texture='npc', dialogue='bzcust2', walkRadius=3),
    obj('bzcust3', 10, 19, id='bzcust3', texture='npc', dialogue='bzcust3', walkRadius=3),
    obj('bzcust4', 24, 19, id='bzcust4', texture='npc', dialogue='bzcust4', walkRadius=3),
]
doors = [obj('to-desert', 16, H - 1, toMap='desert', toX=42, toY=5)]
bazaar = mapjson(W, H, 'bazaar-tiles', 8, layers(ground, obst, W, H, doors, npcs), oid[0] + 1)
def bfree(x, y): return 0 <= x < W and 0 <= y < H and obst[idx(x, y)] == 0
npc_t = {(o['x'] // 16, o['y'] // 16) for o in npcs}
seen, q = {(16, 21)}, deque([(16, 21)])
while q:
    x, y = q.popleft()
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        nx, ny = x + dx, y + dy
        if bfree(nx, ny) and (nx, ny) not in seen and (nx, ny) not in npc_t and (nx, ny) != (16, H - 1):
            seen.add((nx, ny)); q.append((nx, ny))
for cx in stalls:
    assert (cx, 4) in seen, ('stall', cx)
json.dump(bazaar, open(f'{A}/maps/bazaar.json', 'w'), separators=(',', ':'))

# ---------------------------------------------------------------- data
ej = json.load(open('src/data/enemies.json'))
ej['scorpion'] = {'name': 'Scorpion', 'texture': 'scorpion', 'hp': 4, 'damage': 2, 'moveMs': 520, 'attackMs': 1300, 'sight': 7, 'respawnMs': 40000, 'gold': 6}
ej['sandlizard'] = {'name': 'Sand Lizard', 'texture': 'sandlizard', 'hp': 3, 'damage': 1, 'moveMs': 450, 'attackMs': 1300, 'sight': 5, 'respawnMs': 40000, 'gold': 5, 'tame': 'sandlizard'}
ej['scorpionking'] = {'name': 'Scorpion King', 'texture': 'scorpionking', 'hp': 34, 'damage': 3, 'moveMs': 560, 'attackMs': 1400, 'sight': 14,
                      'respawnMs': 31536000000, 'gold': 120, 'boss': True, 'flag': 'scorpionking_defeated',
                      'summon': {'type': 'scorpion', 'everyMs': 7500, 'max': 2},
                      'reward': {'item': 'moon-crest-half-2', 'msg': 'The Scorpion King is beaten! You got the other half of the Moon Crest!'},
                      'defeatLines': ['The Scorpion King collapses in the sand and the dark whisper hisses out of him like steam.',
                                      'Around his neck, on a cord, hangs the other half of the silver crest. He lets you take it.']}
json.dump(ej, open('src/data/enemies.json', 'w'), indent=2)
fj = json.load(open('src/data/friends.json'))
fj['kinds']['sandlizard'] = {'name': 'Sand Lizard', 'baseName': 'Dune', 'texture': 'sandlizard', 'treat': 'cactus-fruit'}
json.dump(fj, open('src/data/friends.json', 'w'), indent=2)
ij = json.load(open('src/data/items.json'))
ij['items']['sunstone'] = {'name': 'Sunstone', 'icon': 'gem', 'color': '#ffc83c', 'desc': 'A warm golden stone. Armor smiths in the bazaar prize them.'}
ij['items']['cactus-fruit'] = {'name': 'Cactus Fruit', 'icon': 'pumpkin', 'color': '#f05aa0', 'desc': 'Sweet and prickly. Sand lizards love it.'}
ij['items']['moon-crest-half-2'] = {'name': 'Moon Crest (other half)', 'icon': 'crest', 'color': '#e8d6c8', 'desc': 'The other half of the silver crest. Join it with the first half.'}
ij['items']['moon-crest'] = {'name': 'Moon Crest', 'icon': 'crest', 'color': '#ffffff', 'desc': 'The whole silver crest, glowing softly. It seems to point north.'}
json.dump(ij, open('src/data/items.json', 'w'), indent=2)
rj = json.load(open('src/data/rocks.json'))
rj['forageDesert'] = [
    {'id': 'd1', 'weight': 60, 'hits': 1, 'drop': 'cactus-fruit', 'amount': 2, 'texture': 'cactus-fruit', 'msg': 'Picked cactus fruit!'},
    {'id': 'd2', 'weight': 25, 'hits': 1, 'drop': 'herb', 'amount': 2, 'texture': 'cactus-fruit', 'msg': 'Picked some herbs!'},
    {'id': 'd3', 'weight': 15, 'hits': 1, 'drop': 'pumpkin-seeds', 'amount': 1, 'texture': 'cactus-fruit', 'msg': 'Found a pumpkin seed!'},
]
rj['desertRocks'] = [
    {'id': 'sun', 'weight': 40, 'hits': 4, 'drop': 'sunstone', 'amount': 2, 'texture': 'rock-sun', 'msg': 'Sunstones!'},
    {'id': 'copper', 'weight': 22, 'hits': 4, 'drop': 'copper', 'amount': 2, 'texture': 'rock-copper', 'msg': 'Copper ore!'},
    {'id': 'ruby', 'weight': 14, 'hits': 7, 'drop': 'ruby', 'amount': 1, 'texture': 'rock-ruby', 'msg': 'A ruby!'},
    {'id': 'emerald', 'weight': 12, 'hits': 6, 'drop': 'emerald', 'amount': 1, 'texture': 'rock-emerald', 'msg': 'An emerald!'},
    {'id': 'diamond', 'weight': 8, 'hits': 8, 'drop': 'diamond', 'amount': 1, 'texture': 'rock-diamond', 'msg': 'A DIAMOND!'},
    {'id': 'grey', 'weight': 4, 'hits': 3, 'drop': 'stone', 'amount': 2, 'texture': 'rock-grey', 'msg': 'Rock smashed!'},
]
json.dump(rj, open('src/data/rocks.json', 'w'), indent=2)
sj = json.load(open('src/data/shop.json'))
sj['general']['sell']['sunstone'] = 15
sj['general']['sell']['cactus-fruit'] = 5
treats = [('carrot', 3, 18, '3 Carrots'), ('herb', 3, 12, '3 Herbs'), ('pumpkin', 1, 50, '1 Pumpkin'), ('crystal', 1, 30, '1 Glow Crystal'),
          ('frostberry', 3, 18, '3 Frostberries'), ('seaweed', 3, 15, '3 Seaweed'), ('cactus-fruit', 3, 15, '3 Cactus Fruit')]
sj['bzspice'] = {'offers': [{'id': i, 'type': 'item', 'item': i, 'amount': n, 'label': lab, 'price': p} for i, n, p, lab in treats], 'sell': {}}
sj['bzgem'] = {'offers': [], 'sell': {'sunstone': 25, 'crystal': 22, 'sapphire': 45, 'emerald': 70, 'ruby': 110, 'diamond': 340}}
json.dump(sj, open('src/data/shop.json', 'w'), indent=2)
dj = json.load(open('src/data/dialogue.json'))
dj['desertsign'] = {'name': 'Sign', 'lines': ['THE GREAT DESERT. The bazaar lies far to the east. Beware the scorpions, and the pit to the south-east.'], 'repeatLines': ['The bazaar is east. The Scorpion King\'s pit is south-east. Do not go unprepared.']}
dj['bazaarsign'] = {'name': 'Sign', 'lines': ['THE DESERT BAZAAR. Armor, treats and gems. Follow the red rug.'], 'repeatLines': ['The Desert Bazaar is just ahead.']}
dj['bzsmith'] = {
    'name': 'Armorsmith',
    'lines': ['Welcome, traveller, to the only armor stall for a hundred miles of sand.', 'Bring me gold and sunstones from the desert rocks, and I will craft you armor fit for a hero.'],
    'offer': 'Today I could craft {name}: {desc}. Good armor takes time. Come back after you have wandered off, and it will be ready.',
    'ordered': 'Excellent! Go on, explore the dunes, and come back later.',
    'working': 'Patience, friend! The {name} is still cooling. Leave the bazaar and come back, and it will be ready.',
    'ready': 'Ah, there you are! Your {name} is finished. Wear it with pride!',
    'done': 'I have no finer armor left to craft. You wear my best work.',
    'farewell': 'The sun will wait for you.',
    'repeatLines': ['Back again? Let us see what armor I can craft for you.'],
}
dj['bzspice'] = {'name': 'Treat Seller', 'lines': ['Treats from every land! Carrots, herbs, crystals, berries, seaweed and cactus fruit. Something for every little friend.'],
                 'menu': 'Which treat?', 'farewell': 'Your friends will thank you!', 'repeatLines': ['Treats for your little friends?']}
dj['bzgem'] = {'name': 'Gem Trader', 'lines': ['Gems! Sunstones! I pay the best prices in the whole bazaar.'], 'menu': 'Selling?', 'farewell': 'Come back with more shine!', 'repeatLines': ['Got any shiny things for me?']}
dj['princess'] = {
    'name': 'Princess',
    'lines': ['Oh! You made it. You must be the ninja who followed my notes.', 'I have been hiding in this tent. The dark whisper still hunts me.',
              'I split the Moon Crest in two so it could never take both halves. The Scorpion King took the half I carried. He wears it in his pit, south-east of here.',
              'Please, if you can... beat him and bring it back. The whisper has made him furious.'],
    'repeatLines': ['The Scorpion King wears the other half in his pit, south-east of here. Be careful.'],
    'flagLines': {'scorpionking_defeated': ['You did it! You have both halves! Hold them together...',
                                           'The Moon Crest is whole again. See how it glows? It points north, past the snowy peaks, to where the moon touches the mountain.',
                                           'Take this Waystone Charm too. Touch the glowing waystones wherever you go, then open your bag and use the charm to travel back to any of them.',
                                           'That is where the dark whisper sleeps. We will go together, when you are ready. (To be continued)']},
}
dj['bzcust1'] = {'name': 'Camel Driver', 'lines': ['My camel will not walk past the armor stall. He is afraid of his own reflection.'], 'repeatLines': ['Do not tell him.']}
dj['bzcust2'] = {'name': 'Spice Merchant', 'lines': ['Cactus fruit is sweeter on the road than in the bazaar. Do not ask me why.'], 'repeatLines': ['It is true.']}
dj['bzcust3'] = {'name': 'Traveler', 'lines': ['I heard the princess is staying in the far stall, the one with the crown on the sign.'], 'repeatLines': ['Say hello for me.']}
dj['bzcust4'] = {'name': 'Little Trader', 'lines': ['A friend followed me all the way here. I named her Biscuit. She is a very good lizard.'], 'repeatLines': ['Biscuit says hello.']}
json.dump(dj, open('src/data/dialogue.json', 'w'), indent=2, ensure_ascii=False)
open('src/data/dialogue.json', 'a').write('\n')
print('desert + bazaar built')
