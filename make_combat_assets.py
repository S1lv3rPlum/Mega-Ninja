"""Placeholder art + map edits for combat: the sensei (town), the shadow sprout enemy, and the forest 'enemies' layer.
Run from the project root. Safe to re-run (map edits only happen once). Replace PNGs with real art of the same size."""
import json, random
from PIL import Image, ImageDraw
random.seed(5)
T = 16; A = "public/assets"

def sensei():
    im = Image.new("RGBA", (T, T), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    skin = (240, 200, 160, 255)
    d.rectangle([5, 2, 10, 6], fill=skin)
    d.rectangle([4, 1, 11, 2], fill=(235, 235, 240, 255))                 # white hair
    d.rectangle([5, 6, 10, 8], fill=(235, 235, 240, 255))                 # white beard
    d.point([6, 4], fill=(20, 20, 20, 255)); d.point([9, 4], fill=(20, 20, 20, 255))
    d.rectangle([3, 8, 12, 13], fill=(245, 245, 250, 255), outline=(160, 160, 175, 255))   # white gi
    d.rectangle([3, 10, 12, 10], fill=(30, 30, 35, 255))                  # black belt
    d.rectangle([4, 13, 6, 15], fill=(60, 50, 45, 255)); d.rectangle([9, 13, 11, 15], fill=(60, 50, 45, 255))
    return im
sensei().save(f"{A}/sprites/sensei.png")

def shadow():
    im = Image.new("RGBA", (T, T), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.ellipse([2, 5, 13, 14], fill=(50, 30, 70, 255), outline=(20, 10, 30, 255))
    d.polygon([(4, 6), (3, 1), (6, 5)], fill=(50, 30, 70, 255), outline=(20, 10, 30, 255))   # little leaves like horns
    d.polygon([(11, 6), (12, 1), (9, 5)], fill=(50, 30, 70, 255), outline=(20, 10, 30, 255))
    d.rectangle([5, 8, 6, 9], fill=(255, 70, 70, 255)); d.rectangle([9, 8, 10, 9], fill=(255, 70, 70, 255))
    d.line([(6, 12), (9, 12)], fill=(130, 60, 90, 255))
    return im
shadow().save(f"{A}/sprites/shadow.png")

def prop(n, t, v): return {"name": n, "type": t, "value": v}

# town: the sensei, in the grass up the road from the elder
tp = f"{A}/maps/town.json"; t = json.load(open(tp))
npcs = next(l for l in t["layers"] if l["name"] == "npcs")
if not any(o.get("name") == "sensei" for o in npcs["objects"]):
    npcs["objects"].append({"height": 16, "id": 80, "name": "sensei", "rotation": 0, "type": "", "visible": True, "width": 16, "x": 8 * T, "y": 6 * T,
        "properties": [prop("id", "string", "sensei"), prop("texture", "string", "sensei"), prop("dialogue", "string", "sensei")]})
    json.dump(t, open(tp, "w"), separators=(",", ":"))

# forest: shadow sprouts that only appear once you own the sword (the evil starts creeping in)
fp = f"{A}/maps/forest.json"; f = json.load(open(fp))
if not any(l["name"] == "enemies" for l in f["layers"]):
    W, H = f["width"], f["height"]
    ob = next(l for l in f["layers"] if l["name"] == "obstacles")["data"]
    used = set()
    for l in f["layers"]:
        if l["type"] == "objectgroup":
            for o in l["objects"]: used.add((int(o["x"] // T), int(o["y"] // T)))
    spots = [(x, y) for y in range(3, H - 3) for x in range(3, 22)
             if not ob[y * W + x] and (x, y) not in used and y != 12 and abs(x - 15) > 1 and not (x >= 20 and y in range(10, 15))]
    random.shuffle(spots)
    objs = []
    for i, (x, y) in enumerate(spots[:5]):
        objs.append({"height": 16, "id": 70 + i, "name": f"shadow{i}", "rotation": 0, "type": "", "visible": True, "width": 16, "x": x * T, "y": y * T,
                     "properties": [prop("id", "string", f"shadow{i}"), prop("type", "string", "shadow"), prop("requiresFlag", "string", "got_sword")]})
    f["layers"].append({"draworder": "topdown", "id": 9, "name": "enemies", "objects": objs, "opacity": 1, "type": "objectgroup", "visible": True, "x": 0, "y": 0})
    f["nextlayerid"] = 10
    json.dump(f, open(fp, "w"), separators=(",", ":"))
print("ok")
