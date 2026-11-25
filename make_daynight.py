"""Day and night: night-only friends, night crops, and the dark Night Barn in the school garden.
 - sprites: firefly, owl, moonhare (night friends), crops moonbloom + glowcap
 - data: crops, items, friends, enemies (harmless, tameable), forage seed drops, shop seeds, dialogue
 - maps: night-only creatures placed in town/farm/forest/garden, a second barn in the garden, nightbarn.json (dark)
Run AFTER make_school.py (it edits the garden that make_school builds) and after make_waystones.py. Safe to run again.
Run: python3 make_daynight.py"""
import json, random
from PIL import Image, ImageDraw

A = 'public/assets'
random.seed(88)

# ---------------- sprites
def canvas(): return Image.new('RGBA', (16, 16), (0, 0, 0, 0))
def firefly():
    im = canvas(); d = ImageDraw.Draw(im)
    d.ellipse([5, 3, 10, 12], fill=(255, 240, 110, 70))  # the glow
    d.rectangle([6, 4, 9, 6], fill=(60, 48, 40, 255)); d.rectangle([5, 7, 10, 7], fill=(60, 48, 40, 255))  # head + body
    d.rectangle([6, 8, 9, 11], fill=(255, 238, 90, 255)); d.rectangle([7, 9, 8, 10], fill=(255, 255, 200, 255))  # glowing tail
    d.rectangle([2, 4, 5, 7], fill=(200, 230, 255, 200)); d.rectangle([10, 4, 13, 7], fill=(200, 230, 255, 200))  # wings
    d.point([6, 5], fill=(255, 255, 255, 255)); d.point([9, 5], fill=(255, 255, 255, 255))
    im.save(f'{A}/sprites/firefly.png')
def owl():
    im = canvas(); d = ImageDraw.Draw(im)
    d.ellipse([3, 4, 12, 14], fill=(120, 88, 60, 255), outline=(50, 36, 28, 255))
    d.polygon([(3, 5), (4, 1), (7, 4)], fill=(120, 88, 60, 255), outline=(50, 36, 28, 255)); d.polygon([(12, 5), (11, 1), (8, 4)], fill=(120, 88, 60, 255), outline=(50, 36, 28, 255))
    d.ellipse([4, 5, 7, 8], fill=(255, 240, 160, 255)); d.ellipse([8, 5, 11, 8], fill=(255, 240, 160, 255))
    d.point([6, 7], fill=(20, 20, 20, 255)); d.point([9, 7], fill=(20, 20, 20, 255))
    d.polygon([(7, 8), (9, 8), (8, 10)], fill=(240, 160, 50, 255)); d.ellipse([5, 10, 10, 14], fill=(200, 170, 130, 255))
    im.save(f'{A}/sprites/owl.png')
def moonhare():
    im = canvas(); d = ImageDraw.Draw(im)
    d.ellipse([3, 7, 12, 14], fill=(226, 226, 250, 255), outline=(90, 90, 130, 255))
    d.ellipse([9, 5, 14, 10], fill=(226, 226, 250, 255), outline=(90, 90, 130, 255))
    d.rectangle([10, 0, 11, 6], fill=(226, 226, 250, 255), outline=(90, 90, 130, 255)); d.rectangle([12, 1, 13, 6], fill=(226, 226, 250, 255), outline=(90, 90, 130, 255))
    d.point([12, 7], fill=(40, 40, 80, 255)); d.point([13, 8], fill=(240, 140, 180, 255))
    d.arc([5, 8, 9, 12], 100, 280, fill=(250, 220, 90, 255))  # a little moon mark on its side
    im.save(f'{A}/sprites/moonhare.png')
firefly(); owl(); moonhare()

def sprite(rows, pal, path):
    im = canvas()
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch in pal: im.putpixel((x, y), pal[ch])
    im.save(path)
def crop(cid, leaf, fruit):
    st2 = ["................"] * 9 + ["......k.k.......", ".....kgkgk......", "......kgk.......", "......kgk.......", "......kk........", "................", "................"]
    st3 = ["................"] * 5 + ["....k...k.......", "...kgk.kgk......", "...kggkggk......", "....kgggk.......", ".....kgk........", ".....kgk........", ".....kgk........", ".....kkk........", "................", "................", "................"]
    st4 = ["................"] * 3 + ["...k.....k.....", "..kgk.k.kgk.....", "..kggkgkggk.....", "...kgggggk......", "..kfkgggkfk.....", ".kfffkgkfffk....", "..kfk.g.kfk.....", "....kgggk.......", "....kgggk.......", ".....kkk........", "................", "................", "................"]
    pal = {'k': (30, 40, 80, 255), 'g': leaf, 'f': fruit}
    for n, rows in ((2, st2), (3, st3), (4, st4)):
        sprite(rows[:16], pal, f'{A}/sprites/crop-{cid}-{n}.png')
