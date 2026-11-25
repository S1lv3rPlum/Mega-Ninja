"""The Brewer's stall in the Shadow Market (the one that was 'closed'): a hooded Brewer, three dark brews, shop + dialogue.
 - sprite hexbrewer.png (the charm vendor's robe in swamp green)
 - items swift-brew / owl-brew / shadow-brew (data/brews.json holds the effects), shop 'brewer', dialogue
 - market.json: the closed sign is replaced by the Brewer
Run AFTER make_market_assets.py. Safe to run again.   Run: python3 make_brewer.py"""
import json
from PIL import Image

A = 'public/assets'
D = 'src/data'
def load(p): return json.load(open(p))

im = Image.open(f'{A}/sprites/hexcharm.png').convert('RGBA')
for y in range(im.height):
    for x in range(im.width):
        r, g, b, a = im.getpixel((x, y))
        if a and max(r, g, b) - min(r, g, b) > 25:
            im.putpixel((x, y), (g, r, b, a))      # plum red -> swamp green
im.save(f'{A}/sprites/hexbrewer.png')

items = load(f'{D}/items.json')
items['items']['swift-brew'] = dict(name='Swift Brew', icon='gem', color='#58d868', desc='Fizzy green brew. Drink it to run faster for 45 seconds.')
items['items']['owl-brew'] = dict(name='Owl-Eye Brew', icon='gem', color='#f0d040', desc='Glowing yellow brew. Drink it to see in the dark for 90 seconds.')
items['items']['shadow-brew'] = dict(name='Shadow Brew', icon='gem', color='#a060e0', desc='Swirly purple brew. Run faster AND see in the dark. A ninja favourite.')
for k in ('swift-brew', 'owl-brew', 'shadow-brew'): items['items'][k]['brew'] = True   # the bag shows DRINK (effects: data/brews.json)
json.dump(items, open(f'{D}/items.json', 'w'), indent=2)

shop = load(f'{D}/shop.json')
def offer(i, n, price, label): return dict(id=i, type='item', item=i, amount=n, label=label, price=price)
shop['brewer'] = {'offers': [
    offer('swift-brew', 1, 25, 'Swift Brew'),
    offer('owl-brew', 1, 25, 'Owl-Eye Brew'),
    offer('shadow-brew', 1, 40, 'Shadow Brew'),
], 'sell': {}}
json.dump(shop, open(f'{D}/shop.json', 'w'), indent=2)

dl = load(f'{D}/dialogue.json')
dl['brewer'] = dict(
    name='The Brewer',
    lines=['Heh heh heh... the stall is open again! My cauldron has been bubbling all week.',
           'The green one makes your feet fly. The yellow one lets you see in the dark, even without a big lantern.',
           'The purple one does both. Drink them from your bag. They wear off, so use them well!'],
    repeatLines=['Back for more brew, little ninja?'],
    menu='Which brew will it be?',
    farewell='Heh heh... mind the dark!',
)
json.dump(dl, open(f'{D}/dialogue.json', 'w'), indent=2)

p = f'{A}/maps/market.json'; m = load(p)
g = [l for l in m['layers'] if l['name'] == 'npcs'][0]['objects']
g[:] = [o for o in g if o['name'] not in ('closedsign', 'brewer')]
oid = max(o['id'] for l in m['layers'] if l['type'] == 'objectgroup' for o in l['objects']) + 1
def prop(n, v): return dict(name=n, type='string', value=v)
g.append(dict(height=16, id=oid, name='brewer', rotation=0, type='', visible=True, width=16, x=26 * 16, y=3 * 16,
              properties=[prop('id', 'brewer'), prop('texture', 'hexbrewer'), prop('dialogue', 'brewer'), prop('shop', 'brewer')]))
json.dump(m, open(p, 'w'), separators=(',', ':'))
print('brewer written')
