"""Builds the Sunken Ruins: public/assets/maps/ruins.json, ruins-tiles.png, serpent / jelly / crab / kelp / rune stone / door sprites,
and the data. Run from the project folder: python3 make_ruins_assets.py
Run make_crystal_assets.py and make_peaks_assets.py first (they make the doors that lead here)."""
import json, random
from collections import deque
from PIL import Image

A = 'public/assets'
random.seed(47)

def sprite(rows, pal, path):
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch in pal:
                im.putpixel((x, y), pal[ch])
    im.save(path)

K = (20, 40, 50, 255)
# ---- the sea serpent (boss)
sprite([
    "................",
    "......kkkk......",
    "....kkgggggk....",
    "...kgggwggwgk...",
    "...kggggggggk...",
    "...kgrrrrrrgk...",
    "....kgggggggk...",
    ".kk..kkggggk.kk.",
    "kggkkggggggkggk.",
    "kgggggggbbggggk.",
    ".kgggggbbbbgggk.",
    "..kkkgggbbggkk..",
    "....kkgggggk....",
    ".....kkkkkkk....",
    "................",
    "................",
], {'k': K, 'g': (40, 150, 130, 255), 'b': (150, 230, 200, 255), 'w': (255, 255, 255, 255), 'r': (230, 70, 90, 255)}, f'{A}/sprites/serpent.png')
# ---- jelly (helper)
sprite([
    "................",
    "................",
    "....kkkkkk......",
    "...kppppppk.....",
    "..kppwppwppk....",
    "..kpppppppk.....",
    "..kppppppppk....",
    "...kkkkkkkk.....",
    "....k.k.k.k.....",
    "....k.k.k.k.....",
    ".....k.k.k......",
    "................",
    "................",
    "................",
    "................",
    "................",
], {'k': (90, 40, 110, 255), 'p': (230, 140, 240, 255), 'w': (255, 255, 255, 255)}, f'{A}/sprites/jelly.png')
# ---- crab
sprite([
    "................",
    "................",
    "................",
    "..kk........kk..",
    ".kook......kook.",
    ".kook.kkkk.kook.",
    "..kkkkooookkkk..",
    "...kooowoowook..",
    "..kooooooooook..",
    "...kkokokokkk...",
    "..kk.k.k.k.kk...",
    "................",
    "................",
    "................",
    "................",
    "................",
], {'k': (110, 40, 30, 255), 'o': (240, 120, 70, 255), 'w': (255, 255, 255, 255)}, f'{A}/sprites/crab.png')
# ---- kelp bush and bare
def kelp(path, full):
    rows = [
        "................",
        "...g...g...g....",
        "...gg..gg..gg...",
        "..kgg..gg.kgg...",
        "..kgg.kgg.kgg...",
        ".kggg.kggkggg...",
        ".kgggkkgggggg...",
        ".kgggggggbggk...",
        "..kggbggggggk...",
        "..kggggggggk....",
        "...kkgggggkk....",
        ".....kkkkk......",
        "................",
        "................",
        "................",
        "................",
    ]
    if not full:
        rows = [r.replace('b', 'g') for r in rows]
    sprite(rows, {'k': (10, 60, 50, 255), 'g': (50, 170, 120, 255), 'b': (170, 255, 190, 255)}, path)
kelp(f'{A}/sprites/kelp.png', True)
kelp(f'{A}/sprites/kelp-bare.png', False)
# ---- rune stone (dark / lit)
def rune(path, lit):
    c = (120, 255, 230, 255) if lit else (70, 90, 100, 255)
    rows = [
        "................",
        "....kkkkkkkk....",
        "...kssssssssk...",
        "..kssssssssssk..",
        "..ksssrrrssssk..",
        "..ksssrsrsssk...",
        "..kssssrrrssk...",
        "..ksssrsrrssk...",
        "..kssssrsssk....",
        "..kssssssssk....",
        "..kssssssssk....",
        ".kkssssssssskk..",
        ".kssssssssssssk.",
        ".kkkkkkkkkkkkkk.",
        "................",
        "................",
    ]
    sprite(rows, {'k': (30, 40, 50, 255), 's': (110, 124, 132, 255), 'r': c}, path)
