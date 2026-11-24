"""Placeholder art + maps for the forest, the lumberjack and the market stall.
Run from the project root after the other make_*.py scripts. Safe to re-run.
Replace any PNG it makes with real art of the same size."""
import json, random
from PIL import Image, ImageDraw

random.seed(21)
T = 16
A = "public/assets"
OUTLINE = (40, 30, 30, 255)

# ---------- sprites ----------
def person(hat, shirt, accent, beard=False, apron=False):
    im = Image.new("RGBA", (T, T), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    skin = (240, 200, 160, 255)
    d.rectangle([5, 2, 10, 6], fill=skin)
    d.rectangle([4, 1, 11, 3], fill=hat)                       # hat / hair
    d.point([6, 4], fill=(20, 20, 20, 255)); d.point([9, 4], fill=(20, 20, 20, 255))
    if beard: d.rectangle([5, 6, 10, 8], fill=(110, 70, 40, 255))
    d.rectangle([3, 8, 12, 12], fill=shirt)
    if apron: d.rectangle([5, 8, 10, 13], fill=accent)
    else:     d.rectangle([3, 9, 12, 9], fill=accent)          # belt / plaid stripe
    d.rectangle([4, 13, 6, 15], fill=(70, 60, 50, 255)); d.rectangle([9, 13, 11, 15], fill=(70, 60, 50, 255))
    return im

person((150, 40, 40, 255), (190, 60, 50, 255), (60, 30, 30, 255), beard=True).save(f"{A}/sprites/lumberjack.png")
person((60, 120, 70, 255), (210, 190, 120, 255), (240, 240, 230, 255), apron=True).save(f"{A}/sprites/shopkeeper.png")

def tree():
    im = Image.new("RGBA", (T, T), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rectangle([7, 10, 8, 15], fill=(110, 70, 40, 255))                     # trunk
    d.ellipse([1, 0, 14, 11], fill=(30, 110, 50, 255), outline=(20, 70, 35, 255))
    for _ in range(14):
        im.putpixel((random.randrange(3, 12), random.randrange(2, 9)), (60, 150, 75, 255))
    return im
tree().save(f"{A}/sprites/tree.png")

def stump():
    im = Image.new("RGBA", (T, T), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rectangle([4, 9, 11, 14], fill=(120, 80, 45, 255), outline=(70, 45, 25, 255))
    d.ellipse([4, 7, 11, 11], fill=(190, 145, 90, 255), outline=(70, 45, 25, 255))
    d.arc([6, 8, 9, 10], 0, 360, fill=(140, 100, 60, 255))
    return im
stump().save(f"{A}/sprites/stump.png")

# ---------- stall tileset: 0-2 awning (left, middle, right), 3-4 crates ----------
def awning(kind):
    im = Image.new("RGBA", (T, T), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    for x in range(T):
        col = (200, 50, 50, 255) if (x // 4) % 2 == 0 else (245, 240, 230, 255)
        d.rectangle([x, 4, x, 11], fill=col)
    d.rectangle([0, 11, 15, 12], fill=(150, 35, 35, 255))                    # scalloped edge
    for x in range(0, T, 4): d.rectangle([x, 12, x + 3, 13], fill=(200, 50, 50, 255) if (x // 4) % 2 == 0 else (245, 240, 230, 255))
    if kind == "L": d.rectangle([0, 4, 1, 15], fill=(110, 70, 40, 255))      # post
    if kind == "R": d.rectangle([14, 4, 15, 15], fill=(110, 70, 40, 255))
    return im

def crate(kind):
    im = Image.new("RGBA", (T, T), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rectangle([1, 6, 14, 15], fill=(150, 105, 65, 255), outline=(90, 60, 35, 255))
    d.line([1, 10, 14, 10], fill=(110, 75, 45, 255))
    if kind == "apples":
        for x, y in [(3, 4), (7, 3), (11, 4), (5, 5), (9, 5)]: d.ellipse([x, y, x + 3, y + 3], fill=(210, 50, 50, 255))
    else:
        for x in (3, 7, 11): d.rectangle([x, 3, x + 2, 6], fill=(235, 220, 160, 255), outline=(190, 170, 110, 255))
    return im

tiles = [awning("L"), awning("M"), awning("R"), crate("apples"), crate("seeds")]
sheet = Image.new("RGBA", (T * len(tiles), T), (0, 0, 0, 0))
for i, t in enumerate(tiles): sheet.paste(t, (i * T, 0))
sheet.save(f"{A}/tilesets/stall-tiles.png")

# ---------- map helpers ----------
GRASS, PATH, WATER, TREE = 1, 2, 3, 4          # tiles.png
STALL0 = 13                                    # stall-tiles.png starts after tiles (1-4) and farm-tiles (5-12)
AWN_L, AWN_M, AWN_R, CRATE_A, CRATE_S = range(STALL0, STALL0 + 5)

def prop(n, v): return {"name": n, "type": "int" if isinstance(v, int) else "string", "value": v}
def rect(oid, name, tx, ty, props):
    return {"height": T, "id": oid, "name": name, "properties": props, "rotation": 0, "type": "",
            "visible": True, "width": T, "x": tx * T, "y": ty * T}
def objlayer(lid, name, objs):
    return {"draworder": "topdown", "id": lid, "name": name, "objects": objs, "opacity": 1,
            "type": "objectgroup", "visible": True, "x": 0, "y": 0}
def tilelayer(lid, name, data, W, H):
    return {"data": data, "height": H, "width": W, "id": lid, "name": name, "opacity": 1,
            "type": "tilelayer", "visible": True, "x": 0, "y": 0}
def layer(m, name): return next(l for l in m["layers"] if l["name"] == name)

# ---------- FOREST: 26 x 20 ----------
W, H = 26, 20
idx = lambda x, y: y * W + x
ground = [GRASS] * (W * H); obst = [0] * (W * H)
for y in range(H): ground[idx(15, y)] = PATH                   # the road down from town
for x in range(6, 22): ground[idx(x, 12)] = PATH               # a crossing path
for x in range(W): obst[idx(x, 0)] = TREE; obst[idx(x, H - 1)] = TREE
for y in range(H): obst[idx(0, y)] = TREE; obst[idx(W - 1, y)] = TREE
obst[idx(15, 0)] = 0                                           # gap = the door back to town

LJ = (17, 5)                                                   # lumberjack
reserved = {LJ, (16, 5), (15, 1), (15, 2)}
trees = []
tries = 0
while len(trees) < 28 and tries < 2000:
    tries += 1
    x, y = random.randrange(2, W - 2), random.randrange(2, H - 2)
    if ground[idx(x, y)] != GRASS or (x, y) in reserved or any(abs(x - a) + abs(y - b) < 2 for a, b in trees): continue
    if abs(x - 15) <= 1 and y in (11, 12, 13): continue
    trees.append((x, y))

targets = [rect(10 + i, f"tree{i}", x, y, [
    prop("id", f"tree{i}"), prop("texture", "tree"), prop("tool", "axe"), prop("hits", 3),
    prop("drop", "wood"), prop("dropAmount", 2), prop("respawnMs", 45000),
    prop("hint", "You need an axe to chop that. The lumberjack might have one."),
    prop("clearedMsg", "Timber!")]) for i, (x, y) in enumerate(trees)]

forest = {
    "compressionlevel": -1, "height": H, "width": W, "infinite": False,
    "layers": [
        tilelayer(1, "ground", ground, W, H),
        tilelayer(2, "obstacles", obst, W, H),
        objlayer(3, "doors", [rect(1, "to-town", 15, 0, [prop("toMap", "town"), prop("toX", 15), prop("toY", 18)])]),
        objlayer(4, "npcs", [rect(2, "lumberjack", *LJ, [prop("id", "lumberjack"), prop("texture", "lumberjack"), prop("dialogue", "lumberjack")])]),
        objlayer(5, "targets", targets),
    ],
    "nextlayerid": 6, "nextobjectid": 10 + len(targets), "orientation": "orthogonal", "renderorder": "right-down",
    "tiledversion": "1.10.2", "tileheight": T, "tilewidth": T, "type": "map", "version": "1.10",
    "tilesets": [{"columns": 4, "firstgid": 1, "image": "../tilesets/tiles.png", "imageheight": T, "imagewidth": T * 4,
                  "margin": 0, "name": "tiles", "spacing": 0, "tilecount": 4, "tileheight": T, "tilewidth": T}],
}
json.dump(forest, open(f"{A}/maps/forest.json", "w"))

# ---------- TOWN: a door at the south end of the road ----------
town = json.load(open(f"{A}/maps/town.json"))
TW, TH = town["width"], town["height"]
layer(town, "obstacles")["data"][(TH - 1) * TW + 15] = 0                 # open the treeline at the bottom of the road
doors = layer(town, "doors")
doors["objects"] = [o for o in doors["objects"] if o["name"] != "to-forest"]
doors["objects"].append(rect(5, "to-forest", 15, TH - 1, [prop("toMap", "forest"), prop("toX", 15), prop("toY", 1)]))
town["nextobjectid"] = max(town.get("nextobjectid", 6), 6)
json.dump(town, open(f"{A}/maps/town.json", "w"))

# ---------- FARM: the market stall ----------
farm = json.load(open(f"{A}/maps/farm.json"))
FW, FH = farm["width"], farm["height"]
fobst = layer(farm, "obstacles")["data"]
farm["layers"] = [l for l in farm["layers"] if l["name"] != "decor"]
farm["tilesets"] = [t for t in farm["tilesets"] if t["name"] != "stall-tiles"]
farm["tilesets"].append({"columns": 5, "firstgid": STALL0, "image": "../tilesets/stall-tiles.png", "imageheight": T,
                         "imagewidth": T * 5, "margin": 0, "name": "stall-tiles", "spacing": 0, "tilecount": 5,
                         "tileheight": T, "tilewidth": T})
decor = [0] * (FW * FH)
SX, SY = 17, 9                                                           # stall: awning on row 9, counter on row 10
for dx, g in enumerate((AWN_L, AWN_M, AWN_R)): decor[(SY) * FW + SX + dx] = g
for tx in (SX, SX + 2): fobst[(SY + 1) * FW + tx] = CRATE_A if tx == SX else CRATE_S
fobst[(SY + 1) * FW + SX + 1] = 0                                        # the shopkeeper stands here
for tx in range(SX - 1, SX + 4):                                              # keep the customer's side clear of random trees
    for ty in (SY + 2,):
        if fobst[ty * FW + tx] == TREE: fobst[ty * FW + tx] = 0
for tx in (SX, SX + 1, SX + 2): fobst[SY * FW + tx] = 0                  # nothing solid under the awning
# decor layer goes right after ground
gi = next(i for i, l in enumerate(farm["layers"]) if l["name"] == "ground")
farm["layers"].insert(gi + 1, tilelayer(6, "decor", decor, FW, FH))
npcs = layer(farm, "npcs")
npcs["objects"] = [o for o in npcs["objects"] if o["name"] != "shopkeeper"]
npcs["objects"].append(rect(3, "shopkeeper", SX + 1, SY + 1, [prop("id", "shopkeeper"), prop("texture", "shopkeeper"),
                                                            prop("dialogue", "shopkeeper"), prop("shop", "general")]))
farm["nextlayerid"] = max(farm.get("nextlayerid", 7), 7)
farm["nextobjectid"] = max(farm.get("nextobjectid", 4), 4)
json.dump(farm, open(f"{A}/maps/farm.json", "w"))

# ---------- sanity checks ----------
from collections import deque
for name in ("forest", "town", "farm"):
    m = json.load(open(f"{A}/maps/{name}.json"))
    w, h = m["width"], m["height"]
    tl = {l["name"]: l for l in m["layers"] if l["type"] == "tilelayer"}
    assert all(len(l["data"]) == w * h for l in tl.values()), name
    ob = tl["obstacles"]["data"]
    objs = {l["name"]: l["objects"] for l in m["layers"] if l["type"] == "objectgroup"}
    seen_pos = set()
    for lname, lst in objs.items():
        for o in lst:
            x, y = o["x"] // T, o["y"] // T
            assert 0 <= x < w and 0 <= y < h, (name, o["name"])
            if lname in ("npcs", "targets"):
                assert ob[y * w + x] == 0, (name, "on an obstacle", o["name"], (x, y))
                assert (x, y) not in seen_pos, (name, "overlap", o["name"]); seen_pos.add((x, y))
    # every door/NPC/target must be reachable from the first door's landing spot (treating targets as blocked)
    blocked = {(o["x"] // T, o["y"] // T) for l in ("npcs", "targets") for o in objs.get(l, [])}
    if name == "forest": start = (15, 1)
    elif name == "farm": start = (1, 8)
    else: start = (15, 10)
    seen = {start}; q = deque([start])
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (x + dx, y + dy)
            if 0 <= n[0] < w and 0 <= n[1] < h and n not in seen and n not in blocked and ob[n[1] * w + n[0]] == 0:
                seen.add(n); q.append(n)
    if name == "forest":
        lj = (17, 5); assert any((lj[0] + dx, lj[1] + dy) in seen for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        door = (15, 0); assert (15, 1) in seen
    if name == "farm":
        assert (18, 11) in seen, "player can't reach the shopkeeper's spot"
    if name == "town":
        assert (15, 18) not in seen, "south of the landslide should be sealed until it is cleared"
print("forest, town, farm maps written; checks passed. forest trees:", len(trees))