crop('moonbloom', (70, 110, 190, 255), (200, 225, 255, 255))
crop('glowcap', (50, 140, 120, 255), (130, 255, 190, 255))

# ---------------- data
def load(p): return json.load(open(p))
def save(p, d): json.dump(d, open(p, 'w'), indent=2)
cj = load('src/data/crops.json')
cj['moonbloom'] = {'name': 'Moonbloom', 'seed': 'moonbloom-seeds', 'item': 'moonbloom', 'growMs': 20000, 'seedsBack': [1, 2], 'nightOnly': True}
cj['glowcap'] = {'name': 'Glowcap', 'seed': 'glowcap-seeds', 'item': 'glowcap', 'growMs': 20000, 'seedsBack': [1, 2], 'nightOnly': True}
save('src/data/crops.json', cj)

ij = load('src/data/items.json')
ij['items']['moonbloom-seeds'] = {'name': 'Moonbloom Seeds', 'icon': 'seeds', 'color': '#9fb8ff', 'desc': 'Plant in a farm plot. It only grows at night. A treat for owls and moon hares.'}
ij['items']['glowcap-seeds'] = {'name': 'Glowcap Spores', 'icon': 'seeds', 'color': '#7dffb0', 'desc': 'Plant in a farm plot. It only grows at night. A treat for fireflies.'}
ij['items']['moonbloom'] = {'name': 'Moonbloom', 'icon': 'leaf', 'color': '#bcd6ff', 'desc': 'A pale flower that only blooms at night. Owls and moon hares love it.'}
ij['items']['glowcap'] = {'name': 'Glowcap', 'icon': 'leaf', 'color': '#7dffb0', 'desc': 'A glowing mushroom that only grows at night. Fireflies love it.'}
save('src/data/items.json', ij)

fj = load('src/data/friends.json')
fj['kinds']['firefly'] = {'name': 'Glow Firefly', 'baseName': 'Spark', 'texture': 'firefly', 'treat': 'glowcap'}
fj['kinds']['owl'] = {'name': 'Moon Owl', 'baseName': 'Hoot', 'texture': 'owl', 'treat': 'moonbloom'}
fj['kinds']['moonhare'] = {'name': 'Moon Hare', 'baseName': 'Luna', 'texture': 'moonhare', 'treat': 'moonbloom'}
save('src/data/friends.json', fj)

ej = load('src/data/enemies.json')
for k, nm in (('firefly', 'Glow Firefly'), ('owl', 'Moon Owl'), ('moonhare', 'Moon Hare')):
    ej[k] = {'name': nm, 'texture': k, 'hp': 2, 'damage': 0, 'moveMs': 1100, 'attackMs': 99999, 'sight': 0, 'respawnMs': 60000, 'gold': 0, 'tame': k, 'harmless': True}
save('src/data/enemies.json', ej)

rj = load('src/data/rocks.json')
for table in ('forageTown', 'forageForest'):
    tex = rj[table][0]['texture']
    rj[table] = [r for r in rj[table] if not r['id'].startswith('nt_')]
    rj[table].append({'id': 'nt_moon', 'weight': 8, 'hits': 1, 'drop': 'moonbloom-seeds', 'amount': 1, 'texture': tex, 'msg': 'Found moonbloom seeds!'})
    rj[table].append({'id': 'nt_glow', 'weight': 8, 'hits': 1, 'drop': 'glowcap-seeds', 'amount': 1, 'texture': tex, 'msg': 'Found glowcap spores!'})
save('src/data/rocks.json', rj)

sj = load('src/data/shop.json')
offers = sj['general']['offers']
offers[:] = [o for o in offers if o['id'] not in ('moonbloom-seeds', 'glowcap-seeds')]
offers.insert(2, {'id': 'moonbloom-seeds', 'type': 'item', 'item': 'moonbloom-seeds', 'amount': 3, 'label': '3 Moonbloom Seeds', 'price': 30})
offers.insert(3, {'id': 'glowcap-seeds', 'type': 'item', 'item': 'glowcap-seeds', 'amount': 3, 'label': '3 Glowcap Spores', 'price': 30})
save('src/data/shop.json', sj)

