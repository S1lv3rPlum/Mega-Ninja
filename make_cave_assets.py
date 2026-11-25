"""Builds the cave: public/assets/maps/cave.json, the cave mouth + door in quarry.json, bat.png, sealed-door.png,
and the data entries (rocks.json caveRocks, enemies.json bat, dialogue.json sealeddoor + cavesign).
Run from the project folder:  python3 make_cave_assets.py   (safe to run again)
"""
import json, random
from collections import deque
from PIL import Image

A = 'public/assets'
random.seed(11)

# ------------------------------------------------------------------ sprites
def sprite(rows, pal, path):
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch in pal:
                im.putpixel((x, y), pal[ch])
    im.save(path)

# a bat with its wings spread
sprite([
    "................",
    "................",
    "................",
    "..kk........kk..",
    ".kppk..kk..kppk.",
    "kpppppkppkpppppk",
    "kppppppppppppppk",
    ".kpppkppppkpppk.",
    "..kpk.pwwp.kpk..",
    "...k..prrp..k...",
    "......pppp......",
    ".......pp.......",
    "................",
    "................",
    "................",
    "................",
], {'k': (28, 18, 44, 255), 'p': (84, 58, 120, 255), 'w': (255, 255, 255, 255), 'r': (230, 40, 60, 255)}, f'{A}/sprites/bat.png')

# a sealed stone door with a crest and three gem sockets
sprite([
    "kkkkkkkkkkkkkkkk",
    "kggggggggggggggk",
    "kgsssssssssssgsk",
    "kgsssssrrsssssgk",
    "kgssssrrrrssssgk",
    "kgsssssrrsssssgk",
    "kgsssssrrsssssgk",
    "kgssssssssssssgk",
    "kgsssssssssssgsk",
    "kgsdsssdsssdssgk",
    "kgsssssssssssgsk",
    "kgssssssssssssgk",
    "kgsssssssssssgsk",
    "kgssssssssssssgk",
    "kggggggggggggggk",
    "kkkkkkkkkkkkkkkk",
], {'k': (22, 20, 28, 255), 'g': (96, 92, 108, 255), 's': (132, 128, 144, 255), 'r': (190, 40, 50, 255), 'd': (40, 38, 52, 255)},
   f'{A}/sprites/sealed-door.png')

from PIL import ImageDraw

