"""Builds the Shadow Market (the hidden dark-magic market): public/assets/maps/market.json, market-tiles.png, vendor sprites,
and its data (dialogue, shop stalls). Run from the project folder:  python3 make_market_assets.py   (safe to run again)
Run make_crystal_assets.py first: it makes the hidden door that leads here.
"""
import json
from collections import deque
from PIL import Image

A = 'public/assets'

def sprite(rows, pal, path):
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch in pal:
                im.putpixel((x, y), pal[ch])
    im.save(path)

def hooded(cloak, trim, path):
    rows = [
        "................",
        "......kkkk......",
        ".....kccccck....",
        "....kcccccck....",
        "....kcckkcck....",
        "....kcyykyck....",
        "....kcckkcck....",
        ".....kccccck....",
        "....kcctttcck...",
        "...kccctttccck..",
        "...kcccttcccck..",
        "...kccccccccck..",
        "...kccccccccck..",
        "....kcccccccck..",
        "....kkkkkkkkkk..",
        "................",
    ]
    sprite(rows, {'k': (20, 14, 30, 255), 'c': cloak, 't': trim, 'y': (255, 220, 90, 255)}, path)
hooded((90, 40, 120, 255), (200, 160, 255, 255), f'{A}/sprites/hexsmith.png')     # the weapon smith: deep purple
hooded((30, 90, 100, 255), (120, 240, 220, 255), f'{A}/sprites/hexcreature.png')  # the creature stall: teal
hooded((120, 50, 70, 255), (255, 170, 190, 255), f'{A}/sprites/hexcharm.png')     # the charm stall: plum red

# ---- tileset: 1 cobble, 2 light cobble, 3 lamp-lit cobble, 4 purple awning, 5 teal awning, 6 wall, 7 counter, 8 arch
def tile(f):
    im = Image.new('RGBA', (16, 16))
    for y in range(16):
        for x in range(16):
            im.putpixel((x, y), f(x, y))
    return im
