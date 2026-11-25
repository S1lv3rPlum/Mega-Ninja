"""Fishing: the Old Fisher + a forest pond, fishing spots at the garden pond / forest pond / frozen lake,
fish items, the Fish Grill in the school kitchen, and fish as extra friend treats.
 - data/fish.json is hand-written (fish, areas, rarity). This script adds items, recipes, dialogue, friend 'likes', and edits maps.
 - map property fishGid = the obstacle tile you can fish from, fishArea = which fish live there.
Run AFTER make_school.py and make_daynight.py (it edits the garden, forest, peaks and kitchen). Safe to run again.
Run: python3 make_fishing.py"""
import json
from PIL import Image

A = 'public/assets'
D = 'src/data'
def load(p): return json.load(open(p))
def save(p, d, indent=2): json.dump(d, open(p, 'w'), indent=indent)

fish = load(f'{D}/fish.json')

# ---------------- sprite: the Old Fisher (the villager sprite in sea colours)
def recolor(src, dst, perm):
    im = Image.open(f'{A}/sprites/{src}').convert('RGBA')
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = im.getpixel((x, y))
            if a and max(r, g, b) - min(r, g, b) > 25 and not (r > g > b):
                c = (r, g, b)
                im.putpixel((x, y), (c[perm[0]], c[perm[1]], c[perm[2]], a))
    im.save(f'{A}/sprites/{dst}')
recolor('npc.png', 'fisher.png', (2, 2, 0))

# ---------------- items
items = load(f'{D}/items.json')
items['items']['fishing-rod'] = dict(name='Fishing Rod', icon='rod', color='#b07840', desc='Face a pond and press Space to cast. Press Space again when the fish bites!')
for fid, f in fish.items():
    if f.get('junk'):
        items['items'][fid] = dict(name=f['name'], icon='boots', color=f['color'], desc=f['desc'])
    else:
        items['items'][fid] = dict(name=f['name'], icon='fish', color=f['color'], desc=f['desc'] + ' Cook it at the Fish Grill.', heal=1)
dishes = {
    'fish-stew':       ('Fish Stew', '#c89050', 'Warm and savoury. Eat it to heal.', 5),
    'sunfish-fry':     ('Sunfish Fry', '#f0b030', 'Crispy and golden. Eat it to heal.', 5),
    'grilled-trout':   ('Grilled Trout', '#6aa86a', 'Smoky and juicy. Eat it to heal.', 6),
    'bass-bake':       ('Bass Bake', '#58803c', 'Baked with carrots. Eat it to heal.', 6),
    'moon-curry':      ('Moon Curry', '#b8a0f0', 'Spicy, with a moonlit glow. Eat it to heal.', 8),
    'eel-soup':        ('Glow Eel Soup', '#7affc8', 'It really does glow. Eat it to heal.', 9),
    'frosty-skewer':   ('Frosty Skewer', '#a0d8f0', 'Fish and berries on a stick. Eat it to heal.', 7),
    'koi-feast':       ('Koi Feast', '#ffc830', 'A fancy feast. Eat it to heal a lot.', 12),
    'aurora-sushi':    ('Aurora Sushi', '#c890f0', 'Shimmering sushi. Eat it to heal a lot.', 12),
}
for did, (nm, col, desc, heal) in dishes.items():
    items['items'][did] = dict(name=nm, icon='fish', color=col, desc=desc, heal=heal)
save(f'{D}/items.json', items)

# ---------------- the Fish Grill recipes (a second cook in the school kitchen)
rec = load(f'{D}/recipes.json')
def offer(out, needs): return dict(id=out, out=out, amount=1, needs=needs)
rec['grill'] = {'offers': [
    offer('fish-stew', {'pond-minnow': 2, 'herb': 1}),
    offer('sunfish-fry', {'sunfish': 1, 'wheat': 1}),
    offer('grilled-trout', {'forest-trout': 1, 'herb': 1}),
    offer('bass-bake', {'mossy-bass': 1, 'carrot': 1}),
    offer('moon-curry', {'moon-carp': 1, 'pumpkin': 1}),
    offer('eel-soup', {'glow-eel': 1, 'herb': 1}),
    offer('frosty-skewer', {'frost-perch': 1, 'frostberry': 1}),
    offer('koi-feast', {'golden-koi': 1, 'herb': 1}),
    offer('aurora-sushi', {'aurora-char': 1, 'seaweed': 1}),
]}
save(f'{D}/recipes.json', rec)