dj = load('src/data/dialogue.json')
def D(key, name, lines, **kw): dj[key] = dict({'name': name, 'lines': lines, 'repeatLines': kw.pop('repeat', lines)}, **kw)
D('nightsign', 'Sign', ['NIGHT BARN. Bring a light. These friends only come out after dark.', 'They love moonblooms and glowcaps, which only grow at night.'])
D('nightkeeper', 'Night Keeper', ['Shh, the animals here are shy. They sleep all day and wake at dusk.', 'You cannot take them home, but out in the world you may find wild ones at night. Bring them a moonbloom or a glowcap.'], repeat=['Quietly now. Say hello to the night animals.'])
ANI = {
  'owl': ('Barn Owl', ['A round owl blinks slowly at you from a rafter.'], 'It lets out a soft hoot.', ['It swallows it whole and hoots.', 'The owl ruffles its feathers happily.']),
  'moonhare': ('Barn Hare', ['A pale hare with a tiny crescent mark sits very still.'], 'Its nose twitches. It likes you.', ['It nibbles it carefully.', 'The hare does a quiet little hop.']),
  'firefly': ('Barn Firefly', ['A firefly drifts through the dark, glowing softly.'], 'It lands on your finger for a moment.', ['It glows brighter.', 'The firefly does a happy loop.']),
  'bat': ('Barn Bat', ['A small bat hangs upside-down, watching you.'], 'It squeaks politely.', ['It nibbles it upside-down.', 'The bat flaps once, happily.']),
  'shadow': ('Barn Sprout', ['A little shadow sprout sways in the dark.'], 'It leans against your hand.', ['It wiggles its leaves.', 'The sprout glows a faint green.']),
}
for kind, (nm, lines, pet, fed) in ANI.items():
    key = f'animal_{kind}'
    if key not in dj: D(key, nm, lines, petLine=pet, fedLines=fed)
save('src/data/dialogue.json', dj)

# ---------------- maps
def props(**kw):
    out = []
    for k, v in kw.items():
        t = 'int' if isinstance(v, int) and not isinstance(v, bool) else 'string'
        out.append({'name': k, 'type': t, 'value': v})
    return out
oid = [4000]
def obj(name, x, y, **kw):
    oid[0] += 1
    return {'height': 16, 'id': oid[0], 'name': name, 'properties': props(**kw), 'rotation': 0, 'type': '', 'visible': True, 'width': 16, 'x': x * 16, 'y': y * 16}

def free_tiles(m):
    L = {l['name']: l for l in m['layers']}
    W, H = m['width'], m['height']
    taken = set()
    for ln in ('doors', 'npcs', 'targets', 'enemies', 'boss'):
        for o in L.get(ln, {}).get('objects', []):
            ox, oy = o['x'] // 16, o['y'] // 16
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1): taken.add((ox + dx, oy + dy))
    out = []
    for y in range(2, H - 2):
        for x in range(2, W - 2):
            i = y * W + x
            if L['obstacles']['data'][i]: continue
            if 'crops' in L and L['crops']['data'][i]: continue
            if 'crops' in L and any(L['crops']['data'][(y + dy) * W + x + dx] for dx in (-1, 0, 1) for dy in (-1, 0, 1)): continue
            if (x, y) in taken: continue
            out.append((x, y))
    return out

def set_enemies(map_name, spawns):
    p = f'{A}/maps/{map_name}.json'
    m = load(p)
    layer = next((l for l in m['layers'] if l['name'] == 'enemies'), None)
    if layer is None:
        layer = {'draworder': 'topdown', 'id': m.get('nextlayerid', 10), 'name': 'enemies', 'objects': [], 'opacity': 1, 'type': 'objectgroup', 'visible': True, 'x': 0, 'y': 0}
        m['nextlayerid'] = m.get('nextlayerid', 10) + 1
        m['layers'].append(layer)
    layer['objects'] = [o for o in layer['objects'] if not o['name'].startswith('night_')]
    spots = free_tiles(m); random.shuffle(spots)
    used = []
    for i, kind in enumerate(spawns):
        for (x, y) in spots:
            if all(abs(x - ux) + abs(y - uy) > 5 for ux, uy in used):
                used.append((x, y)); break
        else: raise SystemExit(f'no free spot in {map_name}')
        x, y = used[-1]
        layer['objects'].append(obj(f'night_{kind}{i}', x, y, id=f'night_{map_name}_{kind}{i}', type=kind, nightOnly='yes'))
    save(p, m)
    return used
