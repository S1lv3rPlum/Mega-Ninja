"""Waystones + the Waystone Charm + growable treat plants.
 - a waystone (an NPC you touch once to light) in every main area; the charm teleports you to any lit one
 - waystones.json holds the list and where you arrive
 - new crops for treats you used to have to buy/forage: frostberry, seaweed (kelp), cactus fruit (grown in farm plots)
Run LAST (after the area scripts, they would overwrite the maps): python3 make_waystones.py   (safe to run again)"""
import json
from PIL import Image

A = 'public/assets'
STONE = (110, 124, 140, 255); DARK = (30, 36, 52, 255)

def sprite(rows, pal, path):
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch in pal:
                im.putpixel((x, y), pal[ch])
    im.save(path)
def waystone(path, lit):
    rows = [
        "................",
        "......kkkk......",
        ".....kssssk.....",
        ".....ksrrsk.....",
        "....kssrrssk....",
        "....ksrrrrsk....",
        "....kssrrssk....",
        "....ksssssssk...",
        "...kssssssssk...",
        "...ksssssssssk..",
        "..kssssssssssk..",
        "..kkkkkkkkkkkk..",
        "................", "................", "................", "................",
    ]
    c = (130, 255, 230, 255) if lit else (70, 84, 96, 255)
    sprite(rows, {'k': DARK, 's': STONE, 'r': c}, path)
waystone(f'{A}/sprites/waystone-off.png', False)
waystone(f'{A}/sprites/waystone-on.png', True)

# ---- crop sprites: three growth stages, drawn small and recoloured per crop
def crop(cid, leaf, fruit):
    st2 = ["................"] * 9 + ["......k.k.......", ".....kgkgk......", "......kgk.......", "......kgk.......", "......kk........", "................", "................"]
    st3 = ["................"] * 5 + ["....k...k.......", "...kgk.kgk......", "...kggkggk......", "....kgggk.......", ".....kgk........", ".....kgk........", ".....kgk........", ".....kkk........", "................", "................", "................"]
    st4 = ["................"] * 3 + ["...k.....k.....", "..kgk.k.kgk.....", "..kggkgkggk.....", "...kgggggk......", "..kfkgggkfk.....", ".kfffkgkfffk....", "..kfk.g.kfk.....", "....kgggk.......", "....kgggk.......", ".....kkk........", "................", "................", "................"]
    pal = {'k': (30, 70, 40, 255), 'g': leaf, 'f': fruit}
    for n, rows in ((2, st2), (3, st3), (4, st4)):
        sprite(rows[:16], pal, f'{A}/sprites/crop-{cid}-{n}.png')
crop('frostberry', (90, 170, 200, 255), (110, 190, 255, 255))
crop('seaweed', (40, 160, 110, 255), (170, 255, 190, 255))
crop('cactus-fruit', (70, 170, 90, 255), (240, 90, 160, 255))

cj = json.load(open('src/data/crops.json'))
cj['frostberry'] = {'name': 'Frostberry', 'seed': 'frostberry-seeds', 'item': 'frostberry', 'growMs': 12000, 'seedsBack': [1, 2]}
cj['seaweed'] = {'name': 'Seaweed', 'seed': 'seaweed-seeds', 'item': 'seaweed', 'growMs': 12000, 'seedsBack': [1, 2]}
cj['cactus-fruit'] = {'name': 'Cactus Fruit', 'seed': 'cactus-fruit-seeds', 'item': 'cactus-fruit', 'growMs': 15000, 'seedsBack': [1, 2]}
json.dump(cj, open('src/data/crops.json', 'w'), indent=2)

ij = json.load(open('src/data/items.json'))
for sid, name, color in [('frostberry-seeds', 'Frostberry Seeds', '#8fd8ff'), ('seaweed-seeds', 'Kelp Spores', '#3fb88a'), ('cactus-fruit-seeds', 'Cactus Seeds', '#f05aa0')]:
    ij['items'][sid] = {'name': name, 'icon': 'seeds', 'color': color, 'desc': 'Plant them in a dirt plot on the farm. They grow into a treat for your friends.'}
ij['items']['waystone-charm'] = {'name': 'Waystone Charm', 'icon': 'crest', 'color': '#7fffe6',
                                 'desc': 'A charm that hums near waystones. Open the bag and press Space to travel to any waystone you have lit.'}
json.dump(ij, open('src/data/items.json', 'w'), indent=2)

# bushes now sometimes give seeds for the treat plants
rj = json.load(open('src/data/rocks.json'))
def seeds(key, sid, tex, msg):
    rj[key] = [r for r in rj[key] if not r['id'].startswith('seed-')]
    rj[key].append({'id': 'seed-' + sid, 'weight': 20, 'hits': 1, 'drop': sid, 'amount': 1, 'texture': tex, 'msg': msg})
