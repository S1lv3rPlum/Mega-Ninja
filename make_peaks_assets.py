"""Builds the Snowy Peaks: public/assets/maps/peaks.json, snow-tiles.png, yeti / snow fox / frost imp / snow bush sprites,
and the data (enemies, items, rocks forage, friends, dialogue). Run from the project folder: python3 make_peaks_assets.py
Run make_crystal_assets.py first (it makes the passage that leads here)."""
import json, random
from collections import deque
from PIL import Image, ImageDraw

A = 'public/assets'
random.seed(31)

def sprite(rows, pal, path):
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch in pal:
                im.putpixel((x, y), pal[ch])
    im.save(path)

# ---- the yeti: a big shaggy white-blue creature
sprite([
    "................",
    "....kkkkkkkk....",
    "...kwwwwwwwwk...",
    "..kwwwwwwwwwwk..",
    "..kwwbkwwkbwwk..",
    "..kwwwwwwwwwwk..",
    "..kwwwkddkwwwk..",
    "...kwwwwwwwwk...",
    ".kkwwwwwwwwwwkk.",
    "kwwwwwwwwwwwwwwk",
    "kwwbwwwwwwwwbwwk",
    "kwwwwwwwwwwwwwwk",
    ".kwwwkwwwwkwwwk.",
    "..kkkkwwwwkkkk..",
    "......kkkk......",
    "................",
], {'k': (40, 60, 90, 255), 'w': (235, 245, 255, 255), 'b': (150, 200, 245, 255), 'd': (200, 60, 80, 255)}, f'{A}/sprites/yeti.png')
# ---- the snow fox
sprite([
    "................",
    "................",
    "..k.k...........",
    ".kwkwk..........",
    ".kwwwwk.....kk..",
    ".kwkwwwkkkkkwwk.",
    "..kwwwwwwwwwwwk.",
    "...kwwwwwwwwwwk.",
    "...kwwwwwwwwwk..",
    "...kwk.kwk.kk...",
    "...kk..kk.......",
    "................",
    "................",
    "................",
    "................",
    "................",
], {'k': (70, 90, 130, 255), 'w': (245, 250, 255, 255)}, f'{A}/sprites/snowfox.png')
# ---- a frost imp (the yeti's helper)
sprite([
    "................",
    "................",
    "...k......k.....",
    "...kk....kk.....",
    "....kbbbbk......",
    "...kbwbbwbk.....",
    "...kbbbbbbk.....",
    "...kbbrrbbk.....",
    "....kbbbbk......",
    "...kbbbbbbk.....",
    "..kbbkbbkbbk....",
    "...kk.kk.kk.....",
    "................",
    "................",
    "................",
    "................",
], {'k': (30, 60, 110, 255), 'b': (110, 190, 245, 255), 'w': (255, 255, 255, 255), 'r': (230, 60, 80, 255)}, f'{A}/sprites/frostimp.png')
# ---- snowy berry bush (and bare)
def bush(path, berries):
    rows = [
        "................",
        "................",
        "......kkkk......",
        "....kkwwwwkk....",
        "...kwwgggwwwk...",
        "..kwgggbgggwwk..",
        "..kggbgggggbgk..",
        ".kwgggggbgggggk.",
        ".kgggbgggggbggk.",
        ".kgggggggggggwk.",
        "..kkgggggggkkk..",
        "....kkkkkkk.....",
        "................",
        "................",
        "................",
        "................",
    ]
    if not berries:
        rows = [r.replace('b', 'g') for r in rows]
    sprite(rows, {'k': (30, 70, 70, 255), 'w': (240, 248, 255, 255), 'g': (60, 140, 110, 255), 'b': (90, 190, 255, 255)}, path)
bush(f'{A}/sprites/snow-bush.png', True)
bush(f'{A}/sprites/snow-bush-bare.png', False)

# ---- tileset: 1 snow, 2 snow light, 3 thin ice, 4 deep ice, 5 pine, 6 cliff, 7 stone path, 8 arch
def tile(f):
    im = Image.new('RGBA', (16, 16))
    for y in range(16):
        for x in range(16):
            im.putpixel((x, y), f(x, y))
    return im
