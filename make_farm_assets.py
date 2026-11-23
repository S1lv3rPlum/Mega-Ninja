"""Generates the farm tileset (placeholder art), the farm map, and adds the
doors/npcs object layers to the town map. Run after make_assets.py. Safe to re-run."""
import json, random
from PIL import Image, ImageDraw

random.seed(11)
T = 16
BROWN = (121, 82, 52, 255)
DARK = (92, 60, 38, 255)
LIGHT = (146, 104, 68, 255)
GREEN = (70, 170, 70, 255)
GREEN_D = (40, 120, 50, 255)
GOLD = (230, 190, 60, 255)
GOLD_D = (190, 145, 40, 255)

def dirt():
    im = Image.new("RGBA", (T, T), BROWN)
    d = ImageDraw.Draw(im)
    for y in (3, 8, 13):
        d.line([0, y, 15, y], fill=DARK)          # furrows
    for _ in range(14):
        im.putpixel((random.randrange(T), random.randrange(T)), LIGHT)
    return im

def sown():
    im = dirt(); d = ImageDraw.Draw(im)
    for x, y in [(3, 2), (9, 2), (13, 2), (5, 7), (11, 7), (2, 12), (8, 12), (14, 12)]:
        d.rectangle([x, y, x + 1, y], fill=(235, 220, 160, 255))   # seeds
    return im

def sprouts():
    im = dirt(); d = ImageDraw.Draw(im)
    for x in (3, 8, 13):
        for y in (2, 7, 12):
            d.line([x, y, x, y - 2], fill=GREEN)
            d.point([x - 1, y - 2], fill=GREEN); d.point([x + 1, y - 2], fill=GREEN)
    return im

def young():
    im = dirt(); d = ImageDraw.Draw(im)
    for x in (3, 8, 13):
        for y in (5, 10, 15):
            d.line([x, y, x, y - 5], fill=GREEN_D)
            d.line([x - 1, y - 3, x - 1, y - 5], fill=GREEN)
            d.line([x + 1, y - 3, x + 1, y - 5], fill=GREEN)
    return im

def ready():
    im = dirt(); d = ImageDraw.Draw(im)
    for x in (3, 8, 13):
        for y in (6, 11, 16):
            d.line([x, y, x, y - 6], fill=GOLD_D)
            d.rectangle([x - 1, y - 8, x + 1, y - 5], fill=GOLD)    # wheat head
    return im