def golem_art(path, mood):
    S = 8  # draw big, then shrink with no smoothing for crisp pixels
    im = Image.new('RGBA', (32 * S, 32 * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    def e(box, fill, outline=None, w=0):
        d.ellipse([c * S for c in box], fill=fill, outline=outline, width=w * S)
    # stubby arms and feet, then the big round body
    e((0, 12, 8, 22), (112, 112, 124, 255), (40, 38, 52, 255), 1)
    e((24, 12, 32, 22), (112, 112, 124, 255), (40, 38, 52, 255), 1)
    e((7, 26, 14, 31), (96, 96, 108, 255), (40, 38, 52, 255), 1)
    e((18, 26, 25, 31), (96, 96, 108, 255), (40, 38, 52, 255), 1)
    e((3, 3, 29, 29), (140, 140, 154, 255), (40, 38, 52, 255), 1)
    e((6, 6, 20, 18), (170, 170, 184, 255))            # lit upper left
    e((14, 16, 27, 27), (112, 112, 126, 255))          # shaded lower right
    for (x0, y0, x1, y1) in [(10, 5, 13, 9), (20, 20, 24, 24), (7, 20, 10, 23)]:  # moss-grey bumps
        e((x0, y0, x1, y1), (124, 124, 138, 255))
    eye = (235, 50, 60, 255) if mood == 'evil' else (255, 214, 90, 255)
    e((9, 12, 14, 17), (250, 250, 250, 255), (40, 38, 52, 255), 1)
    e((18, 12, 23, 17), (250, 250, 250, 255), (40, 38, 52, 255), 1)
    e((10.5, 13.5, 13, 16), eye)
    e((19.5, 13.5, 22, 16), eye)
    if mood == 'evil':
        d.line([9 * S, 10 * S, 14 * S, 12 * S], fill=(40, 38, 52, 255), width=S)      # angry brows
        d.line([23 * S, 10 * S, 18 * S, 12 * S], fill=(40, 38, 52, 255), width=S)
        d.line([12 * S, 22 * S, 20 * S, 22 * S], fill=(40, 38, 52, 255), width=S)     # frown line
    else:
        d.arc([11 * S, 18 * S, 21 * S, 24 * S], 20, 160, fill=(40, 38, 52, 255), width=S)  # a gentle smile
    im.resize((32, 32), Image.NEAREST).save(path)

golem_art(f'{A}/sprites/golem.png', 'evil')
golem_art(f'{A}/sprites/golem-good.png', 'good')

def ball_art(path):
    S = 8
    im = Image.new('RGBA', (32 * S, 32 * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse([3 * S, 3 * S, 29 * S, 29 * S], fill=(128, 128, 142, 255), outline=(40, 38, 52, 255), width=S)
    d.ellipse([6 * S, 6 * S, 19 * S, 18 * S], fill=(160, 160, 174, 255))
    for pts in ([8, 24, 14, 20, 12, 16], [16, 28, 20, 22, 26, 20], [20, 6, 18, 12, 24, 14]):
        d.line([p * S for p in pts], fill=(50, 48, 62, 255), width=S)
    d.ellipse([22 * S, 10 * S, 25 * S, 13 * S], fill=(235, 50, 60, 255))   # one angry eye peeking out
    im.resize((32, 32), Image.NEAREST).save(path)
ball_art(f'{A}/sprites/golem-ball.png')

sprite([
    "................",
    "................",
    "................",
    "................",
    "......oooo......",
    "....oogggggoo...",
    "...ogggggggggo..",
    "..ogwwggggwwggo.",
    "..ogwkgggwkggo..",
    "..ogggggggggggo.",
    "..oggggssggggo..",
    "...ogggggggggo..",
    "....oossssoo....",
    "......oooo......",
    "................",
    "................",
], {'o': (40, 38, 52, 255), 'g': (140, 140, 154, 255), 's': (108, 108, 122, 255), 'w': (250, 250, 250, 255), 'k': (30, 30, 40, 255)}, f'{A}/sprites/pebble.png')

sprite([
    "kkkkkkkkkkkkkkkk",
    "kggggggggggggggk",
    "kgsssssssssssgsk",
    "kgsddddddddddsgk",
    "kgsdbbbbbbbbdsgk",
    "kgsdbbbbbbbbdsgk",
    "kgsdbbbbbbbbdsgk",
    "kgsdbbbbbbbbdsgk",
    "kgsdbbbbbbbbdsgk",
    "kgsdbbbbbbbbdsgk",
    "kgsdbbbbbbbbdsgk",
    "kgsdbbbbbbbbdsgk",
    "kgsdbbbbbbbbdsgk",
    "kgsdbbbbbbbbdsgk",
    "kggggggggggggggk",
    "kkkkkkkkkkkkkkkk",
], {'k': (22, 20, 28, 255), 'g': (96, 92, 108, 255), 's': (132, 128, 144, 255), 'd': (60, 56, 72, 255), 'b': (8, 6, 14, 255)},
   f'{A}/sprites/sealed-door-open.png')

# ------------------------------------------------------------------ the cave map
W, H = 30, 22
floor = [[False] * W for _ in range(H)]
def carve(x0, y0, x1, y1):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            floor[y][x] = True
carve(3, 15, 10, 20)   # A  entrance hall
carve(6, 12, 7, 14)    # A -> B
carve(2, 4, 12, 11)    # B  mining chamber
carve(11, 17, 14, 18)  # A -> C
carve(15, 12, 25, 19)  # C  the bat hall
carve(19, 8, 20, 11)   # C -> D
carve(15, 2, 27, 7)    # D  the deep chamber
carve(13, 5, 14, 6)    # B -> D
for p in [(19, 15), (20, 15), (19, 16), (24, 17), (17, 14)]:   # pillars in the bat hall
    floor[p[1]][p[0]] = False
floor[1][21] = True    # the sealed door is set into the north wall of D
floor[21][6] = True    # the way out, in the south wall

# tile numbers: mine-tiles starts at gid 5: 5 brick wall, 6 sandy floor, 7 dark floor, 8 cave mouth, 9 tan path
ground, obstacles = [], []
for y in range(H):
    for x in range(W):
        if floor[y][x]:
            g = 8 if (x, y) == (6, 21) else (6 if random.random() < 0.08 else 7)
            ground.append(g); obstacles.append(0)
        else:
            ground.append(7); obstacles.append(5)

rock_pos = {
    'B': [(3, 5), (5, 4), (9, 4), (11, 6), (4, 8), (7, 7), (10, 10), (3, 11), (8, 11)],
    'C': [(16, 13), (24, 13), (17, 18), (23, 18), (25, 16), (22, 16)],
    'D': [(16, 3), (18, 6), (24, 3), (26, 5), (25, 7), (16, 7)],
}
bats = [(18, 14), (22, 14), (21, 18), (17, 16), (6, 6), (10, 8)]

def props(**kw):
    out = []
    for k, v in kw.items():
        t = 'int' if isinstance(v, int) and not isinstance(v, bool) else 'string'
        out.append({'name': k, 'type': t, 'value': v})
    return out

oid = [200]
def obj(name, x, y, **kw):
    oid[0] += 1
    return {'height': 16, 'id': oid[0], 'name': name, 'properties': props(**kw), 'rotation': 0, 'type': '', 'visible': True,
            'width': 16, 'x': x * 16, 'y': y * 16}

targets = []
n = 0
for room, lst in rock_pos.items():
    for (x, y) in lst:
        assert floor[y][x], (x, y)
        targets.append(obj(f'crock{n}', x, y, id=f'crock{n}', texture='rock-grey', tool='pickaxe', variants='caveRocks', hits=3,
                           respawnMs=120000, stump='rubble',
                           hint='You need a pickaxe to break that rock. The market might sell one.'))
        n += 1
enemies = []
for i, (x, y) in enumerate(bats):
    assert floor[y][x]
    enemies.append(obj(f'bat{i}', x, y, id=f'bat{i}', type='bat'))

doors = [obj('to-quarry', 6, 21, toMap='quarry', toX=19, toY=4)]
npcs = [obj('sealeddoor', 21, 1, id='sealeddoor', texture='sealed-door', dialogue='sealeddoor',
            openFlag='stonedoor_cleared', openTexture='sealed-door-open', openDialogue='sealeddooropen')]
boss = [obj('granite', 20, 4, id='granite', kind='golem')]

quarry = json.load(open(f'{A}/maps/quarry.json'))
cave = {
    'compressionlevel': -1, 'height': H, 'width': W, 'infinite': False, 'orientation': 'orthogonal', 'renderorder': 'right-down',
    'tiledversion': '1.10.2', 'tileheight': 16, 'tilewidth': 16, 'type': 'map', 'version': '1.10',
    'nextlayerid': 8, 'nextobjectid': oid[0] + 1,
    'properties': [{'name': 'dark', 'type': 'bool', 'value': True}],  # the lantern lights a circle around you
    'tilesets': quarry['tilesets'],
    'layers': [
        {'data': ground, 'height': H, 'width': W, 'id': 1, 'name': 'ground', 'opacity': 1, 'type': 'tilelayer', 'visible': True, 'x': 0, 'y': 0},
        {'data': obstacles, 'height': H, 'width': W, 'id': 2, 'name': 'obstacles', 'opacity': 1, 'type': 'tilelayer', 'visible': True, 'x': 0, 'y': 0},
        {'draworder': 'topdown', 'id': 3, 'name': 'doors', 'objects': doors, 'opacity': 1, 'type': 'objectgroup', 'visible': True, 'x': 0, 'y': 0},
        {'draworder': 'topdown', 'id': 4, 'name': 'npcs', 'objects': npcs, 'opacity': 1, 'type': 'objectgroup', 'visible': True, 'x': 0, 'y': 0},
        {'draworder': 'topdown', 'id': 5, 'name': 'targets', 'objects': targets, 'opacity': 1, 'type': 'objectgroup', 'visible': True, 'x': 0, 'y': 0},
        {'draworder': 'topdown', 'id': 6, 'name': 'enemies', 'objects': enemies, 'opacity': 1, 'type': 'objectgroup', 'visible': True, 'x': 0, 'y': 0},
        {'draworder': 'topdown', 'id': 7, 'name': 'boss', 'objects': boss, 'opacity': 1, 'type': 'objectgroup', 'visible': True, 'x': 0, 'y': 0},
    ],
}
for (bx, by) in [(20, 4), (21, 4), (20, 5), (21, 5)]:
    assert floor[by][bx] and (bx, by) not in {(o['x'] // 16, o['y'] // 16) for o in targets}, (bx, by)
# every room reachable on foot from the entrance without breaking a rock?
rocks = {(o['x'] // 16, o['y'] // 16) for o in targets}
seen, q = {(6, 20)}, deque([(6, 20)])
while q:
    x, y = q.popleft()
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        nx, ny = x + dx, y + dy
        if 0 <= nx < W and 0 <= ny < H and floor[ny][nx] and (nx, ny) not in seen and (nx, ny) not in rocks and (nx, ny) != (21, 1):
            seen.add((nx, ny)); q.append((nx, ny))
allfloor = {(x, y) for y in range(H) for x in range(W) if floor[y][x] and (x, y) not in rocks and (x, y) not in {(21, 1), (6, 21)}}
missing = allfloor - seen
assert not missing, sorted(missing)[:10]
json.dump(cave, open(f'{A}/maps/cave.json', 'w'), separators=(',', ':'))

# ------------------------------------------------------------------ the cave mouth in the quarry (north cliff, above the sign)
QW = quarry['width']
L = {l['name']: l for l in quarry['layers']}
mx, my = 19, 3
L['obstacles']['data'][my * QW + mx] = 0
L['ground']['data'][my * QW + mx] = 8  # the dark cave-mouth tile
ds = L['doors']['objects']
ds[:] = [d for d in ds if d.get('name') != 'to-cave']
ds.append({'height': 16, 'id': 190, 'name': 'to-cave', 'rotation': 0, 'type': '', 'visible': True, 'width': 16, 'x': mx * 16, 'y': my * 16,
           'properties': props(toMap='cave', toX=6, toY=20, requiresItem='lantern',
                               lockedMsg='It is pitch black in there. You need a light.')})
json.dump(quarry, open(f'{A}/maps/quarry.json', 'w'), separators=(',', ':'))

# ------------------------------------------------------------------ data
rj = json.load(open('src/data/rocks.json'))
rj['caveRocks'] = [dict(r, weight=w) for r, w in zip(rj['rocks'], [30, 20, 16, 12, 12, 6])]
json.dump(rj, open('src/data/rocks.json', 'w'), indent=2)
ej = json.load(open('src/data/enemies.json'))
ej['bat'] = {'name': 'Cave Bat', 'texture': 'bat', 'hp': 3, 'damage': 1, 'moveMs': 450, 'attackMs': 1100, 'sight': 6, 'respawnMs': 40000, 'gold': 4}
json.dump(ej, open('src/data/enemies.json', 'w'), indent=2)
dj = json.load(open('src/data/dialogue.json'))
dj['sealeddoor'] = {
    'name': 'Stone Door',
    'lines': ['A huge stone door, carved with a ninja crest.', 'Beneath it are four sockets: a ruby, a sapphire and an emerald, and a round crest in the middle.'],
    'repeatLines': ['The stone door is sealed tight. Four sockets wait below the crest.'],
}
dj['sealeddooropen'] = {
    'name': 'Stone Door',
    'lines': ['The door stands open. A cold wind blows up from a dark passage, and it goes a long way down.', 'It is not ready for you yet... (To be continued)'],
    'repeatLines': ['The dark passage waits. (To be continued)'],
}
dj['granite'] = {
    'name': 'Granite',
    'lines': ['Granite is sorry for the rockfall. Granite is very glad the voice is gone.'],
    'repeatLines': ['Granite likes pickaxes now. They tickle.', 'Say hi to the bats for Granite. They are not so bad.'],
}
dj['cavesign'] = {
    'name': 'Sign',
    'lines': ['DANGER! Unstable cave. Bring a light.'],
    'repeatLines': ['DANGER! Unstable cave. Bring a light.'],
    'flagLines': {'treant_defeated': ['Your Heartwood Lantern glows warmly.', 'The cave mouth is just north of here. Watch out for bats!']},
}
json.dump(dj, open('src/data/dialogue.json', 'w'), indent=2, ensure_ascii=False)
open('src/data/dialogue.json', 'a').write('\n')
ej = json.load(open('src/data/enemies.json'))
ej['pebble'] = {'name': 'Pebble', 'texture': 'pebble', 'hp': 2, 'damage': 1, 'moveMs': 700, 'attackMs': 1300, 'sight': 9, 'respawnMs': 0, 'gold': 0}
json.dump(ej, open('src/data/enemies.json', 'w'), indent=2)
ij = json.load(open('src/data/items.json'))
ij['items']['crest-stone'] = {'name': 'Crest Stone', 'icon': 'crest', 'color': '#c9a24a',
                              'desc': 'Carved with a ninja crest. Granite guarded it for the cave builders. It fits the stone door.'}
json.dump(ij, open('src/data/items.json', 'w'), indent=2)
print('cave built:', len(targets), 'rocks,', len(enemies), 'bats')