def snow(x, y, lite=0):
    v = 228 + ((x * 3 + y * 7) % 5) * 2 + lite
    return (min(255, v), min(255, v + 6), 255, 255)
def thin(x, y):
    base = (150, 205, 240, 255)
    if (x + y) % 9 == 0 or (x * 2 - y) % 13 == 0:
        return (210, 240, 255, 255)
    return base
def deep(x, y):
    base = (70, 130, 200, 255)
    if (x * 3 + y) % 11 == 0:
        return (110, 170, 230, 255)
    return base
def pine(x, y):
    dx = abs(x - 7.5)
    if y > 12:
        return (90, 60, 40, 255) if dx < 1.6 else snow(x, y)
    for k, top in enumerate([0, 4, 8]):
        if top <= y < top + 6 and dx <= (y - top) * 0.9 + 0.6:
            return (240, 248, 255, 255) if (y - top) < 2 else (40, 110, 80, 255)
    return snow(x, y)
def cliff(x, y):
    base = (92, 100, 120, 255)
    if y % 8 < 2:
        base = (70, 78, 98, 255)
    if y < 3:
        base = (240, 246, 255, 255)
    return base
def path(x, y):
    return (150, 150, 165, 255) if (x * 5 + y * 3) % 6 else (120, 120, 135, 255)
def arch(x, y):
    d = abs(x - 7.5) + abs(y - 7.5)
    return (14, 16, 34, 255) if d < 10 else snow(x, y)
fs = [snow, lambda x, y: snow(x, y, 10), thin, deep, pine, cliff, path, arch]
sheet = Image.new('RGBA', (16 * len(fs), 16))
for i, f in enumerate(fs):
    sheet.paste(tile(f), (i * 16, 0))
sheet.save(f'{A}/tilesets/snow-tiles.png')
SNOW, SNOW2, THIN, DEEP, PINE, CLIFF, PATH, ARCH = 1, 2, 3, 4, 5, 6, 7, 8

# ---- the map: 40 x 28
W, H = 40, 28
ground = [SNOW] * (W * H)
obst = [0] * (W * H)
def idx(x, y): return y * W + x
for y in range(H):
    for x in range(W):
        if (x * 7 + y * 5) % 13 == 0:
            ground[idx(x, y)] = SNOW2
        if x in (0, W - 1) or y in (0, H - 1):
            obst[idx(x, y)] = CLIFF
def rect(g, x0, y0, x1, y1, v):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            g[idx(x, y)] = v
# the Yeti's den (top-left): cliff walls with a gap on the south side
rect(obst, 6, 1, 20, 1, CLIFF); rect(obst, 6, 9, 20, 9, CLIFF); rect(obst, 6, 1, 6, 9, CLIFF); rect(obst, 20, 1, 20, 9, CLIFF)
obst[idx(13, 9)] = 0; obst[idx(12, 9)] = 0; obst[idx(14, 9)] = 0
# a cliff ridge splitting the south field from the lake path, with a gap
rect(obst, 12, 14, 12, 21, CLIFF); rect(obst, 12, 23, 12, 27, CLIFF); obst[idx(12, 22)] = 0
# the stone path from the arrival up toward the den
for (x0, y0, x1, y1) in [(1, 24, 11, 24), (11, 22, 13, 22), (13, 10, 13, 22), (13, 10, 14, 11)]:
    rect(ground, x0, y0, x1, y1, PATH)
# the frozen lake (east): deep ice with a thin-ice path across to the far shore
LX0, LY0, LX1, LY1 = 22, 8, 36, 20
rect(obst, LX0, LY0, LX1, LY1, DEEP); rect(ground, LX0, LY0, LX1, LY1, DEEP)
thin_cells = set()
for (x0, y0, x1, y1) in [(22, 14, 30, 14), (30, 14, 30, 11), (30, 11, 36, 11), (36, 11, 37, 11), (26, 14, 26, 17), (27, 17, 33, 17)]:
    for y in range(min(y0, y1), max(y0, y1) + 1):
        for x in range(min(x0, x1), max(x0, x1) + 1):
            obst[idx(x, y)] = 0
            ground[idx(x, y)] = THIN
            thin_cells.add((x, y))