def pump():
    im = Image.new("RGBA", (T, T), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rectangle([5, 13, 10, 15], fill=(90, 90, 100, 255))            # base
    d.rectangle([6, 6, 9, 13], fill=(130, 135, 150, 255))            # body
    d.rectangle([6, 4, 9, 6], fill=(100, 105, 120, 255))             # head
    d.line([9, 5, 14, 3], fill=(110, 70, 40, 255), width=2)          # handle
    d.rectangle([3, 8, 5, 9], fill=(130, 135, 150, 255))             # spout
    d.rectangle([3, 10, 4, 11], fill=(90, 170, 240, 255))            # water drop
    return im

def fence():
    im = Image.new("RGBA", (T, T), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rectangle([0, 5, 15, 6], fill=(150, 105, 65, 255))
    d.rectangle([0, 10, 15, 11], fill=(150, 105, 65, 255))
    for x in (1, 11):
        d.rectangle([x, 3, x + 2, 14], fill=(120, 80, 48, 255))
    return im

def hay():
    im = Image.new("RGBA", (T, T), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle([1, 4, 14, 14], radius=4, fill=(225, 190, 80, 255), outline=(170, 130, 40, 255))
    for x in (4, 8, 11):
        d.line([x, 5, x, 13], fill=(190, 150, 50, 255))
    return im

order = [dirt(), sown(), sprouts(), young(), ready(), pump(), fence(), hay()]
sheet = Image.new("RGBA", (T * len(order), T), (0, 0, 0, 0))
for i, t in enumerate(order):
    sheet.paste(t, (i * T, 0))
sheet.save("public/assets/tilesets/farm-tiles.png")

# ---- gids ----  tiles.png: 1 grass, 2 path, 3 water, 4 tree
GRASS, PATH, WATER, TREE = 1, 2, 3, 4
# farm-tiles.png starts at gid 5
DIRT, SOWN, SPROUTS, YOUNG, READY, PUMP, FENCE, HAY = range(5, 13)

def prop(name, value):
    t = "int" if isinstance(value, int) else "string"
    return {"name": name, "type": t, "value": value}

def rect(oid, name, tx, ty, props):
    return {"height": T, "id": oid, "name": name, "properties": props, "rotation": 0,
            "type": "", "visible": True, "width": T, "x": tx * T, "y": ty * T}

def objlayer(lid, name, objects):
    return {"draworder": "topdown", "id": lid, "name": name, "objects": objects,
            "opacity": 1, "type": "objectgroup", "visible": True, "x": 0, "y": 0}

def tilelayer(lid, name, data, W, H):
    return {"data": data, "height": H, "width": W, "id": lid, "name": name,
            "opacity": 1, "type": "tilelayer", "visible": True, "x": 0, "y": 0}

# ---- farm map: 24 x 16 ----
W, H = 24, 16
idx = lambda x, y: y * W + x
ground = [GRASS] * (W * H)
crops = [0] * (W * H)
obst = [0] * (W * H)

for x in range(0, 15): ground[idx(x, 8)] = PATH           # road from the west door
ground[idx(14, 7)] = PATH                                  # gap into the field

for x in range(W): obst[idx(x, 0)] = TREE; obst[idx(x, H - 1)] = TREE
for y in range(H): obst[idx(0, y)] = TREE; obst[idx(W - 1, y)] = TREE
obst[idx(0, 8)] = 0                                        # door gap

# fenced field with plots inside (x 12..17, y 4..6)
for x in range(11, 19):
    obst[idx(x, 3)] = FENCE
    if x != 14: obst[idx(x, 7)] = FENCE
for y in range(4, 7):
    obst[idx(11, y)] = FENCE; obst[idx(18, y)] = FENCE
for y in range(4, 7):
    for x in range(12, 18): crops[idx(x, y)] = DIRT
# preview row showing every growth stage (the farming code will replace these)
for i, g in enumerate([DIRT, SOWN, SPROUTS, YOUNG, READY, DIRT]): crops[idx(12 + i, 4)] = g

obst[idx(6, 6)] = PUMP
for tx, ty in [(20, 12), (21, 12), (20, 13)]: obst[idx(tx, ty)] = HAY
for _ in range(10):
    x, y = random.randrange(2, W - 2), random.randrange(10, H - 2)
    if obst[idx(x, y)] == 0 and ground[idx(x, y)] == GRASS: obst[idx(x, y)] = TREE

farm = {
    "compressionlevel": -1, "height": H, "width": W, "infinite": False,
    "layers": [
        tilelayer(1, "ground", ground, W, H),
        tilelayer(2, "crops", crops, W, H),
        tilelayer(3, "obstacles", obst, W, H),
        objlayer(4, "doors", [rect(1, "to-town", 0, 8, [prop("toMap", "town"), prop("toX", 28), prop("toY", 10)])]),
        objlayer(5, "npcs", [rect(2, "farmer", 9, 7, [prop("id", "farmer"), prop("texture", "npc"), prop("dialogue", "farmer")])]),
    ],
    "nextlayerid": 6, "nextobjectid": 3, "orientation": "orthogonal", "renderorder": "right-down",
    "tiledversion": "1.10.2", "tileheight": T, "tilewidth": T, "type": "map", "version": "1.10",
    "tilesets": [
        {"columns": 4, "firstgid": 1, "image": "../tilesets/tiles.png", "imageheight": T, "imagewidth": T * 4,
         "margin": 0, "name": "tiles", "spacing": 0, "tilecount": 4, "tileheight": T, "tilewidth": T},
        {"columns": 8, "firstgid": 5, "image": "../tilesets/farm-tiles.png", "imageheight": T, "imagewidth": T * 8,
         "margin": 0, "name": "farm-tiles", "spacing": 0, "tilecount": 8, "tileheight": T, "tilewidth": T},
    ],
}
json.dump(farm, open("public/assets/maps/farm.json", "w"))

# ---- patch the town map: open the east road, add doors + npcs layers ----
town = json.load(open("public/assets/maps/town.json"))
TW = town["width"]
town["layers"] = [l for l in town["layers"] if l["type"] == "tilelayer"]   # idempotent
for l in town["layers"]:
    if l["name"] == "obstacles":
        l["data"][10 * TW + (TW - 1)] = 0                   # remove the tree at the east end of the road
town["layers"].append(objlayer(3, "doors", [rect(1, "to-farm", TW - 1, 10, [prop("toMap", "farm"), prop("toX", 1), prop("toY", 8)])]))
town["layers"].append(objlayer(4, "npcs", [rect(2, "elder", 17, 10, [prop("id", "elder"), prop("texture", "npc"), prop("dialogue", "elder")])]))
town["nextlayerid"] = 5
town["nextobjectid"] = 3
json.dump(town, open("public/assets/maps/town.json", "w"))

# ---- sanity checks ----
for name, m in (("farm", farm), ("town", town)):
    w, h = m["width"], m["height"]
    tl = {l["name"]: l for l in m["layers"] if l["type"] == "tilelayer"}
    assert all(len(l["data"]) == w * h for l in tl.values()), name
    for l in m["layers"]:
        if l["type"] != "objectgroup": continue
        for o in l["objects"]:
            tx, ty = o["x"] // T, o["y"] // T
            assert 0 <= tx < w and 0 <= ty < h, (name, o["name"])
            if l["name"] == "npcs":
                assert tl["obstacles"]["data"][ty * w + tx] == 0, (name, "npc on obstacle", o["name"])
print("farm + town maps written, checks passed")