seeds('forageSnow', 'frostberry-seeds', 'snow-bush', 'Found frostberry seeds!')
seeds('forageRuins', 'seaweed-seeds', 'kelp', 'Found kelp spores!')
seeds('forageDesert', 'cactus-fruit-seeds', 'cactus-fruit', 'Found cactus seeds!')
json.dump(rj, open('src/data/rocks.json', 'w'), indent=2)

# ---- where each waystone goes
AREAS = [  # id, label, map, anchor tile to place it near
    ('town', 'Town', 'town', (15, 10)),
    ('farm', 'Farm', 'farm', (1, 8)),
    ('forest', 'Forest', 'forest', (15, 1)),
    ('quarry', 'Quarry', 'quarry', (1, 12)),
    ('crystal', 'Crystal Caverns', 'crystal', (4, 1)),
    ('peaks', 'Snowy Peaks', 'peaks', (1, 24)),
    ('ruins', 'Sunken Ruins', 'ruins', (1, 25)),
    ('bazaar', 'Desert Bazaar', 'bazaar', (16, 21)),
]
def props(**kw):
    out = []
    for k, v in kw.items():
        t = 'int' if isinstance(v, int) and not isinstance(v, bool) else 'string'
        out.append({'name': k, 'type': t, 'value': v})
    return out
way = []
for (wid, label, m, (ax, ay)) in AREAS:
    path = f'{A}/maps/{m}.json'
    d = json.load(open(path))
    W, H = d['width'], d['height']
    L = {l['name']: l for l in d['layers']}
    for l in d['layers']:                                        # idempotent: drop an old waystone
        if l['name'] == 'npcs':
            l['objects'] = [o for o in l['objects'] if not o['name'].startswith('waystone')]
    blocked = set()
    for name in ('obstacles', 'crops', 'decor'):
        if name in L:
            for i, g in enumerate(L[name]['data']):
                if g:
                    blocked.add((i % W, i // W))
    taken = set()
    for l in d['layers']:
        if l['type'] == 'objectgroup':
            for o in l['objects']:
                w = max(1, round(o.get('width', 16) / 16)); h = max(1, round(o.get('height', 16) / 16))
                for yy in range(h):
                    for xx in range(w):
                        taken.add((o['x'] // 16 + xx, o['y'] // 16 + yy))
    # tiles used as door arrivals from other maps
    for other in ('town', 'farm', 'forest', 'quarry', 'cave', 'crystal', 'market', 'peaks', 'ruins', 'desert', 'bazaar'):
        try:
            od = json.load(open(f'{A}/maps/{other}.json'))
        except FileNotFoundError:
            continue
        for l in od['layers']:
            if l['name'] == 'doors':
                for o in l['objects']:
                    pp = {p['name']: p['value'] for p in o['properties']}
                    if pp.get('toMap') == m:
                        taken.add((pp['toX'], pp['toY']))
    def free(x, y):
        return 0 <= x < W and 0 <= y < H and (x, y) not in blocked and (x, y) not in taken
    best = None
    for dist in range(2, 12):
        for yy in range(ay - dist, ay + dist + 1):
            for xx in range(ax - dist, ax + dist + 1):
                if abs(xx - ax) + abs(yy - ay) != dist:
                    continue
                if not (free(xx, yy) and free(xx, yy + 1)):
                    continue
                if sum(free(xx + dx, yy + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))) < 3:
                    continue
                if free(xx, yy - 1) is False and free(xx - 1, yy) is False:
                    pass
                best = (xx, yy)
                break
            if best: break
        if best: break
    assert best, (m, 'no spot for the waystone')
    x, y = best
    npc = {'height': 16, 'id': 3000 + len(way), 'name': f'waystone-{wid}', 'rotation': 0, 'type': '', 'visible': True, 'width': 16, 'x': x * 16, 'y': y * 16,
           'properties': props(id=f'waystone-{wid}', texture='waystone-off', dialogue='waystone', setFlag=f'waystone_{wid}',
                               openFlag=f'waystone_{wid}', openTexture='waystone-on', openDialogue='waystoneon')}
    L['npcs']['objects'].append(npc)
    json.dump(d, open(path, 'w'), separators=(',', ':'))
    way.append({'id': wid, 'label': label, 'map': m, 'x': x, 'y': y + 1, 'flag': f'waystone_{wid}'})
json.dump(way, open('src/data/waystones.json', 'w'), indent=2)

dj = json.load(open('src/data/dialogue.json'))
dj['waystone'] = {'name': 'Waystone', 'lines': ['A tall stone, cold and quiet.'], 'repeatLines': ['A tall stone, cold and quiet.']}
dj['waystoneon'] = {'name': 'Waystone', 'lines': ['The waystone glows softly. It remembers you.'], 'repeatLines': ['The waystone glows softly. A Waystone Charm can bring you back here.']}
json.dump(dj, open('src/data/dialogue.json', 'w'), indent=2, ensure_ascii=False)
open('src/data/dialogue.json', 'a').write('\n')
print('waystones:', [(w['id'], w['x'], w['y']) for w in way])