rune(f'{A}/sprites/rune-off.png', False)
rune(f'{A}/sprites/rune-on.png', True)
# ---- the inner door (sealed / open)
def idoor(path, open_):
    rows = ["kkkkkkkkkkkkkkkk"] + ["kgggggggggggggk."] * 0
    rows = []
    for y in range(16):
        if y in (0, 15):
            rows.append("kkkkkkkkkkkkkkkk")
        elif y == 1:
            rows.append("kggggggggggggggk")
        else:
            rows.append("kg" + ("dbbbbbbbbbbd" if open_ else "ssssrsrsrsss") + "gk")
    pal = {'k': (20, 36, 44, 255), 'g': (80, 110, 112, 255), 's': (120, 140, 140, 255), 'r': (120, 255, 230, 255), 'd': (40, 56, 60, 255), 'b': (6, 14, 20, 255)}
    sprite(rows, pal, path)
idoor(f'{A}/sprites/ruinsdoor.png', False)
idoor(f'{A}/sprites/ruinsdoor-open.png', True)

# ---- tileset: 1 mossy floor, 2 glow floor, 3 shallow water, 4 deep water, 5 wall, 6 broken pillar, 7 arch
def tile(f):
    im = Image.new('RGBA', (16, 16))
    for y in range(16):
        for x in range(16):
            im.putpixel((x, y), f(x, y))
    return im
def floor(x, y, glow=False):
    seam = (x % 8 == 0) or (y % 8 == 0)
    base = (60, 82, 78, 255) if not seam else (36, 52, 52, 255)
    if (x * 5 + y * 7) % 13 == 0:
        base = (70, 110, 84, 255)
    if glow and (x, y) in [(7, 7), (8, 7), (7, 8), (8, 8), (7, 6), (8, 9)]:
        base = (130, 255, 230, 255)
    return base
def shallow(x, y):
    return (90, 170, 190, 255) if (x + y * 2) % 7 else (140, 210, 220, 255)
def deep(x, y):
    return (30, 90, 140, 255) if (x * 2 + y) % 9 else (60, 130, 180, 255)
