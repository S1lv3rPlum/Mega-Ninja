"""Builds the Crystal Caverns: public/assets/maps/crystal.json, crystal-tiles.png, bat-queen.png, moth.png, rock-crystal.png,
adds the door in cave.json (set into the stone door), and the data entries.
Run from the project folder:  python3 make_crystal_assets.py   (safe to run again)
"""
import json, random
from collections import deque
from PIL import Image

A = 'public/assets'
random.seed(23)

def sprite(rows, pal, path):
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch in pal:
                im.putpixel((x, y), pal[ch])
    im.save(path)

# ---- the Bat Queen: a bigger, crowned bat
sprite([
    "................",
    "......y..y......",
    "......yyyy......",
    "..kk..kppk..kk..",
    ".kppk.pppp.kppk.",
    "kpppppppppppppk.",
    "kpppppwppwpppppk",
    "kppppppppppppppk",
    ".kppkppwwppkppk.",
    "..kk.kpprrpk.kk.",
    "......pppppp....",
    ".......pppp.....",
    "........pp......",
    "................",
    "................",
    "................",
], {'k': (40, 12, 56, 255), 'p': (150, 60, 170, 255), 'w': (255, 255, 255, 255), 'r': (240, 40, 90, 255), 'y': (255, 210, 60, 255)},
   f'{A}/sprites/bat-queen.png')

# ---- a crystal moth: glowing pale wings
sprite([
    "................",
    "................",
    "...k........k...",
    "....k..kk..k....",
    "..bbbk.kk.kbbb..",
    ".bwwwbbkkbbwwwb.",
    ".bwcwwbkkbwwcwb.",
    ".bwwwwbkkbwwwwb.",
    "..bwwbbkkbbwwb..",
    "...bbb.kk.bbb...",
    "........kk......",
    ".......k..k.....",
    "................",
    "................",
    "................",
    "................",
], {'k': (40, 40, 80, 255), 'b': (90, 140, 220, 255), 'w': (190, 230, 255, 255), 'c': (120, 255, 240, 255)}, f'{A}/sprites/moth.png')

# ---- a crystal rock
sprite([
    "................",
    "................",
    ".....c..........",
    "....cwc...c.....",
    "....cwc..cwc....",
    "...kcwck.cwc....",
    "..kkcwcckkcck...",
    ".kgggcwcgggggk..",
    ".kggcgcccggggk..",
    "kgggggggggggggk.",
    "kggggcwcggggggk.",
    "kgggggcgggggggk.",
    ".kgggggggggggk..",
    "..kkkkkkkkkkk...",
    "................",
    "................",
], {'k': (30, 30, 50, 255), 'g': (110, 112, 140, 255), 'c': (90, 220, 240, 255), 'w': (225, 255, 255, 255)}, f'{A}/sprites/rock-crystal.png')

# ---- the tileset: 1 wall, 2 floor, 3 glowing floor, 4 crystal wall, 5 the way back up
def tile(draw):
    im = Image.new('RGBA', (16, 16))
    for y in range(16):
        for x in range(16):
            im.putpixel((x, y), draw(x, y))
    return im