def cobble(x, y, light=0):
    seam = (x % 8 == 0) or (y % 8 == 0) or (x % 8 == 4 and (y // 8) % 2)
    if seam:
        return (28, 22, 44, 255)
    v = 52 + ((x * 5 + y * 9) % 7) * 2
    return (v + light, v - 4 + light, v + 30 + light // 2, 255)
def lamp(x, y):
    d = ((x - 7.5) ** 2 + (y - 7.5) ** 2) ** 0.5
    if d < 2.2:
        return (255, 230, 140, 255)
    if d < 6:
        c = cobble(x, y)
        k = (6 - d) / 6
        return (min(255, int(c[0] + 120 * k)), min(255, int(c[1] + 90 * k)), min(255, int(c[2] + 20 * k)), 255)
    return cobble(x, y)
def awning(c1, c2):
    def f(x, y):
        base = c1 if (x // 4) % 2 == 0 else c2
        if y >= 13:
            return (base[0] // 2, base[1] // 2, base[2] // 2, 255)
        return base + (255,)
    return f
def wall(x, y):
    base = (36, 28, 60, 255)
    if y % 8 == 0 or (x + (4 if (y // 8) % 2 else 0)) % 8 == 0:
        base = (20, 14, 36, 255)
    return base
def counter(x, y):
    if y < 4:
        return (150, 110, 80, 255)
    if y < 6:
        return (110, 76, 56, 255)
    return (70, 48, 38, 255) if (x % 5) else (50, 34, 28, 255)
def arch(x, y):
    d = abs(x - 7.5) + abs(y - 7.5)
    return (8, 6, 20, 255) if d < 10 else cobble(x, y)
fs = [lambda x, y: cobble(x, y), lambda x, y: cobble(x, y, 10), lamp, awning((130, 60, 170), (80, 30, 110)),
      awning((50, 160, 160), (30, 100, 110)), wall, counter, arch]
sheet = Image.new('RGBA', (16 * len(fs), 16))
for i, f in enumerate(fs):
    sheet.paste(tile(f), (i * 16, 0))
sheet.save(f'{A}/tilesets/market-tiles.png')

# ---- the map
W, H = 32, 22
ground = [1] * (W * H)
obstacles = [0] * (W * H)
def put(layer, x, y, g):
    layer[y * W + x] = g
for y in range(H):
    for x in range(W):
        if x in (0, W - 1) or y in (0, 1, H - 1):
            put(obstacles, x, y, 6)
        elif (x * 7 + y * 3) % 11 == 0:
            put(ground, x, y, 2)
for (lx, ly) in [(5, 8), (12, 8), (19, 8), (26, 8), (8, 14), (23, 14), (15, 11), (4, 18), (27, 18)]:
    put(ground, lx, ly, 3)                       # lamp-lit spots
put(obstacles, 15, H - 1, 0); put(ground, 15, H - 1, 8)   # the way out (arch)
stalls = {5: 4, 12: 5, 19: 4, 26: 5}             # centre x -> awning tile
for cx, aw in stalls.items():
    for x in (cx - 1, cx, cx + 1):
        put(obstacles, x, 2, aw)
    put(obstacles, cx - 1, 3, 7); put(obstacles, cx + 1, 3, 7)
for (cx, cy) in [(9, 12), (10, 12), (21, 12), (22, 12), (14, 16), (17, 16)]:   # crates and barrels in the square
    put(obstacles, cx, cy, 7)

def props(**kw):
    out = []
    for k, v in kw.items():
        t = 'int' if isinstance(v, int) and not isinstance(v, bool) else 'string'
        out.append({'name': k, 'type': t, 'value': v})
    return out
oid = [600]
def obj(name, x, y, **kw):
    oid[0] += 1
    return {'height': 16, 'id': oid[0], 'name': name, 'properties': props(**kw), 'rotation': 0, 'type': '', 'visible': True,
            'width': 16, 'x': x * 16, 'y': y * 16}

npcs = [
    obj('hexsmith', 5, 3, id='hexsmith', texture='hexsmith', dialogue='hexsmith', smith='hex'),
    obj('hexcreature', 12, 3, id='hexcreature', texture='hexcreature', dialogue='hexcreature', shop='hexcreature'),
    obj('hexcharm', 19, 3, id='hexcharm', texture='hexcharm', dialogue='hexcharm', shop='hexcharm'),
    obj('closedsign', 26, 3, id='closedsign', texture='sign', dialogue='closedstall'),
    obj('hexcust1', 8, 10, id='hexcust1', texture='npc', dialogue='hexcust1', walkRadius=3),
    obj('hexcust2', 16, 13, id='hexcust2', texture='npc', dialogue='hexcust2', walkRadius=3),
    obj('hexcust3', 24, 10, id='hexcust3', texture='npc', dialogue='hexcust3', walkRadius=3),
    obj('hexcust4', 12, 17, id='hexcust4', texture='npc', dialogue='hexcust4', walkRadius=3),
]
doors = [obj('to-crystal', 15, H - 1, toMap='crystal', toX=31, toY=3)]

crystal = json.load(open(f'{A}/maps/crystal.json'))
market = {
    'compressionlevel': -1, 'height': H, 'width': W, 'infinite': False, 'orientation': 'orthogonal', 'renderorder': 'right-down',
    'tiledversion': '1.10.2', 'tileheight': 16, 'tilewidth': 16, 'type': 'map', 'version': '1.10',
    'nextlayerid': 6, 'nextobjectid': oid[0] + 1,
    'tilesets': [{'columns': 8, 'firstgid': 1, 'image': '../tilesets/market-tiles.png', 'imageheight': 16, 'imagewidth': 128, 'margin': 0,
                  'name': 'market-tiles', 'spacing': 0, 'tilecount': 8, 'tileheight': 16, 'tilewidth': 16}],
    'layers': [
        {'data': ground, 'height': H, 'width': W, 'id': 1, 'name': 'ground', 'opacity': 1, 'type': 'tilelayer', 'visible': True, 'x': 0, 'y': 0},
        {'data': obstacles, 'height': H, 'width': W, 'id': 2, 'name': 'obstacles', 'opacity': 1, 'type': 'tilelayer', 'visible': True, 'x': 0, 'y': 0},
        {'draworder': 'topdown', 'id': 3, 'name': 'doors', 'objects': doors, 'opacity': 1, 'type': 'objectgroup', 'visible': True, 'x': 0, 'y': 0},
        {'draworder': 'topdown', 'id': 4, 'name': 'npcs', 'objects': npcs, 'opacity': 1, 'type': 'objectgroup', 'visible': True, 'x': 0, 'y': 0},
    ],
}
# each stall can be reached from the square (the tile below the vendor is open), and the exit is reachable
free = lambda x, y: 0 <= x < W and 0 <= y < H and obstacles[y * W + x] == 0
for cx in stalls:
    assert free(cx, 4), cx
npc_tiles = {(o['x'] // 16, o['y'] // 16) for o in npcs}
seen, q = {(15, 19)}, deque([(15, 19)])
while q:
    x, y = q.popleft()
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        nx, ny = x + dx, y + dy
        if free(nx, ny) and (nx, ny) not in seen and (nx, ny) not in npc_tiles:
            seen.add((nx, ny)); q.append((nx, ny))
for cx in stalls:
    assert (cx, 4) in seen
assert (15, H - 1) in {(x, y) for (x, y) in seen}, 'exit'
json.dump(market, open(f'{A}/maps/market.json', 'w'), separators=(',', ':'))

# ---- data
dj = json.load(open('src/data/dialogue.json'))
dj['hexsmith'] = {
    'name': 'Hexsmith',
    'lines': ['Heh heh... a customer with a lantern. Not many find my little corner of the dark.',
              'I forge weapons nobody else would dare to. Bring me gold and glow crystals, and I will make you something special.'],
    'offer': 'Today I could forge {name}: {desc}. It takes time. Come back after you have wandered off, and it will be waiting.',
    'ordered': 'Deal! The forge is already glowing. Go on, wander off... and come back later.',
    'working': 'Patience! The {name} is still cooling. Leave the market and come back, and it will be ready.',
    'ready': 'Ah, there you are! Your {name} is ready. Handle it with care... it bites.',
    'done': 'I have nothing finer left to forge for you. You carry my best work.',
    'farewell': 'Heh heh. The dark will wait.',
    'repeatLines': ['Back again? Let us see what I can forge for you.'],
}
dj['hexcreature'] = {
    'name': 'Critter Seller', 'lines': ['Psst! Treats for little friends. Furry ones, flappy ones, glowy ones. All of them love a snack.'],
    'menu': 'Which treat?', 'farewell': 'Be kind to your friends!', 'repeatLines': ['Treats for your little friends?']}
dj['hexcharm'] = {
    'name': 'Charm Seller', 'lines': ['Shiny things! I pay well for gems and glow crystals. Better than the daytime market, hee hee.'],
    'menu': 'Selling?', 'farewell': 'Come back with more sparkle!', 'repeatLines': ['Got any sparkle for me?']}
dj['closedstall'] = {'name': 'Sign', 'lines': ['This stall is closed. A brewing pot bubbles inside. "Back soon. - The Brewer"'], 'repeatLines': ['Closed. Something purple is bubbling inside.']}
dj['hexcust1'] = {'name': 'Hooded Shopper', 'lines': ['I came for a lucky charm. The seller says all her charms are a little bit haunted.'], 'repeatLines': ['Haunted charms are the best kind.']}
dj['hexcust2'] = {'name': 'Cloaked Traveler', 'lines': ['Shh. Do not tell the daylight folk about this place. They would want a discount.'], 'repeatLines': ['Our secret.']}
dj['hexcust3'] = {'name': 'Little Witch', 'lines': ['My pet bat has no name yet. Do you have any ideas?', 'Everyone says friends are better when you pick the name yourself.'], 'repeatLines': ['Maybe I will call her Biscuit.']}
dj['hexcust4'] = {'name': 'Gloomy Shopper', 'lines': ['I heard a princess passed through here, asking about a Moon Crest.', 'She did not buy anything. She just looked sad and kept going.'], 'repeatLines': ['Tell her I said hello, if you find her.']}
json.dump(dj, open('src/data/dialogue.json', 'w'), indent=2, ensure_ascii=False)
open('src/data/dialogue.json', 'a').write('\n')

sj = json.load(open('src/data/shop.json'))
sj['hexcreature'] = {'offers': [
    {'id': 'carrot', 'type': 'item', 'item': 'carrot', 'amount': 3, 'label': '3 Carrots', 'price': 18},
    {'id': 'herb', 'type': 'item', 'item': 'herb', 'amount': 3, 'label': '3 Herbs', 'price': 12},
    {'id': 'pumpkin', 'type': 'item', 'item': 'pumpkin', 'amount': 1, 'label': '1 Pumpkin', 'price': 50},
    {'id': 'crystal', 'type': 'item', 'item': 'crystal', 'amount': 1, 'label': '1 Glow Crystal', 'price': 30}], 'sell': {}}
sj['hexcharm'] = {'offers': [], 'sell': {'crystal': 20, 'sapphire': 40, 'emerald': 65, 'ruby': 100, 'diamond': 320}}
json.dump(sj, open('src/data/shop.json', 'w'), indent=2)
print('shadow market built')
