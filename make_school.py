"""The Ninja School: a building in the top-left of the town and everything inside it.
Rooms: hall (school), kitchen, potions, library, sparring, dorm1, dorm2, garden (outside), barn.
 - school-tiles.png (16 tiles), the room maps, a door + sign in town.json, student/cook/alchemist/etc sprites
 - recipes.json, items (food, potions, acceptance letter), dialogue
The town door needs the Moon Crest (the other things on the sensei's list are what you do on the way to it).
Safe to run again; it only touches the town's top-left corner. Run: python3 make_school.py"""
import json, random
from PIL import Image, ImageDraw

A = 'public/assets'
random.seed(61)
FLOOR, IWALL, RUG, COUNTER, ROOF, OWALL, DOOR, BANNER, GRASS, PATH, WATER, HEDGE, FLOWER, BARNWALL, HAY, RUGB, STAIRS = range(1, 18)
ts = Image.new('RGBA', (272, 16))
def tile(n, fn):
    for y in range(16):
        for x in range(16):
            ts.putpixel(((n - 1) * 16 + x, y), fn(x, y))
tile(FLOOR, lambda x, y: (176, 128, 84, 255) if y % 8 else (140, 98, 62, 255))
tile(IWALL, lambda x, y: (58, 46, 70, 255) if (x + (y // 8) * 8) % 16 else (40, 30, 52, 255))
tile(RUG, lambda x, y: (150, 40, 50, 255) if 1 < x < 14 and 1 < y < 14 else (220, 190, 110, 255))
tile(COUNTER, lambda x, y: (110, 70, 40, 255) if y > 3 else (200, 160, 110, 255))
tile(ROOF, lambda x, y: (60, 70, 130, 255) if (x + y) % 8 else (40, 48, 100, 255))
tile(OWALL, lambda x, y: (232, 220, 196, 255) if x not in (0, 15) else (110, 74, 44, 255))
def door(x, y):
    if x < 2 or x > 13 or y < 1: return (110, 74, 44, 255)
    return (80, 40, 30, 255) if x not in (7, 8) else (200, 150, 60, 255)
tile(DOOR, door)
tile(BANNER, lambda x, y: (190, 40, 50, 255) if 3 < x < 12 and y < 13 else (58, 46, 70, 255))
tile(GRASS, lambda x, y: (84, 160, 70, 255) if (x * 7 + y * 3) % 11 else (100, 178, 84, 255))
tile(PATH, lambda x, y: (196, 186, 166, 255) if (x + y) % 5 else (170, 160, 142, 255))
tile(WATER, lambda x, y: (60, 130, 200, 255) if (x + y) % 6 else (110, 176, 230, 255))
tile(HEDGE, lambda x, y: (34, 110, 52, 255) if (x * 5 + y * 3) % 7 else (24, 84, 40, 255))
tile(FLOWER, lambda x, y: (240, 120, 170, 255) if (x, y) in ((4, 5), (10, 9), (11, 4)) else ((250, 230, 90, 255) if (x, y) in ((6, 11), (2, 10)) else ((84, 160, 70, 255) if (x * 7 + y * 3) % 11 else (100, 178, 84, 255))))
tile(BARNWALL, lambda x, y: (170, 60, 50, 255) if y % 5 else (120, 40, 36, 255))
tile(HAY, lambda x, y: (222, 190, 90, 255) if (x * 3 + y) % 4 else (190, 156, 64, 255))
tile(RUGB, lambda x, y: (50, 80, 150, 255) if 1 < x < 14 and 1 < y < 14 else (220, 190, 110, 255))
tile(STAIRS, lambda x, y: (214, 206, 190, 255) if y % 4 else (120, 112, 100, 255))
ts.save(f'{A}/tilesets/school-tiles.png')
TILESET = {'columns': 17, 'image': '../tilesets/school-tiles.png', 'imageheight': 16, 'imagewidth': 272, 'margin': 0, 'name': 'school-tiles',
           'spacing': 0, 'tilecount': 17, 'tileheight': 16, 'tilewidth': 16}

# ---------------- sprites
def recolor(src, dst, perm):
    im = Image.open(f'{A}/sprites/{src}').convert('RGBA')
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = im.getpixel((x, y))
            if a and max(r, g, b) - min(r, g, b) > 25 and not (r > g > b):
                c = (r, g, b)
                im.putpixel((x, y), (c[perm[0]], c[perm[1]], c[perm[2]], a))
    im.save(f'{A}/sprites/{dst}')
recolor('npc.png', 'cook.png', (2, 0, 1))
recolor('npc.png', 'alchemist.png', (1, 2, 0))
recolor('npc.png', 'trainer.png', (1, 2, 1))
recolor('npc.png', 'enchanter.png', (0, 0, 2))
for n, perm in (('student1', (2, 1, 0)), ('student2', (1, 0, 2)), ('student3', (0, 2, 1))):
    recolor('npc.png', f'{n}.png', perm)
    recolor('npc-walk.png', f'{n}-walk.png', perm)
def draw(path, fn):
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0)); d = ImageDraw.Draw(im); fn(d); im.save(path)
def shelf(d):
    d.rectangle([0, 0, 15, 15], fill=(90, 56, 34, 255)); d.rectangle([1, 1, 14, 14], fill=(60, 36, 22, 255))
    for y0 in (2, 8):
        d.rectangle([1, y0 + 5, 14, y0 + 5], fill=(110, 70, 40, 255))
        for i, x0 in enumerate(range(2, 14, 3)):
            col = [(200, 60, 60), (60, 120, 200), (90, 180, 90), (230, 190, 60)][(i + y0) % 4]
            d.rectangle([x0, y0, x0 + 1, y0 + 4], fill=col + (255,))
draw(f'{A}/sprites/bookshelf.png', shelf)
def bed(d):
    d.rectangle([1, 2, 14, 14], fill=(110, 70, 40, 255)); d.rectangle([2, 3, 13, 13], fill=(230, 230, 240, 255))
    d.rectangle([2, 3, 13, 6], fill=(240, 240, 250, 255)); d.rectangle([2, 8, 13, 13], fill=(70, 100, 190, 255))
draw(f'{A}/sprites/bed.png', bed)
def dummy(d):
    d.rectangle([7, 1, 8, 15], fill=(110, 70, 40, 255)); d.rectangle([3, 3, 12, 10], fill=(214, 180, 110, 255))
    d.rectangle([3, 3, 12, 3], fill=(150, 110, 60, 255)); d.rectangle([5, 0, 10, 3], fill=(214, 180, 110, 255))
    d.rectangle([4, 14, 11, 15], fill=(90, 60, 36, 255))
draw(f'{A}/sprites/dummy.png', dummy)

def props(**kw):
    out = []
    for k, v in kw.items():
        t = 'int' if isinstance(v, int) and not isinstance(v, bool) else 'string'
        out.append({'name': k, 'type': t, 'value': v})
    return out
oid = [2000]
def obj(name, x, y, **kw):
    oid[0] += 1
    return {'height': 16, 'id': oid[0], 'name': name, 'properties': props(**kw), 'rotation': 0, 'type': '', 'visible': True,
            'width': 16, 'x': x * 16, 'y': y * 16}

class Room:
    def __init__(self, name, W, H, floor=FLOOR, wall=IWALL, wall_top=2):
        self.name, self.W, self.H = name, W, H
        self.g = [floor] * (W * H); self.o = [0] * (W * H)
        self.doors, self.npcs = [], []
        for x in range(W):
            for y in range(wall_top):
                self.put(x, y, wall, True)
            self.put(x, H - 1, wall, True)
        for y in range(H):
            for x in (0, W - 1):
                self.put(x, y, wall, True)
    def put(self, x, y, t, solid=False, ground=True):
        if ground: self.g[y * self.W + x] = t
        self.o[y * self.W + x] = t if solid else 0
    def block(self, x, y, t):  # a solid decorative tile on top of the floor
        self.o[y * self.W + x] = t
    def door(self, x, y, toMap, toX, toY, **kw):
        self.put(x, y, DOOR, False)
        self.doors.append(obj(f'to-{toMap}', x, y, toMap=toMap, toX=toX, toY=toY, **kw))
    def npc(self, name, x, y, **kw):
        self.npcs.append(obj(name, x, y, id=name, **kw))
    def save(self):
        W, H = self.W, self.H
        def tl(i, n, data): return {'data': data, 'height': H, 'width': W, 'id': i, 'name': n, 'opacity': 1, 'type': 'tilelayer', 'visible': True, 'x': 0, 'y': 0}
        def og(i, n, objs): return {'draworder': 'topdown', 'id': i, 'name': n, 'objects': objs, 'opacity': 1, 'type': 'objectgroup', 'visible': True, 'x': 0, 'y': 0}
        m = {'compressionlevel': -1, 'height': H, 'width': W, 'infinite': False, 'orientation': 'orthogonal', 'renderorder': 'right-down',
             'tiledversion': '1.10.2', 'tileheight': 16, 'tilewidth': 16, 'type': 'map', 'version': '1.10', 'nextlayerid': 6, 'nextobjectid': 3000,
             'tilesets': [dict(TILESET, firstgid=1)],
             'layers': [tl(1, 'ground', self.g), tl(2, 'obstacles', self.o), og(3, 'doors', self.doors), og(4, 'npcs', self.npcs)]}
        json.dump(m, open(f'{A}/maps/{self.name}.json', 'w'))
    def rug(self, x0, y0, x1, y1, t=RUG):
        for x in range(x0, x1 + 1):
            for y in range(y0, y1 + 1): self.g[y * self.W + x] = t

# ---------------- the hall (the map called "school")
HW, HH = 20, 13
hall = Room('school', HW, HH)
for x in (3, 9, 12, 16):
    hall.put(x, 1, BANNER, True)
hall.rug(7, 5, 12, 9)
hall.npc('headmaster', 10, 3, texture='sensei', dialogue='headmaster', giveItem='acceptance-letter', role='headmaster')
hall.npc('student_h1', 5, 7, texture='student1', dialogue='student1', walkRadius=2)
hall.npc('student_h2', 15, 8, texture='student2', dialogue='student2', walkRadius=2)
hall.door(HW // 2, HH - 1, 'town', 4, 3)
hall.door(2, 1, 'kitchen', 5, 7)
hall.door(5, 1, 'potions', 5, 7)
hall.door(7, 1, 'library', 7, 9)
hall.door(14, 1, 'sparring', 7, 9)
hall.door(0, 5, 'dorm1', 10, 4)
hall.door(0, 9, 'dorm2', 10, 4)
hall.door(HW - 1, 6, 'garden', 1, 7)
hall.put(17, 1, STAIRS, False)
hall.doors.append(obj('to-upper', 17, 1, toMap='upper', toX=17, toY=9, requiresFlag='school_upper',
                      lockedMsg='The stairs are for second-year students. Finish the first-year classes, then ask the Headmaster.'))
# hall doors that go to the town / rooms are set below; the exit door's arrival is wired in the town section
hall.save()

def room_exit(r, toMap, toX, toY):
    r.door(r.W // 2, r.H - 1, toMap, toX, toY)
    return r

# ---------------- kitchen
k = Room('kitchen', 11, 9)
for x in (4, 5, 6): k.put(x, 2, COUNTER, True)
k.npc('cook', 5, 3, texture='cook', dialogue='cook', craft='kitchen')
k.npc('student_k1', 8, 5, texture='student3', dialogue='student3', walkRadius=1)
room_exit(k, 'school', 2, 2); k.save()
# ---------------- potion lab
p = Room('potions', 11, 9)
for x in (4, 5, 6): p.put(x, 2, COUNTER, True)
p.npc('alchemist', 5, 3, texture='alchemist', dialogue='alchemist', craft='potions')
p.npc('student_p1', 2, 5, texture='student1', dialogue='student4', walkRadius=1)
room_exit(p, 'school', 5, 2); p.save()

# ---------------- library
BOOKS = [('book1', 3), ('book2', 4), ('book3', 5), ('book4', 6), ('book5', 9), ('book6', 10), ('book7', 11), ('book8', 12)]
lib = Room('library', 15, 11)
lib.rug(5, 5, 9, 8, RUGB)
for bid, x in BOOKS:
    lib.npc(bid, x, 2, texture='bookshelf', dialogue=bid, role='book')
for x in (6, 8): lib.put(x, 4, COUNTER, True)
lib.npc('librarian', 7, 4, texture='student2', dialogue='librarian', role='librarian', books=','.join(b for b, _ in BOOKS))
lib.npc('student_l1', 11, 7, texture='student3', dialogue='student5', walkRadius=2)
room_exit(lib, 'school', 7, 2); lib.save()

# ---------------- sparring hall
sp = Room('sparring', 15, 11)
sp.rug(3, 4, 11, 8, RUG)
sp.npc('sparmaster', 7, 3, texture='sensei', dialogue='sparmaster', role='sparmaster')
for i, (x, y) in enumerate([(3, 6), (6, 6), (9, 6), (12, 6)]):
    sp.npc(f'dummy{i}', x, y, texture='dummy', dialogue='dummy', role='dummy')
sp.npc('student_s1', 3, 9, texture='student1', dialogue='student6', walkRadius=1)
sp.npc('student_s2', 12, 9, texture='student2', dialogue='student2', walkRadius=1)
room_exit(sp, 'school', 14, 2); sp.save()

# ---------------- dorms (door on the right wall, back out to the hall's left wall)
for name, hy, tex, talk, sleepy in (('dorm1', 5, 'student3', 'student1', 'sleeper1'), ('dorm2', 9, 'student1', 'student4', 'sleeper2')):
    d = Room(name, 11, 9)
    d.rug(4, 4, 7, 6, RUGB)
    for x in (2, 5, 8):
        d.npc(f'{name}_bed{x}', x, 3, texture='bed', dialogue='bed', role='bed')
    d.npc(f'{name}_student', 3, 6, texture=tex, dialogue=talk, walkRadius=2)
    d.npc(f'{name}_sleepy', 8, 5, texture='student2', dialogue=sleepy)
    d.door(10, 4, 'school', 1, hy)
    d.save()

# ---------------- upstairs: a landing, the Pet Dojo and the Enchanting Workshop (opened by the Headmaster)
UW, UH = 20, 11
upper = Room('upper', UW, UH)
upper.rug(7, 4, 12, 7, RUGB)
for x in (3, 9, 16): upper.put(x, 1, BANNER, True)
upper.put(17, UH - 1, STAIRS, False)
upper.doors.append(obj('to-school', 17, UH - 1, toMap='school', toX=17, toY=2))
upper.door(5, 1, 'dojo', 7, 9)
upper.door(14, 1, 'workshop', 7, 9)
upper.npc('student_u1', 9, 6, texture='student3', dialogue='student3', walkRadius=2)
upper.npc('upstairssign', 10, 3, texture='sign', dialogue='upstairssign')
upper.save()

dojo = Room('dojo', 15, 11)
dojo.rug(4, 5, 10, 8, RUG)
dojo.npc('trainer', 7, 3, texture='trainer', dialogue='trainer', role='trainer')
dojo.npc('student_d1', 3, 8, texture='student1', dialogue='student8', walkRadius=1)
dojo.npc('student_d2', 12, 7, texture='student2', dialogue='student9', walkRadius=1)
room_exit(dojo, 'upper', 5, 2); dojo.save()

wk = Room('workshop', 15, 11)
wk.rug(4, 5, 10, 8, RUGB)
for x in (6, 7, 8): wk.put(x, 2, COUNTER, True)
for x in (2, 3, 11, 12): wk.npc(f'wkshelf{x}', x, 2, texture='bookshelf', dialogue='wkshelf')
wk.npc('enchanter', 7, 3, texture='enchanter', dialogue='enchanter', role='enchanter')
wk.npc('student_w1', 3, 7, texture='student3', dialogue='student7', walkRadius=1)
room_exit(wk, 'upper', 14, 2); wk.save()

# ---------------- garden (outside) and the barn
GW, GH = 20, 14
gd = Room('garden', GW, GH, floor=GRASS, wall=HEDGE, wall_top=1)
for y in range(1, GH - 1):
    for x in range(1, GW - 1):
        if random.random() < 0.12: gd.g[y * GW + x] = FLOWER
for x in range(1, 17): gd.g[7 * GW + x] = PATH
for y in range(4, 8): gd.g[y * GW + 16] = PATH
for x in range(6, 9):
    for y in range(9, 12): gd.put(x, y, WATER, True)
for (x, y) in [(4, 3), (11, 4), (12, 11), (3, 11), (14, 10), (9, 2)]: gd.put(x, y, HEDGE, True)
for x in range(15, 19):
    for y in range(1, 4): gd.put(x, y, BARNWALL, True)
gd.put(16, 3, DOOR, False)
gd.put(0, 7, DOOR, False)
gd.doors.append(obj('to-school', 0, 7, toMap='school', toX=HW - 2, toY=6))
gd.doors.append(obj('to-barn', 16, 3, toMap='barn', toX=6, toY=7))
gd.npc('student_g1', 4, 6, texture='student1', dialogue='student2', walkRadius=3)
gd.npc('student_g2', 12, 8, texture='student3', dialogue='student5', walkRadius=3)
gd.npc('student_g3', 8, 4, texture='student2', dialogue='student6', walkRadius=2)
gd.npc('gardensign', 2, 6, texture='sign', dialogue='gardensign')
gd.save()

barn = Room('barn', 13, 9, floor=HAY, wall=BARNWALL)
ANIMALS = [('rabbit', 2), ('moth', 4), ('snowfox', 6), ('sandlizard', 8), ('crab', 10)]
for kind, x in ANIMALS:
    barn.npc(f'barn_{kind}', x, 3, texture=kind, dialogue=f'animal_{kind}', role='feeder')
barn.npc('barnkeeper', 10, 6, texture='cook', dialogue='barnkeeper')
barn.door(6, 8, 'garden', 16, 4)
barn.save()

# ---------------- the front of the building in the town (top-left)
tm = json.load(open(f'{A}/maps/town.json'))
TW = tm['width']
tm['tilesets'] = [t for t in tm['tilesets'] if t['name'] != 'school-tiles'] + [dict(TILESET, firstgid=5)]
G = {l['name']: l for l in tm['layers']}
def g(n): return 4 + n
BX0, BX1, DX = 2, 6, 4
for y in range(1, 4):
    for x in range(BX0 - 1, BX1 + 2):
        G['obstacles']['data'][y * TW + x] = 0
for x in range(BX0, BX1 + 1):
    G['ground']['data'][1 * TW + x] = g(ROOF); G['obstacles']['data'][1 * TW + x] = g(ROOF)
    G['ground']['data'][2 * TW + x] = g(OWALL); G['obstacles']['data'][2 * TW + x] = g(OWALL)
G['ground']['data'][2 * TW + DX] = g(DOOR); G['obstacles']['data'][2 * TW + DX] = 0
doors = G['doors']['objects']; npcs = G['npcs']['objects']
doors[:] = [d for d in doors if d['name'] != 'to-school']
doors.append(obj('to-school', DX, 2, toMap='school', toX=HW // 2, toY=HH - 2, requiresItem='moon-crest',
                 lockedMsg='The school gate is sealed. Only a ninja who carries the Moon Crest may enter.'))
npcs[:] = [n for n in npcs if n['name'] != 'schoolsign']
npcs.append(obj('schoolsign', 6, 3, id='schoolsign', texture='sign', dialogue='schoolsign'))
json.dump(tm, open(f'{A}/maps/town.json', 'w'))

# ---------------- recipes
recipes = {
  'kitchen': {'offers': [
    {'id': 'bread', 'out': 'bread', 'amount': 1, 'needs': {'wheat': 2}},
    {'id': 'carrot-stew', 'out': 'carrot-stew', 'amount': 1, 'needs': {'carrot': 2, 'herb': 1}},
    {'id': 'pumpkin-soup', 'out': 'pumpkin-soup', 'amount': 1, 'needs': {'pumpkin': 1, 'herb': 1}},
    {'id': 'frost-pie', 'out': 'frost-pie', 'amount': 1, 'needs': {'frostberry': 2, 'wheat': 1}},
    {'id': 'sea-roll', 'out': 'sea-roll', 'amount': 1, 'needs': {'seaweed': 2, 'wheat': 1}},
    {'id': 'cactus-salad', 'out': 'cactus-salad', 'amount': 1, 'needs': {'cactus-fruit': 2, 'herb': 1}},
    {'id': 'ninja-feast', 'out': 'ninja-feast', 'amount': 1, 'needs': {'pumpkin': 1, 'carrot': 1, 'frostberry': 1, 'seaweed': 1, 'cactus-fruit': 1}},
  ]},
  'petarmor': {'offers': [
    {'id': 'padded-vest', 'out': 'padded-vest', 'amount': 1, 'needs': {'wood': 2, 'herb': 2}},
    {'id': 'copper-mail', 'out': 'copper-mail', 'amount': 1, 'needs': {'copper': 3, 'herb': 1}},
    {'id': 'crystal-plate', 'out': 'crystal-plate', 'amount': 1, 'needs': {'crystal': 3, 'sapphire': 1}},
  ]},
  'enchant': {'offers': [
    {'id': 'ember-gem', 'out': 'ember-gem', 'amount': 1, 'needs': {'ruby': 1, 'crystal': 2}},
    {'id': 'greater-ember-gem', 'out': 'greater-ember-gem', 'amount': 1, 'needs': {'ruby': 2, 'diamond': 1, 'crystal': 3}},
    {'id': 'ward-gem', 'out': 'ward-gem', 'amount': 1, 'needs': {'sapphire': 1, 'crystal': 2}},
    {'id': 'greater-ward-gem', 'out': 'greater-ward-gem', 'amount': 1, 'needs': {'sapphire': 2, 'diamond': 1, 'crystal': 3}},
    {'id': 'swift-scroll', 'out': 'swift-scroll', 'amount': 1, 'needs': {'emerald': 1, 'crystal': 1, 'herb': 2}},
  ]},
  'potions': {'offers': [
    {'id': 'healing-potion', 'out': 'healing-potion', 'amount': 1, 'needs': {'herb': 2, 'frostberry': 1}},
    {'id': 'greater-potion', 'out': 'greater-potion', 'amount': 1, 'needs': {'herb': 3, 'seaweed': 1, 'sapphire': 1}},
    {'id': 'elixir', 'out': 'elixir', 'amount': 1, 'needs': {'herb': 3, 'crystal': 2, 'ruby': 1}},
  ]},
}
json.dump(recipes, open('src/data/recipes.json', 'w'), indent=2)
petarmor = {
  'padded-vest': {'name': 'Padded Vest', 'stamina': 4, 'damage': 0},
  'copper-mail': {'name': 'Copper Pet Mail', 'stamina': 8, 'damage': 0},
  'crystal-plate': {'name': 'Crystal Plate', 'stamina': 12, 'damage': 1},
}
enchants = {
  'ember-gem': {'name': 'Ember Gem', 'slot': 'weapon', 'damage': 1},
  'greater-ember-gem': {'name': 'Greater Ember Gem', 'slot': 'weapon', 'damage': 2},
  'ward-gem': {'name': 'Ward Gem', 'slot': 'armor', 'defense': 1},
  'greater-ward-gem': {'name': 'Greater Ward Gem', 'slot': 'armor', 'defense': 2},
  'swift-scroll': {'name': 'Swift Scroll', 'slot': 'weapon', 'cooldownMul': 0.75},
}
json.dump(enchants, open('src/data/enchants.json', 'w'), indent=2)
json.dump(petarmor, open('src/data/petarmor.json', 'w'), indent=2)

ij = json.load(open('src/data/items.json'))
def item(i, name, icon, color, desc, heal=0):
    d = {'name': name, 'icon': icon, 'color': color, 'desc': desc}
    if heal: d['heal'] = heal
    ij['items'][i] = d
item('bread', 'Bread', 'wheat', '#d9a45a', 'Warm, fresh bread. Eat it to heal.', 3)
item('carrot-stew', 'Carrot Stew', 'carrot', '#e8801f', 'A hearty stew. Eat it to heal.', 5)
item('pumpkin-soup', 'Pumpkin Soup', 'pumpkin', '#f0a030', 'Smooth and sweet. Eat it to heal.', 6)
item('frost-pie', 'Frost Pie', 'gem', '#8fd8ff', 'A cold, tart pie. Eat it to heal.', 6)
item('sea-roll', 'Sea Roll', 'leaf', '#3fb88a', 'Salty and chewy. Eat it to heal.', 6)
item('cactus-salad', 'Cactus Salad', 'leaf', '#f05aa0', 'Crisp and juicy. Eat it to heal.', 6)
item('ninja-feast', 'Ninja Feast', 'crest', '#ffd45e', 'A feast from every land. Eat it to heal a lot.', 12)
item('healing-potion', 'Healing Potion', 'gem', '#ff6b7a', 'A red potion. Drink it to heal.', 8)
item('greater-potion', 'Greater Potion', 'gem', '#ff3b5c', 'A strong potion. Drink it to heal a lot.', 14)
item('elixir', 'Elixir', 'gem', '#ffd45e', 'A golden elixir. Drink it to heal fully.', 99)
item('padded-vest', 'Padded Vest', 'armor', '#c9a36a', 'Pet armor. Your friend gets tired later when it wears this. Fit it at the Pet Dojo.')
item('copper-mail', 'Copper Pet Mail', 'armor', '#d98a4e', 'Pet armor. A big boost to a friend\'s stamina. Fit it at the Pet Dojo.')
item('crystal-plate', 'Crystal Plate', 'armor', '#9be8ff', 'The best pet armor. Lots of stamina and a little extra bite. Fit it at the Pet Dojo.')
item('ember-gem', 'Ember Gem', 'gem', '#ff7a3a', 'An enchantment for your weapon: +1 damage. Set it at the Enchanting Workshop.')
item('greater-ember-gem', 'Greater Ember Gem', 'gem', '#ff4a1a', 'A strong enchantment for your weapon: +2 damage. Set it at the Enchanting Workshop.')
item('ward-gem', 'Ward Gem', 'gem', '#4a8cff', 'An enchantment for your armor: +1 defense. Set it at the Enchanting Workshop.')
item('greater-ward-gem', 'Greater Ward Gem', 'gem', '#2a5cff', 'A strong enchantment for your armor: +2 defense. Set it at the Enchanting Workshop.')
item('swift-scroll', 'Swift Scroll', 'crest', '#9dffb0', 'An enchantment for your weapon: swings 25% faster. Set it at the Enchanting Workshop.')
item('acceptance-letter', 'Acceptance Letter', 'crest', '#f4ead0', 'Your letter from the Ninja School. Proof that you have earned your place.')
json.dump(ij, open('src/data/items.json', 'w'), indent=2)


dj = json.load(open('src/data/dialogue.json'))
def D(key, name, lines, **kw):
    dj[key] = dict({'name': name, 'lines': lines, 'repeatLines': kw.pop('repeat', lines)}, **kw)
D('schoolsign', 'Sign', ['NINJA SCHOOL. Acceptance by Moon Crest only.', 'Grow. Befriend. Fight. Then come. (The sensei says the Moon Crest is the proof.)'], repeat=['NINJA SCHOOL. Acceptance by Moon Crest only.'])
D('gardensign', 'Sign', ['SCHOOL GARDEN. Please do not feed the pond.', 'The barn is at the end of the path. The animals there are happy as they are, but they love snacks.'])
D('headmaster', 'Headmaster',
  ['The Moon Crest! You carried it all this way. You have grown food, made friends and faced bosses. That is the life experience a ninja needs.',
   'Here is your acceptance letter. Look around: kitchen, potion lab, library, sparring hall, the dorms, and the garden out back.'],
  repeat=['Welcome back, student.'],
  needLine='Finish the first-year classes and the stairs will open for you. Still to do:',
  okLines=['You have done every first-year class! Cooked, brewed, read and sparred.', 'The stairs in the hall are open. Upstairs are the Pet Dojo and the Enchanting Workshop.'],
  upperLines=['The stairs are open to you. Upstairs, the Pet Dojo teaches friends to fight. The Enchanting Workshop opens soon.'])
D('cook', 'Cook', ['Welcome to the school kitchen! Bring me what you grow and I will cook something that heals.'], menu='What shall I cook?', farewell='Eat well, ninja!')
D('alchemist', 'Alchemist', ['Herbs, berries and a little gem dust. That is all a good potion needs.'], menu='What shall I brew?', farewell='Drink carefully!')
D('sparmaster', 'Sparing Master'.replace('Sparing', 'Sparring'),
  ['So you want to fight like a ninja. Good. Footwork first, sword second, ego never.',
   'Hit the practice dummies with your sword (J). Every 10 good hits is one lesson. Pass 5 lessons and come back to me.'],
  repeat=['Hit the dummies. Come back after 5 lessons.'],
  progress='Lessons complete: {n} of {total}. Keep hitting the dummies. Ten hits is one lesson.',
  passLines=['Five lessons. Your stance is solid and your cuts are clean.', 'You pass! Your sword will hit harder from now on. Go and prove it.'])
dj['sparmaster']['repeatLines'] = ['You have passed my class. Come and practice any time.']
D('upstairssign', 'Sign', ['SECOND YEAR. Left: Pet Dojo. Right: Enchanting Workshop.'])
D('trainer', 'Pet Trainer', ['Welcome to the Pet Dojo! A friend that has learned to fight is a good friend to have.', 'Your friend will never be hurt. If it gets tired it just rests a while. Train it with its favourite treats, and it can wear armor too.', 'Bring your friend along first: open the friends menu and choose Come with me.'], menu='What shall we work on?', farewell='Be kind to your friend!')
D('enchanter', 'Enchanter', ['Welcome to the Enchanting Workshop! Gems and scrolls hold a little magic. Set one into your weapon or armor and it is yours.', 'Each piece of gear has room for one enchantment. A new one replaces the old, and the old one comes back to you.', 'Ember Gems add damage, Ward Gems add defense, and the Swift Scroll makes your swings faster. The greater gems need a diamond.'], menu='What shall we make?', farewell='May your blade stay sharp!')
D('wkshelf', 'Shelf', ['Shelves of dusty scrolls. All of them say "volume 2" on the spine.'])
D('dummy', 'Dummy', ['A straw training dummy. It has been hit a lot and never complains.'])
D('librarian', 'Librarian', ['Shh! Welcome to the library. Take any book you like and read it where it stands.', 'Read every book and I will have something for you.'],
  progress='Books read: {n} of {total}. There is a surprise when you have read them all.',
  doneLines=['You read every single book! Nobody has ever done that.', 'Here is something better than a bookmark: a stronger heart. Knowledge is good for you.'],
  )
dj['librarian']['repeatLines'] = ['You have read it all. I have nothing left to teach you. Well, maybe a few more volumes next year.']
BOOKS = {
  'book1': ('A Ninja\'s Guide to Not Falling Off Things', 'Chapter 1: Look down. Chapter 2: Do not look down. Chapter 3: You have fallen off something. See Chapter 1.'),
  'book2': ('Cooking With Fire (And Other Mistakes)', 'Rule one: a burnt pumpkin is still a pumpkin. Rule two: it is not. The Ninja Feast needs one treat from every land.'),
  'book3': ('The Secret Life of Rabbits', 'Rabbits love carrots, but every creature has a favourite treat. Face them and offer it. The patient ninja gets a friend.'),
  'book4': ('Bats Are Just Tiny Dragons With Opinions', 'They live in dark caves and dislike being called cute. A crystal lantern helps. Their queen is not as nice as she looks.'),
  'book5': ('Ice, Ice, Ninja', 'The thin ice at the Snowy Peaks will not hold you. A pair of frost boots, made from frostberries, will.'),
  'book6': ('Moon Crest Mysteries', 'The crest came in two halves, one from the cold and one from the deep. Whole, it points north, to where the moon touches the mountain.'),
  'book7': ('101 Uses for a Shovel', '1. Digging. 2. Digging again. 3. Moving a landslide. 4. Hitting a rock. (Not recommended.) 5. Digging.'),
  'book8': ('Enchanting for Beginners, Volume 1 of 12', 'Volume 1 only explains how to hold the book. Volumes 2 to 12 are in the Enchanting Workshop upstairs. Gems and scrolls can add power to a weapon or armor.'),
}
for bid, (title, page) in BOOKS.items():
    D(bid, 'Book', [f'"{title}"', page])
STU = [
  ['I tried to enchant my lunch. It glowed for an hour and then got very cold.'],

  ['Training pets is hard work. I trained a snail once. It is still in training.'],
  ['Did you hear the Pet Dojo trainer? He gave his own pet a tiny vest.'],

  ['I am studying to be a ninja. Today I learned how to stand very still. It is harder than it looks.', 'Now I am practicing standing very still near the cook.'],
  ['The sparring master said I have good form. I think he says that to everyone.'],
  ['I hear you came all the way here with the Moon Crest! Everyone is talking about you.'],
  ['The potions here taste awful, but they work. Mostly.'],
  ['Shh, I am reading. Well, I am pretending to read. The books are very long.'],
  ['The garden is my favourite part of the school. I have named every flower.'],
]
STU = STU[3:] + STU[:3]  # keep the old student1-6 keys; 7-9 are the newer lines
for i, lines in enumerate(STU, 1):
    D(f'student{i}', 'Student', lines)
D('sleeper1', 'Sleepy Student', ['Zzz... five more minutes... zzz...'])
D('sleeper2', 'Sleepy Student', ['Mmm... I was not asleep. I was resting my eyes. Zzz...'])
D('bed', 'Bed', ['A soft bed. You take a short nap.'])
D('barnkeeper', 'Barn Keeper', ['These animals live here and they are very well fed. You can pet them or give them a snack.', 'They are not for taming. They belong to the school. But they like visitors.'],
  repeat=['Say hello to the animals. They love snacks.'])
ANI = {
  'rabbit': ('Barn Rabbit', ['A rabbit twitches its nose at you.'], 'You scratch its ears. It thumps its foot happily.', ['It nibbles it happily.', 'The rabbit does a little jump.']),
  'moth': ('Barn Moth', ['A big fluffy moth rests on a hay bale.'], 'Its wings flutter. Dust sparkles in the air.', ['It sips it daintily.', 'The moth glows a little brighter.']),
  'snowfox': ('Barn Fox', ['A small white fox curls up in the hay.'], 'It leans into your hand and yawns.', ['It gobbles it up.', 'The fox wags its tail.']),
  'sandlizard': ('Barn Lizard', ['A sleepy lizard is sunning itself under a lamp.'], 'It blinks slowly. It likes you.', ['It snaps it up.', 'The lizard puffs out its chest.']),
  'crab': ('Barn Crab', ['A crab sits in a bucket of water, waving a claw.'], 'It clicks its claws in a happy rhythm.', ['It scuttles off with it.', 'The crab waves a claw at you.']),
}
for kind, (nm, lines, pet, fed) in ANI.items():
    D(f'animal_{kind}', nm, lines, petLine=pet, fedLines=fed)
json.dump(dj, open('src/data/dialogue.json', 'w'), indent=2)
print('school built')