# the far shore: a little island with the ruins gate sign
rect(ground, 37, 9, 38, 13, SNOW)
for y in range(9, 14):
    for x in (37, 38):
        obst[idx(x, y)] = 0
for (x, y) in [(37, 11), (36, 11)]:
    ground[idx(x, y)] = THIN if x == 36 else SNOW
thin_cells.discard((37, 11))
rect(obst, 37, 8, 38, 8, CLIFF); rect(obst, 37, 14, 38, 14, CLIFF)   # the island can only be reached over the ice
# pines scattered in the open snow (not on paths, ice or near key spots)
keep = {(38, 11), (1, 24), (2, 24), (3, 24), (13, 10), (13, 22), (21, 14), (37, 11)}
for _ in range(110):
    x, y = random.randint(2, W - 3), random.randint(2, H - 3)
    if obst[idx(x, y)] or ground[idx(x, y)] in (PATH, THIN, DEEP) or (x, y) in keep:
        continue
    if 6 <= x <= 20 and y <= 10:            # keep the den open
        continue
    if abs(x - 13) <= 1 and y >= 10:         # keep the approach to the den open
        continue
    if any(abs(x - a) + abs(y - b) < 3 for a, b in [(2, 24), (21, 14), (37, 11), (12, 22)]):
        continue
    obst[idx(x, y)] = PINE
ground[idx(0, 24)] = ARCH; obst[idx(0, 24)] = 0     # the way back to the caverns

def props(**kw):
    out = []
    for k, v in kw.items():
        t = 'int' if isinstance(v, int) and not isinstance(v, bool) else 'string'
        out.append({'name': k, 'type': t, 'value': v})
    return out
oid = [800]
def obj(name, x, y, **kw):
    oid[0] += 1
    return {'height': 16, 'id': oid[0], 'name': name, 'properties': props(**kw), 'rotation': 0, 'type': '', 'visible': True,
            'width': 16, 'x': x * 16, 'y': y * 16}

def openish(x, y):
    return 0 <= x < W and 0 <= y < H and obst[idx(x, y)] == 0
def place(items):
    for (n, x, y) in items:
        if obst[idx(x, y)] == PINE:
            obst[idx(x, y)] = 0      # a pine was in the way: clear it
        assert openish(x, y) and ground[idx(x, y)] not in (THIN, DEEP), (n, x, y)

bushes = [(4, 22), (8, 26), (10, 20), (3, 18), (16, 16), (17, 24), (15, 12), (9, 12), (19, 20), (24, 24), (28, 4), (33, 5)]
place([('b', x, y) for x, y in bushes])
targets = [obj(f'sbush{i}', x, y, id=f'sbush{i}', texture='snow-bush', tool='', variants='forageSnow', hits=1, respawnMs=90000,
               stump='snow-bush-bare', clearedMsg='Picked!') for i, (x, y) in enumerate(bushes)]
foxes = [(6, 20), (9, 16), (16, 20), (18, 14), (24, 24)]
imps = [(10, 6), (16, 4), (8, 4)]
place([('f', x, y) for x, y in foxes + imps])
enemies = [obj(f'fox{i}', x, y, id=f'fox{i}', type='snowfox') for i, (x, y) in enumerate(foxes)]
enemies += [obj(f'imp{i}', x, y, id=f'imp{i}', type='frostimp') for i, (x, y) in enumerate(imps)]
place([('y', 13, 4)])
enemies.append(obj('yeti', 13, 4, id='yeti', type='yeti', hideIfFlag='yeti_defeated'))
npcs = [obj('icehermit', 4, 26, id='icehermit', texture='npc', dialogue='icehermit'),
        obj('peaksign', 3, 23, id='peaksign', texture='sign', dialogue='peaksign'),
        ]
