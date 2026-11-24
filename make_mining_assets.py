"""Placeholder art + maps for the quarry (mining corner), coloured rocks and the boulder.
Run from the project root. Safe to re-run (the forest edit only happens once). Replace any PNG with real art of the same size."""
import json, random
from PIL import Image, ImageDraw

random.seed(33)
T = 16
A = "public/assets"
OUT = (35, 32, 38, 255)

# ---------- rocks (16x16): body colour per variant ----------
ROCKS = {
    "grey":     ((140, 144, 152, 255), None),
    "copper":   ((140, 144, 152, 255), (205, 120, 75, 255)),
    "sapphire": ((140, 144, 152, 255), (60, 110, 230, 255)),
    "emerald":  ((140, 144, 152, 255), (45, 175, 90, 255)),
    "ruby":     ((140, 144, 152, 255), (220, 55, 75, 255)),
    "diamond":  ((140, 144, 152, 255), (200, 245, 255, 255)),
}
def lighter(c, f): return tuple(min(255, int(v * f)) for v in c[:3]) + (255,)
def darker(c, f): return tuple(int(v * f) for v in c[:3]) + (255,)

def rock(body, fleck):
    im = Image.new("RGBA", (T, T), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.polygon([(2, 14), (1, 9), (4, 4), (9, 2), (13, 5), (15, 10), (13, 14)], fill=body, outline=OUT)
    d.polygon([(4, 5), (9, 3), (12, 6), (8, 7)], fill=lighter(body, 1.25))            # lit top
    d.line([(3, 13), (13, 13)], fill=darker(body, 0.7))                                  # shaded base
    if fleck:
        for (x, y) in [(5, 9), (8, 8), (10, 10), (7, 11), (11, 7)]:
            d.rectangle([x, y, x + 1, y + 1], fill=fleck)
            im.putpixel((x, y), lighter(fleck, 1.3))
    return im
for name, (body, fleck) in ROCKS.items():
    rock(body, fleck).save(f"{A}/sprites/rock-{name}.png")

def rubble():
    im = Image.new("RGBA", (T, T), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    for (x, y, w) in [(3, 11, 4), (8, 12, 5), (6, 9, 3), (11, 10, 3)]:
        d.rectangle([x, y, x + w - 1, y + 2], fill=(125, 128, 136, 255), outline=OUT)
    return im
rubble().save(f"{A}/sprites/rubble.png")

def boulder():
    im = Image.new("RGBA", (T, T), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.ellipse([0, 1, 15, 15], fill=(120, 122, 132, 255), outline=OUT)
    d.ellipse([2, 2, 9, 8], fill=(160, 162, 172, 255))
    d.line([(8, 6), (11, 10)], fill=(70, 70, 80, 255)); d.line([(11, 10), (9, 13)], fill=(70, 70, 80, 255))
    d.line([(4, 11), (7, 12)], fill=(70, 70, 80, 255))
    return im
boulder().save(f"{A}/sprites/boulder.png")

# ---------- tileset: 1 cliff, 2 stony ground, 3 cave floor, 4 cave mouth, 5 stone path ----------
def tile(kind):
    im = Image.new("RGBA", (T, T), (0, 0, 0, 255)); d = ImageDraw.Draw(im)
    if kind == "cliff":
        d.rectangle([0, 0, 15, 15], fill=(96, 98, 108, 255))
        for y in range(0, 16, 5):
            d.line([(0, y), (15, y)], fill=(70, 72, 82, 255))
        for x, y in [(3, 2), (10, 4), (6, 9), (13, 12), (2, 13)]:
            d.line([(x, y), (x + 2, y)], fill=(125, 128, 138, 255))
    elif kind == "stony":
        d.rectangle([0, 0, 15, 15], fill=(150, 140, 126, 255))
        for _ in range(16):
            im.putpixel((random.randrange(16), random.randrange(16)), random.choice([(130, 120, 108, 255), (170, 160, 146, 255), (118, 112, 104, 255)]))
    elif kind == "cave":
        d.rectangle([0, 0, 15, 15], fill=(52, 46, 52, 255))
        for _ in range(8): im.putpixel((random.randrange(16), random.randrange(16)), (70, 62, 70, 255))
    elif kind == "mouth":
        d.rectangle([0, 0, 15, 15], fill=(96, 98, 108, 255))
        d.ellipse([1, 1, 14, 16], fill=(12, 10, 14, 255))
        d.arc([1, 1, 14, 16], 180, 360, fill=(70, 72, 82, 255))
    elif kind == "path":
        d.rectangle([0, 0, 15, 15], fill=(176, 164, 144, 255))
        for _ in range(10): im.putpixel((random.randrange(16), random.randrange(16)), (155, 144, 126, 255))
    return im
sheet = Image.new("RGBA", (T * 5, T), (0, 0, 0, 0))
for i, k in enumerate(["cliff", "stony", "cave", "mouth", "path"]): sheet.paste(tile(k), (i * T, 0))
sheet.save(f"{A}/tilesets/mine-tiles.png")

# ---------- maps ----------
MINE = {"columns": 5, "firstgid": 5, "image": "../tilesets/mine-tiles.png", "imageheight": 16, "imagewidth": 80,
        "margin": 0, "name": "mine-tiles", "spacing": 0, "tilecount": 5, "tileheight": 16, "tilewidth": 16}
CLIFF, STONY, CAVE, MOUTH, PATH = 5, 6, 7, 8, 9

def prop(n, t, v): return {"name": n, "type": t, "value": v}

# --- forest: cliff wall on the east side with a boulder in the road, door to the quarry ---
fp = f"{A}/maps/forest.json"
f = json.load(open(fp))
if not any(t["name"] == "mine-tiles" for t in f["tilesets"]):
    f["tilesets"].append(MINE)
    W, H = f["width"], f["height"]
    L = {l["name"]: l for l in f["layers"]}
    g, ob = L["ground"]["data"], L["obstacles"]["data"]
    for y in range(1, H - 1):
        for x in (24, 25):
            ob[y * W + x] = CLIFF
    for x in range(22, 26): g[12 * W + x] = 2                      # road all the way to the east edge
    ob[12 * W + 24] = 0; ob[12 * W + 25] = 0                       # a gap for the road
    f["layers"][[l["name"] for l in f["layers"]].index("doors")]["objects"].append(
        {"height": 16, "id": 60, "name": "to-quarry", "rotation": 0, "type": "", "visible": True, "width": 16, "x": 25 * T, "y": 12 * T,
         "properties": [prop("toMap", "string", "quarry"), prop("toX", "int", 1), prop("toY", "int", 12)]})
    L["targets"]["objects"].append(
        {"height": 16, "id": 61, "name": "boulder", "rotation": 0, "type": "", "visible": True, "width": 16, "x": 24 * T, "y": 12 * T,
         "properties": [prop("id", "string", "boulder"), prop("texture", "string", "boulder"), prop("tool", "string", "pickaxe"),
                        prop("hits", "int", 12), prop("drop", "string", "stone"), prop("dropAmount", "int", 5),
                        prop("flag", "string", "boulder_cleared"),
                        prop("hint", "string", "A huge boulder blocks the road. You would need a pickaxe to break it. The market might sell one."),
                        prop("clearedMsg", "string", "The boulder crumbles!")]})
    f["nextobjectid"] = 70
    json.dump(f, open(fp, "w"), separators=(",", ":"))

# --- quarry ---
W, H = 26, 20
ground = [STONY] * (W * H)
ob = [0] * (W * H)
for y in range(H):
    for x in range(W):
        if x in (0, W - 1) or y in (0, H - 1): ob[y * W + x] = CLIFF
for x in range(0, 14): ground[12 * W + x] = PATH                    # path in from the forest road
for y in range(3, 13): ground[y * W + 14] = PATH                    # path up to the cave
ob[12 * W + 0] = 0                                                  # door tile
# the big cave mouth, top right: 5 wide x 3 tall, of cliff with a dark mouth in the middle
for y in range(1, 4):
    for x in range(17, 22):
        ob[y * W + x] = CLIFF
for x in (18, 19, 20):
    ob[3 * W + x] = MOUTH
    for y in (1, 2): ob[y * W + x] = MOUTH
for x in range(15, 22): ground[4 * W + x] = PATH
# a few cliff outcrops to make it feel like a quarry
for (x, y) in [(5, 4), (6, 4), (6, 5), (9, 16), (10, 16), (22, 14), (23, 14), (23, 15), (3, 8), (4, 8)]:
    ob[y * W + x] = CLIFF

taken = {(x, y) for y in range(H) for x in range(W) if ob[y * W + x] or ground[y * W + x] == PATH}
taken |= {(1, 12), (5, 10), (4, 10), (6, 10), (5, 11), (5, 9)}
spots = [(x, y) for y in range(2, H - 2) for x in range(2, W - 2) if (x, y) not in taken and not (16 <= x <= 22 and y <= 5)]
random.shuffle(spots)
objs = []
for i, (x, y) in enumerate(sorted(spots[:24])):
    objs.append({"height": 16, "id": 100 + i, "name": f"rock{i}", "rotation": 0, "type": "", "visible": True, "width": 16, "x": x * T, "y": y * T,
                 "properties": [prop("id", "string", f"rock{i}"), prop("texture", "string", "rock-grey"), prop("tool", "string", "pickaxe"),
                                prop("variants", "string", "rocks"), prop("hits", "int", 3), prop("respawnMs", "int", 60000),
                                prop("stump", "string", "rubble"),
                                prop("hint", "string", "You need a pickaxe to break that rock. The market might sell one.")]})
def layer(i, name, data): return {"data": data, "height": H, "id": i, "name": name, "opacity": 1, "type": "tilelayer", "visible": True, "width": W, "x": 0, "y": 0}
quarry = {
    "compressionlevel": -1, "height": H, "width": W, "infinite": False, "nextlayerid": 6, "nextobjectid": 200, "orientation": "orthogonal",
    "renderorder": "right-down", "tiledversion": "1.10.2", "tileheight": 16, "tilewidth": 16, "type": "map", "version": "1.10",
    "tilesets": [MINE],
    "layers": [
        layer(1, "ground", ground), layer(2, "obstacles", ob),
        {"draworder": "topdown", "id": 3, "name": "doors", "objects": [
            {"height": 16, "id": 1, "name": "to-forest", "rotation": 0, "type": "", "visible": True, "width": 16, "x": 0, "y": 12 * T,
             "properties": [prop("toMap", "string", "forest"), prop("toX", "int", 23), prop("toY", "int", 12)]}],
         "opacity": 1, "type": "objectgroup", "visible": True, "x": 0, "y": 0},
        {"draworder": "topdown", "id": 4, "name": "npcs", "objects": [
            {"height": 16, "id": 2, "name": "miner", "rotation": 0, "type": "", "visible": True, "width": 16, "x": 5 * T, "y": 10 * T,
             "properties": [prop("id", "string", "miner"), prop("texture", "string", "npc"), prop("dialogue", "string", "miner")]}],
         "opacity": 1, "type": "objectgroup", "visible": True, "x": 0, "y": 0},
        {"draworder": "topdown", "id": 5, "name": "targets", "objects": objs, "opacity": 1, "type": "objectgroup", "visible": True, "x": 0, "y": 0},
    ],
}
json.dump(quarry, open(f"{A}/maps/quarry.json", "w"), separators=(",", ":"))
print("quarry rocks:", len(objs))
