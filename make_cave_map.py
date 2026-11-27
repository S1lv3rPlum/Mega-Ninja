# Builds the big cave (public/assets/maps/cave.json): 8 chambers joined by tunnels, a few blocked by rocks.
# Run: python3 make_cave_map.py     (keeps the stone door, Granite and the quarry/crystal doors working)
import json, random, copy
from collections import deque
P = 'public/assets/maps/cave.json'
old = json.load(open(P))
W, H = 46, 36
random.seed(7)

ROOMS = {  # id: (name, x0, y0, x1, y1)
    'mouth':   ('Entrance Cavern', 3, 28, 13, 34),
    'echo':    ('Echo Hall', 3, 18, 12, 24),
    'roost':   ('Bat Roost', 3, 6, 12, 13),
    'granite': ("Granite's Hall", 15, 2, 27, 7),
    'cross':   ('Lantern Crossing', 17, 14, 27, 22),
    'grotto':  ('Mushroom Grotto', 17, 26, 27, 33),
    'mine':    ('Collapsed Mine', 31, 15, 43, 23),
    'vault':   ('Hidden Vault', 33, 3, 43, 10),
}
TUNNELS = [  # (x0,y0,x1,y1)
    (7, 25, 8, 27),    # mouth - echo
    (14, 30, 16, 31),  # mouth - grotto
    (7, 14, 8, 17),    # echo - roost (rocks)
    (13, 20, 16, 21),  # echo - crossing
    (13, 6, 14, 7),    # roost - granite
    (21, 8, 22, 13),   # crossing - granite
    (22, 23, 23, 25),  # crossing - grotto
    (28, 18, 30, 19),  # crossing - mine (rocks)
    (37, 11, 38, 14),  # mine - vault (rocks)
    (15, 15, 16, 16),  # little nook off the crossing
    (24, 34, 25, 34),  # (unused filler, harmless)
]
GATES = [(7, 15), (8, 15), (29, 18), (29, 19), (37, 12), (38, 12)]
PILLARS = [(6, 20), (7, 20), (10, 9), (11, 9), (21, 17), (22, 17), (21, 18), (22, 18), (20, 29), (21, 29), (24, 29),
           (35, 18), (36, 18), (39, 20), (40, 20), (36, 6), (37, 6), (40, 8), (6, 31), (11, 31)]
DOOR = (8, 35)

floor = set()
for _, x0, y0, x1, y1 in ROOMS.values():
    floor |= {(x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)}
for x0, y0, x1, y1 in TUNNELS[:-1]:
    floor |= {(x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)}
floor -= set(PILLARS)
floor.add((21, 1))   # the stone door
floor.add(DOOR)

# decor rocks
rocks = []
def spot(room, n, avoid):
    _, x0, y0, x1, y1 = ROOMS[room]
    got = []
    tries = 0
    while len(got) < n and tries < 300:
        tries += 1
        x, y = random.randint(x0 + 1, x1 - 1), random.randint(y0 + 1, y1 - 1)
        if (x, y) in floor and (x, y) not in avoid and all(abs(x - a) + abs(y - b) > 2 for a, b in got):
            got.append((x, y))
    return got
taken = set(GATES) | {(20, 4), (21, 2), (8, 34), (8, 33)}
reserved = {(7, 26), (8, 26)}
for room, n in [('mouth', 1), ('echo', 3), ('roost', 3), ('cross', 3), ('grotto', 3), ('mine', 4), ('vault', 3)]:
    for p in spot(room, n, taken | reserved):
        rocks.append(p); taken.add(p)
for p in [(17, 3), (25, 6), (26, 3)]:   # granite hall: a few at the edges
    rocks.append(p); taken.add(p)

# connectivity check: decor rocks block, gates are open
def reach(blocked, start=(8, 34)):
    seen = {start}; q = deque([start])
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (x + dx, y + dy)
            if n in floor and n not in blocked and n not in seen:
                seen.add(n); q.append(n)
    return seen
r = reach(set(rocks))
for k, (name, x0, y0, x1, y1) in ROOMS.items():
    assert (x0 + 1, y0 + 1) in r or any((x, y) in r for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)), k
need = {(x, y) for x in range(ROOMS['mouth'][1], ROOMS['mouth'][3] + 1) for y in range(ROOMS['mouth'][2], ROOMS['mouth'][4] + 1)}
# every room tile that is floor and not a rock must be reachable (when gates are open)
unreach = [p for p in floor if p not in r and p not in rocks and p != (21, 1)]
assert not unreach, unreach[:10]
# without breaking the gates, the vault must be cut off
r2 = reach(set(rocks) | set(GATES))
assert (38, 6) not in r2 and (38, 20) not in r2 and (10, 9) not in r2, 'gates do not gate'
print('rooms ok;', len(rocks), 'decor rocks')