place([('n', o['x'] // 16, o['y'] // 16) for o in npcs])
doors = [obj('to-crystal', 0, 24, toMap='crystal', toX=32, toY=22),
         obj('to-ruins', 38, 11, toMap='ruins', toX=1, toY=25)]
ground[idx(38, 11)] = ARCH; obst[idx(38, 11)] = 0   # the old gate: the way into the Sunken Ruins

peaks = {
    'compressionlevel': -1, 'height': H, 'width': W, 'infinite': False, 'orientation': 'orthogonal', 'renderorder': 'right-down',
    'tiledversion': '1.10.2', 'tileheight': 16, 'tilewidth': 16, 'type': 'map', 'version': '1.10',
    'nextlayerid': 8, 'nextobjectid': oid[0] + 1,
    'tilesets': [{'columns': 8, 'firstgid': 1, 'image': '../tilesets/snow-tiles.png', 'imageheight': 16, 'imagewidth': 128, 'margin': 0,
                  'name': 'snow-tiles', 'spacing': 0, 'tilecount': 8, 'tileheight': 16, 'tilewidth': 16}],
    'properties': [{'name': 'thinIceGid', 'type': 'int', 'value': THIN}],
    'layers': [
        {'data': ground, 'height': H, 'width': W, 'id': 1, 'name': 'ground', 'opacity': 1, 'type': 'tilelayer', 'visible': True, 'x': 0, 'y': 0},
        {'data': obst, 'height': H, 'width': W, 'id': 2, 'name': 'obstacles', 'opacity': 1, 'type': 'tilelayer', 'visible': True, 'x': 0, 'y': 0},
        {'draworder': 'topdown', 'id': 3, 'name': 'doors', 'objects': doors, 'opacity': 1, 'type': 'objectgroup', 'visible': True, 'x': 0, 'y': 0},
        {'draworder': 'topdown', 'id': 4, 'name': 'npcs', 'objects': npcs, 'opacity': 1, 'type': 'objectgroup', 'visible': True, 'x': 0, 'y': 0},
        {'draworder': 'topdown', 'id': 5, 'name': 'targets', 'objects': targets, 'opacity': 1, 'type': 'objectgroup', 'visible': True, 'x': 0, 'y': 0},
        {'draworder': 'topdown', 'id': 6, 'name': 'enemies', 'objects': enemies, 'opacity': 1, 'type': 'objectgroup', 'visible': True, 'x': 0, 'y': 0},
    ],
}
# reachability: on foot WITHOUT boots (thin ice blocked) the den, bushes, hermit and lake shore; WITH boots the far shore
blocked_obj = {(o['x'] // 16, o['y'] // 16) for o in targets + npcs}
def reach(boots):
    seen, q = {(1, 24)}, deque([(1, 24)])
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if openish(nx, ny) and (nx, ny) not in seen and (nx, ny) not in blocked_obj and (nx, ny) != (0, 24):
                if (nx, ny) in thin_cells and not boots:
                    continue
                seen.add((nx, ny)); q.append((nx, ny))
    return seen
no = reach(False)
for (x, y) in [(13, 5), (13, 4 + 1), (4, 25), (21, 14)] + [(x, y) for x, y in bushes][:0]:
    pass
assert (13, 5) in no, 'den reachable'
assert (21, 14) in no, 'lake shore reachable'
assert (37, 11) not in no and (36, 11) not in no, 'far shore needs boots'
assert (37, 11) in reach(True) or (37, 10) in reach(True), 'far shore reachable with boots'
for (x, y) in bushes + foxes + imps:
    near = any((x + dx, y + dy) in no for dx, dy in ((0, 1), (0, -1), (1, 0), (-1, 0)))
    assert near, ('unreachable', x, y)
json.dump(peaks, open(f'{A}/maps/peaks.json', 'w'), separators=(',', ':'))

# ---- data
ej = json.load(open('src/data/enemies.json'))
ej['snowfox'] = {'name': 'Snow Fox', 'texture': 'snowfox', 'hp': 3, 'damage': 1, 'moveMs': 500, 'attackMs': 1300, 'sight': 5,
                 'respawnMs': 40000, 'gold': 4, 'tame': 'snowfox'}
ej['frostimp'] = {'name': 'Frost Imp', 'texture': 'frostimp', 'hp': 3, 'damage': 1, 'moveMs': 520, 'attackMs': 1200, 'sight': 7,
                  'respawnMs': 40000, 'gold': 4}
ej['yeti'] = {'name': 'Yeti', 'texture': 'yeti', 'hp': 22, 'damage': 2, 'moveMs': 600, 'attackMs': 1300, 'sight': 12,
              'respawnMs': 31536000000, 'gold': 60, 'boss': True, 'flag': 'yeti_defeated',
              'summon': {'type': 'frostimp', 'everyMs': 7000, 'max': 2},
              'reward': {'item': 'frost-boots', 'msg': 'The Yeti is beaten! The Frost Boots are yours.'},
              'defeatLines': ['The Yeti sits down in the snow with a huge sigh. A cold whisper leaves him like steam.',
                              '"...Sorry. Something dark kept me angry up here."', 'He pushes a pair of fur-lined boots toward you. They sparkle like frost. "For crossing thin ice."']}
json.dump(ej, open('src/data/enemies.json', 'w'), indent=2)
fj = json.load(open('src/data/friends.json'))
fj['kinds']['snowfox'] = {'name': 'Snow Fox', 'baseName': 'Frosty', 'texture': 'snowfox', 'treat': 'frostberry'}
json.dump(fj, open('src/data/friends.json', 'w'), indent=2)
ij = json.load(open('src/data/items.json'))
ij['items']['frostberry'] = {'name': 'Frostberry', 'icon': 'leaf', 'color': '#8fd8ff', 'desc': 'A chilly blue berry. Snow foxes love them.'}
ij['items']['frost-boots'] = {'name': 'Frost Boots', 'icon': 'boots', 'color': '#8fd8ff', 'desc': 'Fur-lined boots that grip thin ice. You can walk across the frozen lake in them.'}
json.dump(ij, open('src/data/items.json', 'w'), indent=2)
rj = json.load(open('src/data/rocks.json'))
rj['forageSnow'] = [
    {'id': 's1', 'weight': 60, 'hits': 1, 'drop': 'frostberry', 'amount': 2, 'texture': 'snow-bush', 'msg': 'Picked frostberries!'},
    {'id': 's2', 'weight': 25, 'hits': 1, 'drop': 'herb', 'amount': 2, 'texture': 'snow-bush', 'msg': 'Picked some herbs!'},
    {'id': 's3', 'weight': 15, 'hits': 1, 'drop': 'pumpkin-seeds', 'amount': 1, 'texture': 'snow-bush', 'msg': 'Found a pumpkin seed!'},
]
json.dump(rj, open('src/data/rocks.json', 'w'), indent=2)
sj = json.load(open('src/data/shop.json'))
sj['general']['sell']['frostberry'] = 5
json.dump(sj, open('src/data/shop.json', 'w'), indent=2)
dj = json.load(open('src/data/dialogue.json'))
dj['peaksign'] = {'name': 'Sign', 'lines': ['SNOWY PEAKS. Beware the Yeti in the den to the north. Frostberries grow on the bushes.'], 'repeatLines': ['The Yeti lives north, up the stone path.']}
dj['icehermit'] = {
    'name': 'Old Hermit',
    'lines': ['Brrr... a visitor! I have not seen anyone up here since the princess.', 'She stopped by three days ago, looking for the Sunken Ruins across the frozen lake.',
              'The ice is far too thin to cross on plain boots, though. The Yeti has the only pair of Frost Boots, and he has been in a foul mood.'],
    'repeatLines': ['Frost Boots, from the Yeti in the den to the north. He is not himself lately.', 'Take care, the ice has no mercy.'],
    'flagLines': {'yeti_defeated': ['You beat the Yeti? Bless my beard! Now the lake is yours to cross.', 'Follow the thin ice east. The ruins gate is on the far shore.']},
}
dj['ruinsgate'] = {'name': 'Ruined Gate', 'lines': ['An old gate of green stone, half sunk in the snow. Faint carvings show a princess and a crescent crest.', 'It does not budge yet...'],
                   'repeatLines': ['The old gate will not budge yet. (To be continued)']}
json.dump(dj, open('src/data/dialogue.json', 'w'), indent=2, ensure_ascii=False)
open('src/data/dialogue.json', 'a').write('\n')
print('peaks built:', len(targets), 'bushes,', len(enemies), 'creatures')