def wall(x, y):
    base = (34, 28, 62, 255)
    if y % 8 == 0 or (x + (4 if (y // 8) % 2 else 0)) % 8 == 0:
        base = (22, 18, 44, 255)
    return base
def floor(x, y, glow=False):
    base = (48, 42, 84, 255)
    r = (x * 7 + y * 13) % 11
    if r == 0:
        base = (60, 54, 100, 255)
    if glow and (x, y) in [(4, 5), (5, 5), (4, 6), (10, 10), (11, 10), (11, 11)]:
        base = (120, 220, 240, 255)
    return base
def crystalwall(x, y):
    base = wall(x, y)
    for (cx, cy) in [(4, 10), (10, 6)]:
        for k in range(6):
            if abs(x - cx) <= (5 - k) // 2 and y == cy - k + 4 - (0):
                base = (120, 230, 250, 255) if x <= cx else (70, 170, 230, 255)
    return base
def up(x, y):
    d = abs(x - 7.5) + abs(y - 7.5)
    return (10, 8, 24, 255) if d < 10 else floor(x, y)
tiles = [tile(wall), tile(floor), tile(lambda x, y: floor(x, y, True)), tile(crystalwall), tile(up)]
sheet = Image.new('RGBA', (80, 16))
for i, t in enumerate(tiles):
    sheet.paste(t, (i * 16, 0))
sheet.save(f'{A}/tilesets/crystal-tiles.png')

# ------------------------------------------------------------------ the map
W, H = 36, 26
fl = [[False] * W for _ in range(H)]
def carve(x0, y0, x1, y1):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            fl[y][x] = True
carve(2, 1, 9, 6)      # A  Glimmer Hall (you arrive from the stone door)
carve(5, 7, 6, 9)
carve(2, 10, 14, 17)   # B  Crystal Gallery (the scout's note)
carve(15, 13, 18, 14)
carve(19, 9, 30, 16)   # C  Moth Garden
carve(24, 17, 25, 19)
carve(16, 20, 32, 24)  # D  the Queen's Roost
carve(29, 3, 33, 6)    # E  the hidden nook (a market door goes here later)
carve(30, 7, 31, 8)
for p in [(7, 12), (7, 15), (11, 12), (11, 15), (23, 12), (27, 13), (21, 22), (28, 22)]:   # pillars
    fl[p[1]][p[0]] = False
fl[0][4] = True        # the way back up to the stone door
fl[2][31] = True       # the hidden crack in the nook wall: the way to the Shadow Market

ground, obstacles = [], []
for y in range(H):
    for x in range(W):
        if fl[y][x]:
            g = 5 if (x, y) in ((4, 0), (31, 2)) else (3 if random.random() < 0.12 else 2)
            ground.append(g); obstacles.append(0)
        else:
            ground.append(2)
            # walls that touch a floor tile get crystals now and then
            obstacles.append(4 if random.random() < 0.18 else 1)

def props(**kw):
    out = []
    for k, v in kw.items():
        t = 'int' if isinstance(v, int) and not isinstance(v, bool) else 'string'
        out.append({'name': k, 'type': t, 'value': v})
    return out
oid = [400]
def obj(name, x, y, **kw):
    oid[0] += 1
    return {'height': 16, 'id': oid[0], 'name': name, 'properties': props(**kw), 'rotation': 0, 'type': '', 'visible': True,
            'width': 16, 'x': x * 16, 'y': y * 16}

rock_pos = {'A': [(3, 2), (8, 5), (3, 5)], 'B': [(3, 11), (13, 11), (4, 16), (13, 16), (9, 13)],
            'C': [(20, 10), (29, 10), (21, 15), (29, 15), (25, 11)], 'D': [(17, 21), (31, 21), (18, 23), (30, 23)],
            'E': [(30, 4), (32, 5)]}
targets = []
n = 0
for room, lst in rock_pos.items():
    for (x, y) in lst:
        assert fl[y][x], (x, y)
        targets.append(obj(f'xrock{n}', x, y, id=f'xrock{n}', texture='rock-crystal', tool='pickaxe', variants='crystalRocks',
                           hits=3, respawnMs=120000, stump='rubble', hint='You need a pickaxe to break that rock.'))
        n += 1
moths = [(21, 12), (26, 14), (24, 10), (7, 3), (10, 14)]
bats = [(20, 22), (25, 21), (29, 21), (12, 13), (4, 13)]
enemies = [obj(f'moth{i}', x, y, id=f'moth{i}', type='moth') for i, (x, y) in enumerate(moths)]
enemies += [obj(f'xbat{i}', x, y, id=f'xbat{i}', type='bat') for i, (x, y) in enumerate(bats)]
enemies.append(obj('batqueen', 24, 22, id='batqueen', type='batqueen', hideIfFlag='batqueen_defeated'))
for o in enemies:
    ox, oy = o['x'] // 16, o['y'] // 16
    assert fl[oy][ox], (ox, oy)
npcs = [obj('crystalnote', 3, 12, id='crystalnote', texture='sign', dialogue='crystalnote'),
        obj('nooksign', 31, 5, id='nooksign', texture='sign', dialogue='nooksign')]
doors = [obj('to-cave', 4, 0, toMap='cave', toX=21, toY=2),
         obj('to-market', 31, 2, toMap='market', toX=15, toY=19, requiresItem='crystal-lantern',
             lockedMsg='A crack in the wall. It is too dim to see through. A brighter light might help.')]

cave = json.load(open(f'{A}/maps/cave.json'))
crystal = {
    'compressionlevel': -1, 'height': H, 'width': W, 'infinite': False, 'orientation': 'orthogonal', 'renderorder': 'right-down',
    'tiledversion': '1.10.2', 'tileheight': 16, 'tilewidth': 16, 'type': 'map', 'version': '1.10',
    'nextlayerid': 8, 'nextobjectid': oid[0] + 1,
    'properties': [{'name': 'dark', 'type': 'bool', 'value': True}],
    'tilesets': [{'columns': 5, 'firstgid': 1, 'image': '../tilesets/crystal-tiles.png', 'imageheight': 16, 'imagewidth': 80, 'margin': 0,
                  'name': 'crystal-tiles', 'spacing': 0, 'tilecount': 5, 'tileheight': 16, 'tilewidth': 16}],
    'layers': [
        {'data': ground, 'height': H, 'width': W, 'id': 1, 'name': 'ground', 'opacity': 1, 'type': 'tilelayer', 'visible': True, 'x': 0, 'y': 0},
        {'data': obstacles, 'height': H, 'width': W, 'id': 2, 'name': 'obstacles', 'opacity': 1, 'type': 'tilelayer', 'visible': True, 'x': 0, 'y': 0},
        {'draworder': 'topdown', 'id': 3, 'name': 'doors', 'objects': doors, 'opacity': 1, 'type': 'objectgroup', 'visible': True, 'x': 0, 'y': 0},
        {'draworder': 'topdown', 'id': 4, 'name': 'npcs', 'objects': npcs, 'opacity': 1, 'type': 'objectgroup', 'visible': True, 'x': 0, 'y': 0},
        {'draworder': 'topdown', 'id': 5, 'name': 'targets', 'objects': targets, 'opacity': 1, 'type': 'objectgroup', 'visible': True, 'x': 0, 'y': 0},
        {'draworder': 'topdown', 'id': 6, 'name': 'enemies', 'objects': enemies, 'opacity': 1, 'type': 'objectgroup', 'visible': True, 'x': 0, 'y': 0},
    ],
}
# reachable on foot from the arrival tile without breaking any rock (signs/npcs block too)
blocked = {(o['x'] // 16, o['y'] // 16) for o in targets + npcs}
seen, q = {(4, 1)}, deque([(4, 1)])
while q:
    x, y = q.popleft()
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        nx, ny = x + dx, y + dy
        if 0 <= nx < W and 0 <= ny < H and fl[ny][nx] and (nx, ny) not in seen and (nx, ny) not in blocked and (nx, ny) not in ((4, 0), (31, 2)):
            seen.add((nx, ny)); q.append((nx, ny))
allfloor = {(x, y) for y in range(H) for x in range(W) if fl[y][x] and (x, y) not in blocked and (x, y) not in ((4, 0), (31, 2))}
assert not (allfloor - seen), sorted(allfloor - seen)[:10]
json.dump(crystal, open(f'{A}/maps/crystal.json', 'w'), separators=(',', ':'))

# ---- the door in the cave, set into the stone door: opens once the door is open
for l in cave['layers']:
    if l['name'] == 'doors':
        l['objects'][:] = [d for d in l['objects'] if d.get('name') != 'to-crystal']
        l['objects'].append({'height': 16, 'id': 399, 'name': 'to-crystal', 'rotation': 0, 'type': '', 'visible': True, 'width': 16,
                             'x': 21 * 16, 'y': 1 * 16,
                             'properties': props(toMap='crystal', toX=4, toY=1, requiresFlag='stonedoor_cleared',
                                                 lockedMsg='The stone door is sealed.')})
    if l['name'] == 'npcs':
        for o in l['objects']:
            if o['name'] == 'sealeddoor' and not any(p['name'] == 'passable' for p in o['properties']):
                o['properties'] += props(passable='yes')   # once open, you can walk through it
json.dump(cave, open(f'{A}/maps/cave.json', 'w'), separators=(',', ':'))

# ------------------------------------------------------------------ data
rj = json.load(open('src/data/rocks.json'))
rj['crystalRocks'] = [
    {'id': 'crystal', 'weight': 40, 'hits': 4, 'drop': 'crystal', 'amount': 2, 'texture': 'rock-crystal', 'msg': 'Glow crystals!'},
    {'id': 'sapphire', 'weight': 18, 'hits': 5, 'drop': 'sapphire', 'amount': 1, 'texture': 'rock-sapphire', 'msg': 'A sapphire!'},
    {'id': 'emerald', 'weight': 14, 'hits': 6, 'drop': 'emerald', 'amount': 1, 'texture': 'rock-emerald', 'msg': 'An emerald!'},
    {'id': 'ruby', 'weight': 12, 'hits': 7, 'drop': 'ruby', 'amount': 1, 'texture': 'rock-ruby', 'msg': 'A ruby!'},
    {'id': 'diamond', 'weight': 8, 'hits': 8, 'drop': 'diamond', 'amount': 1, 'texture': 'rock-diamond', 'msg': 'A DIAMOND!'},
    {'id': 'grey', 'weight': 8, 'hits': 3, 'drop': 'stone', 'amount': 2, 'texture': 'rock-grey', 'msg': 'Rock smashed!'},
]
json.dump(rj, open('src/data/rocks.json', 'w'), indent=2)

ej = json.load(open('src/data/enemies.json'))
ej['moth'] = {'name': 'Crystal Moth', 'texture': 'moth', 'hp': 2, 'damage': 1, 'moveMs': 520, 'attackMs': 1400, 'sight': 5,
              'respawnMs': 40000, 'gold': 3, 'tame': 'moth'}
ej['batqueen'] = {'name': 'Bat Queen', 'texture': 'bat-queen', 'hp': 16, 'damage': 2, 'moveMs': 480, 'attackMs': 1200, 'sight': 12,
                  'respawnMs': 31536000000, 'gold': 40, 'boss': True, 'flag': 'batqueen_defeated',
                  'summon': {'type': 'bat', 'everyMs': 6500, 'max': 2},
                  'reward': {'item': 'crystal-lantern', 'msg': 'The Bat Queen is beaten! She dropped the Crystal Lantern.'},
                  'defeatLines': ['The Bat Queen tumbles from the air with a squeak, her crown rolling across the floor.',
                                  'The dark whisper that drove the bats is gone. She flutters off to sleep, leaving a glowing lantern behind.']}
json.dump(ej, open('src/data/enemies.json', 'w'), indent=2)

fj = json.load(open('src/data/friends.json'))
fj['kinds']['moth'] = {'name': 'Crystal Moth', 'baseName': 'Glimmer', 'texture': 'moth', 'treat': 'crystal'}
json.dump(fj, open('src/data/friends.json', 'w'), indent=2)

ij = json.load(open('src/data/items.json'))
ij['items']['crystal'] = {'name': 'Glow Crystal', 'icon': 'gem', 'color': '#5fe6f2', 'desc': 'A softly glowing crystal. Moths love it.'}
ij['items']['crystal-lantern'] = {'name': 'Crystal Lantern', 'icon': 'lantern', 'color': '#7fe8ff',
                                  'desc': 'The Bat Queen\'s lantern. It shines much brighter than yours, and it may reveal hidden things.'}
json.dump(ij, open('src/data/items.json', 'w'), indent=2)

sj = json.load(open('src/data/shop.json'))
sj['general']['sell']['crystal'] = 12
json.dump(sj, open('src/data/shop.json', 'w'), indent=2)

dj = json.load(open('src/data/dialogue.json'))
dj['crystalnote'] = {
    'name': 'Torn Note',
    'lines': ['A scout\'s note, half buried in glittering dust:', '"Sensei - the princess came through here three nights ago, carrying the Moon Crest."',
              '"The bats down here serve a Queen who sleeps in the roost to the south. Something whispers in her dreams. Do not wake her."'],
    'repeatLines': ['"...the princess went on alone. Find her. - a worried scout"'],
}
dj['nooksign'] = {
    'name': 'Cold Draft',
    'lines': ['A cold draft seeps through a crack in the crystal wall. You hear faint, strange music behind it.'],
    'repeatLines': ['The crack in the wall is too dim to see through. A brighter light might show the way.'],
    'flagLines': {},
}
dj['sealeddooropen'] = {'name': 'Stone Door', 'lines': ['The door stands open. A cold wind blows up from the deep.'], 'repeatLines': ['The passage leads down into the Crystal Caverns.']}
json.dump(dj, open('src/data/dialogue.json', 'w'), indent=2, ensure_ascii=False)
open('src/data/dialogue.json', 'a').write('\n')
print('crystal caverns built:', len(targets), 'rocks,', len(enemies), 'creatures')