# bats
bat_spots = []
for room, n in [('echo', 1), ('roost', 3), ('cross', 2), ('grotto', 2), ('mine', 3), ('vault', 2)]:
    for p in spot(room, n, taken | reserved):
        bat_spots.append(p); taken.add(p)

# tile layers
ground, obst = [], []
for y in range(H):
    for x in range(W):
        g = 6 if random.random() < 0.05 else 7
        if (x, y) == DOOR: g = 8
        ground.append(g)
        obst.append(0 if (x, y) in floor else 5)

def prop(name, typ, v): return {'name': name, 'type': typ, 'value': v}
nid = [1000]
def obj(name, x, y, props, w=16, h=16):
    nid[0] += 1
    return {'height': h, 'id': nid[0], 'name': name, 'properties': props, 'rotation': 0, 'type': '', 'visible': True, 'width': w, 'x': x * 16, 'y': y * 16}

layers = copy.deepcopy(old['layers'])
by = {l['name']: l for l in layers}
by['ground']['data'] = ground; by['ground']['width'] = W; by['ground']['height'] = H
by['obstacles']['data'] = obst; by['obstacles']['width'] = W; by['obstacles']['height'] = H
# doors: to-quarry moves to the new mouth; to-crystal stays
for o in by['doors']['objects']:
    if o['name'] == 'to-quarry':
        o['x'], o['y'] = DOOR[0] * 16, DOOR[1] * 16
        for p in o['properties']:
            if p['name'] == 'toX': p['value'] = 19
            if p['name'] == 'toY': p['value'] = 4
# targets
tg = []
for i, (x, y) in enumerate(rocks):
    tg.append(obj(f'crock{i}', x, y, [prop('id', 'string', f'crock{i}'), prop('texture', 'string', 'rock-grey'), prop('tool', 'string', 'pickaxe'), prop('variants', 'string', 'caveRocks'), prop('hits', 'int', 3), prop('respawnMs', 'int', 120000), prop('stump', 'string', 'rubble'), prop('hint', 'string', 'You need a pickaxe to break that rock. The Miner in the Quarry sells one.')]))
for i, (x, y) in enumerate(GATES):
    tg.append(obj(f'gate{i}', x, y, [prop('id', 'string', f'gate{i}'), prop('texture', 'string', 'rock-grey'), prop('tool', 'string', 'pickaxe'), prop('hits', 'int', 4), prop('drop', 'string', 'stone'), prop('amount', 'int', 1), prop('stump', 'string', 'rubble'), prop('hint', 'string', 'A pile of rock blocks the tunnel. A pickaxe would clear it.')]))
by['targets']['objects'] = tg
by['enemies']['objects'] = [obj(f'bat{i}', x, y, [prop('id', 'string', f'bat{i}'), prop('type', 'string', 'bat')]) for i, (x, y) in enumerate(bat_spots)]
# chest + chambers
by['npcs']['objects'].append(obj('cavechest', 38, 5, [prop('id', 'string', 'cavechest'), prop('texture', 'string', 'chest'), prop('dialogue', 'string', 'cavechest'), prop('role', 'string', 'chest'), prop('openFlag', 'string', 'cave_chest_open'), prop('openTexture', 'string', 'chest-open'), prop('openDialogue', 'string', 'cavechestopen')]))
ch = {'draworder': 'topdown', 'id': 20, 'name': 'chambers', 'objects': [], 'opacity': 1, 'type': 'objectgroup', 'visible': True, 'x': 0, 'y': 0}
for k, (name, x0, y0, x1, y1) in ROOMS.items():
    ch['objects'].append(obj(k, x0, y0, [prop('id', 'string', k), prop('name', 'string', name)], w=(x1 - x0 + 1) * 16, h=(y1 - y0 + 1) * 16))
layers.append(ch)
old['layers'] = layers
old['width'], old['height'] = W, H
old['nextobjectid'] = nid[0] + 10
old['nextlayerid'] = 30
json.dump(old, open(P, 'w'))
json.dump({'to-quarry': DOOR}, open('/tmp/x/door.json', 'w'))
# print a picture
for y in range(H):
    row = ''
    for x in range(W):
        c = '#'
        if (x, y) in floor: c = '.'
        if (x, y) in rocks: c = 'o'
        if (x, y) in GATES: c = 'G'
        if (x, y) in bat_spots: c = 'b'
        if (x, y) == (38, 5): c = 'C'
        if (x, y) == (20, 4): c = 'B'
        row += c
    print(row)