# ---------------- fish as extra friend treats ('likes'): the favourite treat still counts, these also work
fr = load(f'{D}/friends.json')
for kind, likes in {'crab': ['pond-minnow'], 'owl': ['forest-trout'], 'snowfox': ['frost-perch'], 'sandlizard': ['sunfish']}.items():
    fr['kinds'][kind]['likes'] = likes
save(f'{D}/friends.json', fr)

# ---------------- dialogue
dl = load(f'{D}/dialogue.json')
dl['fisher'] = dict(
    name='Old Fisher',
    lines=['Ho there, young ninja! Patience is a ninja skill, and fishing is the best way to practise it.',
           'Take this rod. Face a pond, press Space to cast, and press Space AGAIN the moment the fish bites.',
           'Then keep the marker inside the green bar to reel it in. Rare fish need more than one pull!'],
    repeatLines=['Any luck at the water today?'],
    menu='What can I do for you?',
    farewell='Tight lines, ninja!',
    tips=['Some fish only come out at night. Others only in the daytime.',
          'There are ponds in the school garden, here in the forest, and a frozen lake up in the Snowy Peaks.',
          'Cook your catch at the Fish Grill in the school kitchen. And some friends love a fish treat!'],
)
dl['grillcook'] = dict(
    name='Angler Chef',
    lines=['I am the Angler Chef! Bring me your catch and I will grill it into something that heals.'],
    repeatLines=['Fresh fish? Let me fire up the grill!'],
    menu='What shall I grill?',
    farewell='Eat up, ninja!',
)
dl['fishsign'] = dict(name='Sign', lines=['FISHING POND. Face the water with a rod and press Space.'], repeatLines=['FISHING POND. Face the water with a rod and press Space.'])
save(f'{D}/dialogue.json', dl)

# ---------------- maps
def objs(m, name): return [l for l in m['layers'] if l['name'] == name][0]['objects']
def layer(m, name): return [l for l in m['layers'] if l['name'] == name][0]
def next_id(m): return max(o['id'] for l in m['layers'] if l['type'] == 'objectgroup' for o in l['objects']) + 1
def prop(n, v): return dict(name=n, type='int' if isinstance(v, int) else 'string', value=v)
def add_npc(m, nid, x, y, **kw):
    g = objs(m, 'npcs')
    g[:] = [o for o in g if o['name'] != nid]
    g.append(dict(height=16, id=next_id(m), name=nid, rotation=0, type='', visible=True, width=16, x=x * 16, y=y * 16,
                  properties=[prop('id', nid)] + [prop(k, v) for k, v in kw.items()]))
def set_props(m, **kw):
    ps = [p for p in m.get('properties', []) if p['name'] not in kw]
    m['properties'] = ps + [prop(k, v) for k, v in kw.items()]

# forest: a new pond, and the Old Fisher beside it
p = f'{A}/maps/forest.json'; m = load(p)
W = m['width']
for y in range(3, 6):
    for x in range(8, 12):
        layer(m, 'ground')['data'][y * W + x] = 3
        layer(m, 'obstacles')['data'][y * W + x] = 3
add_npc(m, 'fisher', 8, 6, texture='fisher', dialogue='fisher', role='fisher', giveItem='fishing-rod', walkRadius=1)
add_npc(m, 'fishsign', 12, 6, texture='sign', dialogue='fishsign')
set_props(m, fishGid=3, fishArea='forest')
save(p, m, indent=None)

# garden: the pond (water tile 11 of school-tiles) is already there
p = f'{A}/maps/garden.json'; m = load(p)
set_props(m, fishGid=11, fishArea='garden')
save(p, m, indent=None)

# peaks: the frozen lake (deep ice, tile 4)
p = f'{A}/maps/peaks.json'; m = load(p)
set_props(m, fishGid=4, fishArea='peaks')
save(p, m, indent=None)

# kitchen: the Angler Chef and his grill
p = f'{A}/maps/kitchen.json'; m = load(p)
add_npc(m, 'grillcook', 8, 3, texture='cook', dialogue='grillcook', craft='grill')
save(p, m, indent=None)
print('fishing data written')
