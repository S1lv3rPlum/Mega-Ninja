"""Placeholder art + map edits for the new crops, bushes, the treant boss and the cave sign.
Run from the project root. Safe to re-run (map edits only happen once). Replace PNGs with real art of the same size."""
import json, random
from PIL import Image, ImageDraw
random.seed(9)
T = 16; A = "public/assets"
def px(im, pts, col):
    for p in pts: im.putpixel(p, col)

# ---------- crops drawn over dirt: stage 2 sprouts, 3 young, 4 ready ----------
G1, G2 = (70, 160, 70, 255), (40, 110, 50, 255)
def crop(kind, stage):
    im = Image.new("RGBA", (T, T), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    if stage == 2:
        for x in (5, 10): d.line([(x, 13), (x, 10)], fill=G2); d.point((x - 1, 9), fill=G1); d.point((x + 1, 9), fill=G1)
    elif stage == 3:
        for x in (4, 8, 12):
            d.line([(x, 14), (x, 8)], fill=G2); d.polygon([(x, 8), (x - 2, 5), (x + 1, 6)], fill=G1); d.polygon([(x, 9), (x + 3, 6), (x + 1, 10)], fill=G1)
        if kind == "pumpkin": d.ellipse([5, 11, 10, 14], fill=(110, 160, 60, 255))
    else:
        if kind == "carrot":
            for x in (4, 8, 12):
                d.polygon([(x - 1, 9), (x + 2, 9), (x, 13)], fill=(235, 140, 50, 255)); d.line([(x, 9), (x, 4)], fill=G2); d.polygon([(x, 5), (x - 2, 2), (x + 1, 3)], fill=G1); d.polygon([(x, 5), (x + 3, 2), (x + 1, 4)], fill=G1)
        else:
            d.ellipse([2, 6, 13, 15], fill=(225, 120, 30, 255), outline=(140, 70, 20, 255))
            d.line([(7, 7), (7, 14)], fill=(190, 95, 20, 255)); d.line([(5, 8), (5, 13)], fill=(190, 95, 20, 255)); d.line([(10, 8), (10, 13)], fill=(190, 95, 20, 255))
            d.rectangle([7, 3, 8, 6], fill=G2); d.polygon([(8, 5), (12, 3), (11, 6)], fill=G1)
    return im
for k in ("carrot", "pumpkin"):
    for n in (2, 3, 4): crop(k, n).save(f"{A}/sprites/crop-{k}-{n}.png")

# ---------- bush (forage) ----------
def bush(bare):
    im = Image.new("RGBA", (T, T), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.ellipse([1, 4, 14, 14], fill=(50, 130, 60, 255), outline=(25, 80, 40, 255))
    for _ in range(12): im.putpixel((random.randrange(3, 13), random.randrange(6, 12)), (80, 175, 85, 255))
    if not bare:
        for (x, y) in [(5, 7), (10, 6), (8, 10), (4, 10)]: d.rectangle([x, y, x + 1, y + 1], fill=(235, 80, 100, 255))   # berries
    return im
bush(False).save(f"{A}/sprites/bush.png"); bush(True).save(f"{A}/sprites/bush-bare.png")

# ---------- the treant: 32x32 ----------
def treant(good):
    im = Image.new("RGBA", (32, 32), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    bark, bark_d = ((120, 80, 45, 255), (70, 45, 25, 255)) if good else ((60, 42, 62, 255), (30, 20, 35, 255))
    leaf, leaf2 = ((60, 150, 70, 255), (95, 190, 90, 255)) if good else ((70, 40, 90, 255), (110, 60, 130, 255))
    d.polygon([(8, 31), (10, 18), (22, 18), (24, 31)], fill=bark, outline=bark_d)                       # trunk
    d.polygon([(6, 31), (9, 26), (11, 31)], fill=bark, outline=bark_d); d.polygon([(21, 31), (23, 26), (26, 31)], fill=bark, outline=bark_d)  # roots
    d.line([(10, 22), (3, 16)], fill=bark_d, width=3); d.line([(22, 22), (29, 15)], fill=bark_d, width=3)   # arms
    d.ellipse([2, 0, 29, 19], fill=leaf, outline=bark_d)                                                  # crown
    for _ in range(30): im.putpixel((random.randrange(5, 27), random.randrange(2, 16)), leaf2)
    eye = (255, 210, 90, 255) if good else (255, 50, 50, 255)
    d.rectangle([11, 19, 13, 21], fill=eye); d.rectangle([18, 19, 20, 21], fill=eye)
    if good: d.arc([12, 22, 19, 27], 20, 160, fill=(40, 25, 15, 255))
    else: d.line([(12, 25), (19, 24)], fill=(20, 10, 20, 255), width=2)
    return im
treant(False).save(f"{A}/sprites/treant-boss.png"); treant(True).save(f"{A}/sprites/treant-good.png")

# ---------- sapling minion, sign ----------
def sapling():
    im = Image.new("RGBA", (T, T), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rectangle([6, 8, 9, 14], fill=(90, 60, 40, 255), outline=(40, 25, 20, 255))
    d.ellipse([2, 1, 13, 9], fill=(90, 50, 110, 255), outline=(40, 20, 55, 255))
    d.rectangle([5, 10, 6, 11], fill=(255, 60, 60, 255)); d.rectangle([9, 10, 10, 11], fill=(255, 60, 60, 255))
    d.line([(6, 14), (4, 15)], fill=(40, 25, 20, 255)); d.line([(9, 14), (11, 15)], fill=(40, 25, 20, 255))
    return im
sapling().save(f"{A}/sprites/sapling.png")
def sign():
    im = Image.new("RGBA", (T, T), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rectangle([7, 8, 8, 15], fill=(100, 70, 40, 255))
    d.rectangle([2, 2, 13, 9], fill=(190, 150, 95, 255), outline=(90, 60, 30, 255))
    d.line([(4, 5), (11, 5)], fill=(90, 60, 30, 255)); d.line([(4, 7), (9, 7)], fill=(90, 60, 30, 255))
    return im
sign().save(f"{A}/sprites/sign.png")

# ---------- maps ----------
def prop(n, t, v): return {"name": n, "type": t, "value": v}
def free_spots(m, count, rect=None, avoid=()):
    W, H = m["width"], m["height"]
    L = {l["name"]: l for l in m["layers"]}
    ob, gr = L["obstacles"]["data"], L["ground"]["data"]
    used = set(avoid)
    for l in m["layers"]:
        if l["type"] == "objectgroup":
            for o in l["objects"]: used.add((int(o["x"] // T), int(o["y"] // T)))
    spots = [(x, y) for y in range(2, H - 2) for x in range(2, W - 2)
             if not ob[y * W + x] and gr[y * W + x] == 1 and (x, y) not in used
             and all(abs(x - ux) + abs(y - uy) > 1 for ux, uy in used if True)]
    if rect: spots = [s for s in spots if not (rect[0] <= s[0] <= rect[2] and rect[1] <= s[1] <= rect[3])]
    random.shuffle(spots)
    return spots[:count]
def bushes(m, spots, table, base):
    tg = next(l for l in m["layers"] if l["name"] == "targets")
    for i, (x, y) in enumerate(spots):
        tg["objects"].append({"height": 16, "id": base + i, "name": f"bush{i}", "rotation": 0, "type": "", "visible": True, "width": 16, "x": x * T, "y": y * T,
            "properties": [prop("id", "string", f"bush{i}"), prop("texture", "string", "bush"), prop("tool", "string", ""),
                           prop("variants", "string", table), prop("hits", "int", 1), prop("respawnMs", "int", 90000),
                           prop("stump", "string", "bush-bare"), prop("clearedMsg", "string", "Picked!")]})

# town: a few forageable bushes
tp = f"{A}/maps/town.json"; t = json.load(open(tp))
tg = next(l for l in t["layers"] if l["name"] == "targets")
if not any(o.get("name", "").startswith("bush") for o in tg["objects"]):
    bushes(t, free_spots(t, 4), "forageTown", 120)
    json.dump(t, open(tp, "w"), separators=(",", ":"))

# forest: bushes, plus the treant's clearing in the west
fp = f"{A}/maps/forest.json"; f = json.load(open(fp))
CLEAR = (2, 4, 9, 10)   # x0, y0, x1, y1: no trees or sprouts here
tg = next(l for l in f["layers"] if l["name"] == "targets")
if not any(l["name"] == "boss" for l in f["layers"]):
    tg["objects"] = [o for o in tg["objects"] if not (CLEAR[0] <= o["x"] // T <= CLEAR[2] and CLEAR[1] <= o["y"] // T <= CLEAR[3])]
    en = next(l for l in f["layers"] if l["name"] == "enemies")
    en["objects"] = [o for o in en["objects"] if not (CLEAR[0] <= o["x"] // T <= CLEAR[2] and CLEAR[1] <= o["y"] // T <= CLEAR[3])]
    bushes(f, free_spots(f, 8, rect=CLEAR), "forageForest", 140)
    f["layers"].append({"draworder": "topdown", "id": 11, "name": "boss", "opacity": 1, "type": "objectgroup", "visible": True, "x": 0, "y": 0,
        "objects": [{"height": 32, "width": 32, "id": 150, "name": "treant", "rotation": 0, "type": "", "visible": True, "x": 5 * T, "y": 6 * T,
                     "properties": [prop("id", "string", "treant")]}]})
    f["nextlayerid"] = 12
    json.dump(f, open(fp, "w"), separators=(",", ":"))

# quarry: a sign in front of the big cave
qp = f"{A}/maps/quarry.json"; q = json.load(open(qp))
npcs = next(l for l in q["layers"] if l["name"] == "npcs")
if not any(o.get("name") == "cavesign" for o in npcs["objects"]):
    npcs["objects"].append({"height": 16, "id": 160, "name": "cavesign", "rotation": 0, "type": "", "visible": True, "width": 16, "x": 19 * T, "y": 5 * T,
        "properties": [prop("id", "string", "cavesign"), prop("texture", "string", "sign"), prop("dialogue", "string", "cavesign")]})
    json.dump(q, open(qp, "w"), separators=(",", ":"))
print("ok")