def wall(x, y):
    base = (34, 56, 60, 255)
    if y % 8 == 0 or (x + (4 if (y // 8) % 2 else 0)) % 8 == 0:
        base = (20, 34, 40, 255)
    if (x * 3 + y * 11) % 17 == 0:
        base = (50, 100, 70, 255)
    return base
def pillar(x, y):
    d = abs(x - 7.5)
    if d < 4 and y > 3:
        return (130, 150, 150, 255) if y % 5 else (96, 116, 116, 255)
    return floor(x, y)
def arch(x, y):
    d = abs(x - 7.5) + abs(y - 7.5)
    return (8, 16, 22, 255) if d < 10 else floor(x, y)
fs = [floor, lambda x, y: floor(x, y, True), shallow, deep, wall, pillar, arch]
sheet = Image.new('RGBA', (16 * len(fs), 16))
for i, f in enumerate(fs):
    sheet.paste(tile(f), (i * 16, 0))
sheet.save(f'{A}/tilesets/ruins-tiles.png')
FLOOR, GLOW, SHALLOW, DEEP, WALL, PILLAR, ARCH = 1, 2, 3, 4, 5, 6, 7

# ---- the map
W, H = 36, 28
fl = [[False] * W for _ in range(H)]
def carve(x0, y0, x1, y1):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            fl[y][x] = True
carve(1, 20, 11, 26)    # entry hall
fl[25][0] = True        # arrival arch (from the Peaks)
carve(12, 23, 15, 24)   # entry -> hub
carve(16, 16, 28, 26)   # the hub
carve(5, 12, 6, 19)     # entry -> west rune room
carve(2, 6, 10, 11)     # rune room A
carve(26, 12, 27, 15)   # hub -> rune room B
carve(22, 6, 32, 11)    # rune room B
carve(29, 22, 29, 23)   # hub -> rune room C
carve(30, 20, 34, 25)   # rune room C
carve(11, 8, 16, 8)     # rune room A -> the sealed door
carve(16, 6, 16, 7)
carve(12, 1, 20, 5)     # the guardian's chamber
fl[3][11] = True        # exit arch on its west wall (to the Crystal Caverns)
water = set()
def pool(x0, y0, x1, y1):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            assert fl[y][x]
            water.add((x, y))
pool(3, 21, 9, 22); pool(3, 24, 9, 25)        # entry hall: a causeway along row 23
pool(20, 19, 24, 22)                          # the hub's pool
pool(17, 9 - 9 + 1, 19, 1) if False else None
shallow_cells = set()
for (x, y) in list(water):
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        n = (x + dx, y + dy)
        if fl[n[1]][n[0]] and n not in water and (n[0] + n[1]) % 2 == 0:
            shallow_cells.add(n)
pillars = [(18, 18), (26, 18), (18, 24), (26, 24), (8, 9), (25, 9), (14, 3), (18, 3)]
ground = [FLOOR] * (W * H)
obst = [0] * (W * H)
def idx(x, y): return y * W + x
for y in range(H):
    for x in range(W):
        if not fl[y][x]:
            obst[idx(x, y)] = WALL
        elif (x, y) in water:
            obst[idx(x, y)] = DEEP; ground[idx(x, y)] = DEEP
        elif (x, y) in shallow_cells:
            ground[idx(x, y)] = SHALLOW
        elif random.random() < 0.06:
            ground[idx(x, y)] = GLOW
for (x, y) in pillars:
    if fl[y][x] and (x, y) not in water:
        obst[idx(x, y)] = PILLAR
for (x, y) in [(0, 25), (11, 3)]:
    ground[idx(x, y)] = ARCH; obst[idx(x, y)] = 0

def props(**kw):
    out = []
    for k, v in kw.items():
        t = 'int' if isinstance(v, int) and not isinstance(v, bool) else 'string'
        out.append({'name': k, 'type': t, 'value': v})
    return out
oid = [1000]
def obj(name, x, y, **kw):
    oid[0] += 1
    return {'height': 16, 'id': oid[0], 'name': name, 'properties': props(**kw), 'rotation': 0, 'type': '', 'visible': True,
            'width': 16, 'x': x * 16, 'y': y * 16}
def check(*cells):
    for (x, y) in cells:
        if obst[idx(x, y)] in (PILLAR,):
            obst[idx(x, y)] = 0
        assert fl[y][x] and obst[idx(x, y)] == 0 and (x, y) not in water, (x, y)

kelps = [(2, 21), (10, 22), (10, 25), (2, 26), (17, 17), (27, 17), (17, 25), (27, 25), (6, 17), (4, 7), (23, 7), (33, 24)]
check(*kelps)
targets = [obj(f'kelp{i}', x, y, id=f'kelp{i}', texture='kelp', tool='', variants='forageRuins', hits=1, respawnMs=90000,
               stump='kelp-bare', clearedMsg='Picked!') for i, (x, y) in enumerate(kelps)]
crabs = [(4, 23), (8, 23), (19, 24), (25, 17), (31, 7), (6, 14)]
jellies_none = []
check(*crabs)
enemies = [obj(f'crab{i}', x, y, id=f'crab{i}', type='crab') for i, (x, y) in enumerate(crabs)]
check((16, 3))
enemies.append(obj('serpent', 16, 3, id='serpent', type='serpent', hideIfFlag='serpent_defeated'))
runes = [(6, 7, 'a'), (27, 7, 'b'), (32, 22, 'c')]
npcs = []
for (x, y, k) in runes:
    check((x, y))
    npcs.append(obj(f'rune{k}', x, y, id=f'rune{k}', texture='rune-off', dialogue='runestone', setFlag=f'rune{k}_cleared',
                    openFlag=f'rune{k}_cleared', openTexture='rune-on', openDialogue='runestoneon'))
check((16, 6))
npcs.append(obj('ruinsdoor', 16, 6, id='ruinsdoor', texture='ruinsdoor', dialogue='ruinsdoor', passable='yes',
                needFlags='runea_cleared,runeb_cleared,runec_cleared', openFlag='ruinsdoor_cleared',
                openTexture='ruinsdoor-open', openDialogue='ruinsdooropen'))
check((18, 2), (3, 23), (3, 20))
npcs.append(obj('princessnote', 18, 2, id='princessnote', texture='sign', dialogue='princessnote'))
npcs.append(obj('ruinssign', 2, 25, id='ruinssign', texture='sign', dialogue='ruinssign'))
doors = [obj('to-peaks', 0, 25, toMap='peaks', toX=37, toY=11),
         obj('to-crystal', 11, 3, toMap='crystal', toX=2, toY=13, requiresFlag='serpent_defeated',
             lockedMsg='A sealed archway. The guardian still holds it shut.')]

ruins = {
    'compressionlevel': -1, 'height': H, 'width': W, 'infinite': False, 'orientation': 'orthogonal', 'renderorder': 'right-down',
    'tiledversion': '1.10.2', 'tileheight': 16, 'tilewidth': 16, 'type': 'map', 'version': '1.10',
    'nextlayerid': 8, 'nextobjectid': oid[0] + 1,
    'tilesets': [{'columns': 7, 'firstgid': 1, 'image': '../tilesets/ruins-tiles.png', 'imageheight': 16, 'imagewidth': 112, 'margin': 0,
                  'name': 'ruins-tiles', 'spacing': 0, 'tilecount': 7, 'tileheight': 16, 'tilewidth': 16}],
    'layers': [
        {'data': ground, 'height': H, 'width': W, 'id': 1, 'name': 'ground', 'opacity': 1, 'type': 'tilelayer', 'visible': True, 'x': 0, 'y': 0},
        {'data': obst, 'height': H, 'width': W, 'id': 2, 'name': 'obstacles', 'opacity': 1, 'type': 'tilelayer', 'visible': True, 'x': 0, 'y': 0},
        {'draworder': 'topdown', 'id': 3, 'name': 'doors', 'objects': doors, 'opacity': 1, 'type': 'objectgroup', 'visible': True, 'x': 0, 'y': 0},
        {'draworder': 'topdown', 'id': 4, 'name': 'npcs', 'objects': npcs, 'opacity': 1, 'type': 'objectgroup', 'visible': True, 'x': 0, 'y': 0},
        {'draworder': 'topdown', 'id': 5, 'name': 'targets', 'objects': targets, 'opacity': 1, 'type': 'objectgroup', 'visible': True, 'x': 0, 'y': 0},
        {'draworder': 'topdown', 'id': 6, 'name': 'enemies', 'objects': enemies, 'opacity': 1, 'type': 'objectgroup', 'visible': True, 'x': 0, 'y': 0},
    ],
}
# reachability on foot: everything except behind the sealed door; then the guardian's chamber once the door is open
blocked = {(o['x'] // 16, o['y'] // 16) for o in targets + npcs}
def reach(open_door):
    seen, q = {(1, 25)}, deque([(1, 25)])
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < W and 0 <= ny < H and fl[ny][nx] and obst[idx(nx, ny)] == 0 and (nx, ny) not in seen \
                    and (nx, ny) not in {(0, 25), (11, 3)}:
                if (nx, ny) in blocked and not ((nx, ny) == (16, 6) and open_door):
                    continue
                seen.add((nx, ny)); q.append((nx, ny))
    return seen
no = reach(False)
for (x, y, k) in runes:
    assert any((x + dx, y + dy) in no for dx, dy in ((0, 1), (0, -1), (1, 0), (-1, 0))), ('rune', k)
assert (16, 7) in no and (16, 5) not in no, 'guardian chamber is behind the door'
yes = reach(True)
assert (16, 5) in yes and (12, 3) in yes and (17, 3) in yes
for (x, y) in kelps + crabs:
    assert any((x + dx, y + dy) in no for dx, dy in ((0, 1), (0, -1), (1, 0), (-1, 0))), ('unreachable', x, y)
json.dump(ruins, open(f'{A}/maps/ruins.json', 'w'), separators=(',', ':'))

# ---- data
ej = json.load(open('src/data/enemies.json'))
ej['crab'] = {'name': 'Tide Crab', 'texture': 'crab', 'hp': 3, 'damage': 1, 'moveMs': 520, 'attackMs': 1200, 'sight': 5,
              'respawnMs': 40000, 'gold': 5, 'tame': 'crab'}
ej['jelly'] = {'name': 'Jelly', 'texture': 'jelly', 'hp': 3, 'damage': 1, 'moveMs': 560, 'attackMs': 1200, 'sight': 7,
               'respawnMs': 40000, 'gold': 4}
ej['serpent'] = {'name': 'Sea Serpent', 'texture': 'serpent', 'hp': 26, 'damage': 2, 'moveMs': 600, 'attackMs': 1300, 'sight': 12,
                 'respawnMs': 31536000000, 'gold': 80, 'boss': True, 'flag': 'serpent_defeated',
                 'summon': {'type': 'jelly', 'everyMs': 7000, 'max': 2},
                 'reward': {'item': 'moon-crest-half', 'msg': 'The Sea Serpent is calm. You found half of the Moon Crest!'},
                 'defeatLines': ['The Sea Serpent sinks back into the pool with a bubbling sigh, and the dark whisper drifts out of her like smoke.',
                                 'Behind her, half of a silver crest glimmers on a ledge. The other half is missing, torn away.']}
json.dump(ej, open('src/data/enemies.json', 'w'), indent=2)
fj = json.load(open('src/data/friends.json'))
fj['kinds']['crab'] = {'name': 'Tide Crab', 'baseName': 'Pinchy', 'texture': 'crab', 'treat': 'seaweed'}
json.dump(fj, open('src/data/friends.json', 'w'), indent=2)
ij = json.load(open('src/data/items.json'))
ij['items']['seaweed'] = {'name': 'Seaweed', 'icon': 'leaf', 'color': '#3fb88a', 'desc': 'Slippery and salty. Crabs love it.'}
ij['items']['moon-crest-half'] = {'name': 'Moon Crest (half)', 'icon': 'crest', 'color': '#c8d6e8', 'desc': 'Half of a silver crest. The princess carries the other half... or did.'}
json.dump(ij, open('src/data/items.json', 'w'), indent=2)
rj = json.load(open('src/data/rocks.json'))
rj['forageRuins'] = [
    {'id': 'k1', 'weight': 60, 'hits': 1, 'drop': 'seaweed', 'amount': 2, 'texture': 'kelp', 'msg': 'Picked seaweed!'},
    {'id': 'k2', 'weight': 25, 'hits': 1, 'drop': 'herb', 'amount': 2, 'texture': 'kelp', 'msg': 'Picked some herbs!'},
    {'id': 'k3', 'weight': 15, 'hits': 1, 'drop': 'carrot-seeds', 'amount': 2, 'texture': 'kelp', 'msg': 'Found carrot seeds!'},
]
json.dump(rj, open('src/data/rocks.json', 'w'), indent=2)
sj = json.load(open('src/data/shop.json'))
sj['general']['sell']['seaweed'] = 4
json.dump(sj, open('src/data/shop.json', 'w'), indent=2)
dj = json.load(open('src/data/dialogue.json'))
dj['ruinssign'] = {'name': 'Worn Stone', 'lines': ['The letters are worn, but you can read: "THREE RUNES WAKE THE INNER DOOR. THE GUARDIAN SLEEPS BEYOND."'], 'repeatLines': ['Three runes wake the inner door.']}
dj['runestone'] = {'name': 'Rune Stone', 'lines': ['A rune stone, cold and dark. You press your hand against it.'], 'repeatLines': ['The rune is dark.']}
dj['runestoneon'] = {'name': 'Rune Stone', 'lines': ['The rune glows a steady, watery green.'], 'repeatLines': ['The rune glows a steady, watery green.']}
dj['ruinsdoor'] = {'name': 'Inner Door', 'lines': ['A heavy stone door with three glowing slots. Three rune stones in the ruins must wake it.'], 'repeatLines': ['Three runes wake this door.']}
dj['ruinsdooropen'] = {'name': 'Inner Door', 'lines': ['The door stands open. Water drips somewhere beyond.'], 'repeatLines': ['The way to the guardian is open.']}
dj['princessnote'] = {
    'name': "Princess's Note",
    'lines': ['A note pinned under a smooth stone, in careful, royal handwriting:', '"I split the Moon Crest in two so the dark one could never take it all. I left one half here with the guardian, under the old waves."',
              '"The other half I carry to the desert market, where the caravans trade. If you are reading this, you are brave. Please hurry. - P."'],
    'repeatLines': ['"...to the desert market. Please hurry. - P."'],
}
json.dump(dj, open('src/data/dialogue.json', 'w'), indent=2, ensure_ascii=False)
open('src/data/dialogue.json', 'a').write('\n')
print('ruins built:', len(targets), 'kelp,', len(enemies), 'creatures,', len(npcs), 'npcs')