print('town', set_enemies('town', ['owl', 'owl', 'moonhare']))
print('farm', set_enemies('farm', ['firefly', 'firefly', 'moonhare']))
print('forest', set_enemies('forest', ['owl', 'firefly', 'firefly', 'moonhare']))

# ---- the garden's Night Barn (second barn) and its dark inside
G = load(f'{A}/maps/garden.json')
GW = G['width']
GL = {l['name']: l for l in G['layers']}
BARNWALL, DOOR, PATH = 14, 7, 10
for x in range(8, 13):
    for y in range(1, 4):
        GL['ground']['data'][y * GW + x] = BARNWALL; GL['obstacles']['data'][y * GW + x] = BARNWALL
GL['ground']['data'][3 * GW + 10] = DOOR; GL['obstacles']['data'][3 * GW + 10] = 0
for y in range(4, 7): GL['ground']['data'][y * GW + 10] = PATH; GL['obstacles']['data'][y * GW + 10] = 0
GL['doors']['objects'] = [d for d in GL['doors']['objects'] if d['name'] != 'to-nightbarn']
GL['doors']['objects'].append(obj('to-nightbarn', 10, 3, toMap='nightbarn', toX=6, toY=7))
GL['npcs']['objects'] = [n for n in GL['npcs']['objects'] if not n['name'].startswith('night')]
GL['npcs']['objects'].append(obj('nightsign', 9, 4, id='nightsign', texture='sign', dialogue='nightsign'))
GL['obstacles']['data'][4 * GW + 9] = 0
save(f'{A}/maps/garden.json', G)
# the garden's night creatures
GL2 = load(f'{A}/maps/garden.json')
print('garden', set_enemies('garden', ['firefly', 'owl', 'firefly']))

NW, NH = 13, 9
g = [15] * (NW * NH); o = [0] * (NW * NH)   # 15 = HAY, 14 = BARNWALL
for x in range(NW):
    for y in (0, 1): g[y * NW + x] = BARNWALL; o[y * NW + x] = BARNWALL
    g[(NH - 1) * NW + x] = BARNWALL; o[(NH - 1) * NW + x] = BARNWALL
for y in range(NH):
    for x in (0, NW - 1): g[y * NW + x] = BARNWALL; o[y * NW + x] = BARNWALL
g[(NH - 1) * NW + 6] = DOOR; o[(NH - 1) * NW + 6] = 0
npcs = [obj(f'barn_{k}', x, 3, id=f'nbarn_{k}', texture=k, dialogue=f'animal_{k}', role='feeder')
        for k, x in (('owl', 2), ('moonhare', 4), ('firefly', 6), ('bat', 8), ('shadow', 10))]
npcs.append(obj('nightkeeper', 10, 6, id='nightkeeper', texture='student3', dialogue='nightkeeper'))
tileset = {'columns': 17, 'firstgid': 1, 'image': '../tilesets/school-tiles.png', 'imageheight': 16, 'imagewidth': 272, 'margin': 0, 'name': 'school-tiles', 'spacing': 0, 'tilecount': 17, 'tileheight': 16, 'tilewidth': 16}
def tl(i, n, d): return {'data': d, 'height': NH, 'width': NW, 'id': i, 'name': n, 'opacity': 1, 'type': 'tilelayer', 'visible': True, 'x': 0, 'y': 0}
def og(i, n, objs): return {'draworder': 'topdown', 'id': i, 'name': n, 'objects': objs, 'opacity': 1, 'type': 'objectgroup', 'visible': True, 'x': 0, 'y': 0}
nb = {'compressionlevel': -1, 'height': NH, 'width': NW, 'infinite': False, 'orientation': 'orthogonal', 'renderorder': 'right-down', 'tiledversion': '1.10.2',
      'tileheight': 16, 'tilewidth': 16, 'type': 'map', 'version': '1.10', 'nextlayerid': 6, 'nextobjectid': 5000, 'tilesets': [tileset],
      'properties': [{'name': 'dark', 'type': 'bool', 'value': True}],
      'layers': [tl(1, 'ground', g), tl(2, 'obstacles', o), og(3, 'doors', [obj('to-garden', 6, NH - 1, toMap='garden', toX=10, toY=4)]), og(4, 'npcs', npcs)]}
save(f'{A}/maps/nightbarn.json', nb)
print('day/night built')
