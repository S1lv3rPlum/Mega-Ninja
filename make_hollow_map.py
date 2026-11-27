# Builds the Cursed Hollow (public/assets/maps/hollow.json) and cuts the thorn door into the Forest's west wall.
# Run: python3 make_hollow_map.py
import json, random, copy
from collections import deque
random.seed(11)
W, H = 40, 32
COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple']
GLADES = {  # colour: (x0, y0, x1, y1) of the clearing
    'red': (3, 3, 11, 9), 'orange': (16, 1, 24, 7), 'yellow': (28, 3, 36, 9),
    'green': (3, 23, 11, 29), 'blue': (16, 25, 24, 30), 'purple': (28, 23, 36, 29),
}
ARENA = (15, 11, 25, 21)
LINKS = [  # corridors (x0,y0,x1,y1)
    (26, 15, 39, 17),                      # the way in from the Forest
    (6, 10, 7, 14), (6, 13, 14, 14),       # red
    (19, 8, 21, 10),                       # orange
    (31, 10, 32, 14), (26, 13, 32, 14),    # yellow
    (6, 18, 7, 22), (6, 18, 14, 19),       # green
    (19, 22, 21, 24),                      # blue
    (31, 18, 32, 22), (26, 18, 32, 19),    # purple
]
DOOR = (39, 16)
ARRIVE = (38, 16)
floor = set()
def add(r):
    x0, y0, x1, y1 = r
    floor.update((x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1))
for g in GLADES.values(): add(g)
add(ARENA)
for l in LINKS: add(l)
path = set()
for l in LINKS:
    x0, y0, x1, y1 = l
    path.update((x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1))

def center(g): return ((g[0] + g[2]) // 2, (g[1] + g[3]) // 2)
keep = {DOOR, ARRIVE, (20, 16)}
for c, g in GLADES.items():
    cx, cy = center(g)
    keep |= {(cx, cy), (cx + 2, cy), (cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)}
# a few single trees to make it feel like a wood (never on the key spots, never cutting the way)
trees = set()
cand = [p for p in floor if p not in keep and p not in path and not (ARENA[0] + 2 <= p[0] <= ARENA[2] - 2 and ARENA[1] + 2 <= p[1] <= ARENA[3] - 2)]
random.shuffle(cand)
def reach(blocked):
    start = ARRIVE
    seen = {start}; q = deque([start])
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (x + dx, y + dy)
            if n in floor and n not in blocked and n not in seen:
                seen.add(n); q.append(n)
    return seen
for p in cand:
    if len(trees) >= 34: break
    if any(abs(p[0] - t[0]) + abs(p[1] - t[1]) < 3 for t in trees): continue
    b = trees | {p}
    if len(reach(b)) == len(floor) - len(b): trees.add(p)
assert len(reach(trees)) == len(floor) - len(trees)

ground, obst = [], []
for y in range(H):
    for x in range(W):
        ground.append(2 if (x, y) in path else 1)
        obst.append(0 if (x, y) in floor and (x, y) not in trees else 4)

def prop(n, t, v): return {'name': n, 'type': t, 'value': v}
nid = [2000]
def obj(name, x, y, props, w=16, h=16):
    nid[0] += 1
    return {'height': h, 'id': nid[0], 'name': name, 'properties': props, 'rotation': 0, 'type': '', 'visible': True, 'width': w, 'x': x * 16, 'y': y * 16}

forest = json.load(open('public/assets/maps/forest.json'))
layers = copy.deepcopy(forest['layers'])
by = {l['name']: l for l in layers}
by['ground']['data'] = ground; by['obstacles']['data'] = obst
for l in layers: l['width'] = W if l['type'] == 'tilelayer' else l.get('width', W); l['height'] = H if l['type'] == 'tilelayer' else l.get('height', H)
by['doors']['objects'] = [obj('to-forest', DOOR[0], DOOR[1], [prop('toMap', 'string', 'forest'), prop('toX', 'int', 1), prop('toY', 'int', 10)])]
npcs, enemies = [], []
for c, g in GLADES.items():
    cx, cy = center(g)
    npcs.append(obj(f'fairy_{c}', cx, cy, [prop('id', 'string', f'fairy_{c}'), prop('texture', 'string', 'fairy-cage'), prop('dialogue', 'string', f'fairycage_{c}'), prop('openFlag', 'string', f'fairy_{c}_defeated'), prop('openTexture', 'string', f'fairy-{c}'), prop('openDialogue', 'string', f'fairyfree_{c}')]))
    enemies.append(obj(f'guard_{c}', cx + 2, cy, [prop('id', 'string', f'guard_{c}'), prop('type', 'string', f'guard_{c}'), prop('hideIfFlag', 'string', f'fairy_{c}_defeated')]))
npcs.append(obj('hollowsign', 37, 15, [prop('id', 'string', 'hollowsign'), prop('texture', 'string', 'sign'), prop('dialogue', 'string', 'hollowsign')]))
# wisps wander the corridors
spots = [p for p in path if p not in keep and p not in trees and p[0] < 37 and not (ARENA[0] <= p[0] <= ARENA[2] and ARENA[1] <= p[1] <= ARENA[3])]
random.shuffle(spots)
chosen = []
for p in spots:
    if len(chosen) >= 9: break
    if all(abs(p[0] - q[0]) + abs(p[1] - q[1]) > 5 for q in chosen): chosen.append(p)
for i, (x, y) in enumerate(chosen):
    enemies.append(obj(f'wisp{i}', x, y, [prop('id', 'string', f'wisp{i}'), prop('type', 'string', 'wisp')]))
enemies.append(obj('rainbow', 20, 16, [prop('id', 'string', 'rainbow'), prop('type', 'string', 'rainbow'), prop('requiresFlag', 'string', 'fairies_all_cleared'), prop('hideIfFlag', 'string', 'rainbow_defeated')]))
by['npcs']['objects'] = npcs
by['enemies']['objects'] = enemies
by['targets']['objects'] = []
by['boss']['objects'] = []
forest['layers'] = layers
forest['width'], forest['height'] = W, H
forest['nextobjectid'] = nid[0] + 10
json.dump(forest, open('public/assets/maps/hollow.json', 'w'))

# the Forest: a thorn door in the west wall that needs the Fairy Charm
F = 'public/assets/maps/forest.json'
f = json.load(open(F))
fo = {l['name']: l for l in f['layers']}
fw = f['width']
fo['obstacles']['data'][10 * fw + 0] = 0   # open the wall tile
for o in fo['doors']['objects']:
    if o['name'] == 'to-hollow': break
else:
    fo['doors']['objects'].append({'height': 16, 'id': 3001, 'name': 'to-hollow', 'properties': [
        prop('toMap', 'string', 'hollow'), prop('toX', 'int', ARRIVE[0]), prop('toY', 'int', ARRIVE[1]),
        prop('requiresItem', 'string', 'fairy-charm'),
        prop('lockedMsg', 'string', 'Thorns wind across the path. Something small and sparkly might make them part.')],
        'rotation': 0, 'type': '', 'visible': True, 'width': 16, 'x': 0, 'y': 10 * 16})
if not any(o['name'] == 'thornwall' for o in fo['npcs']['objects']):
    pass
f['nextobjectid'] = max(f.get('nextobjectid', 0), 3100)
json.dump(f, open(F, 'w'))
print('hollow ok:', len(floor), 'floor tiles,', len(trees), 'trees,', len(chosen), 'wisps')
