"""The Ninja Tailor: an NPC in the town (near the middle) who lets you change your ninja colour any time.
Run: python3 make_tailor.py   (safe to run again)"""
import json
A = 'public/assets'
m = json.load(open(f'{A}/maps/town.json'))
L = {l['name']: l for l in m['layers']}
W = m['width']
taken = set()
for ln in ('doors', 'npcs', 'targets'):
    for o in L[ln]['objects']:
        if o['name'] == 'tailor': continue
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1): taken.add((o['x'] // 16 + dx, o['y'] // 16 + dy))
best = None
for y in range(2, m['height'] - 2):
    for x in range(2, W - 2):
        if L['obstacles']['data'][y * W + x] or (x, y) in taken: continue
        if L['ground']['data'][y * W + x] != 1: continue  # on grass, not on the road
        d = abs(x - 21) + abs(y - 13)
        if best is None or d < best[0]: best = (d, x, y)
_, x, y = best
L['npcs']['objects'] = [n for n in L['npcs']['objects'] if n['name'] != 'tailor']
def props(**kw): return [{'name': k, 'type': 'string', 'value': v} for k, v in kw.items()]
L['npcs']['objects'].append({'height': 16, 'id': 6001, 'name': 'tailor', 'properties': props(id='tailor', texture='alchemist', dialogue='tailor', role='wardrobe'), 'rotation': 0, 'type': '', 'visible': True, 'width': 16, 'x': x * 16, 'y': y * 16})
json.dump(m, open(f'{A}/maps/town.json', 'w'))
dj = json.load(open('src/data/dialogue.json'))
dj['tailor'] = {'name': 'Ninja Tailor', 'lines': ['Ninja outfits! Every ninja wears black, but a splash of colour says who you are.', 'Pick your colour. You can come back and change it any time.'],
                'repeatLines': ['Back for a new look?'], 'menu': 'Which colour today?', 'farewell': 'Come back any time!', 'doneLine': 'Perfect! That suits you.'}
json.dump(dj, open('src/data/dialogue.json', 'w'), indent=2)
print('tailor at', x, y)
