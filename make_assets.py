"""Generates placeholder art + a Tiled-format map so the project runs immediately.
Replace these with real art (e.g. Kenney Tiny Town) and edit the map in Tiled."""
import json, random
from PIL import Image

random.seed(7)
T = 16

def px(img, x, y, c): img.putpixel((x, y), c)

def tile_grass():
    im = Image.new("RGBA", (T, T), (88, 168, 72, 255))
    for _ in range(18):
        px(im, random.randrange(T), random.randrange(T), (110, 190, 90, 255))
    for _ in range(6):
        px(im, random.randrange(T), random.randrange(T), (66, 140, 56, 255))
    return im

def tile_path():
    im = Image.new("RGBA", (T, T), (201, 170, 118, 255))
    for _ in range(20):
        px(im, random.randrange(T), random.randrange(T), (181, 150, 100, 255))
    return im

def tile_water():
    im = Image.new("RGBA", (T, T), (58, 120, 200, 255))
    for y in (3, 8, 13):
        for x in range(2, 7): px(im, (x + y) % T, y, (140, 190, 240, 255))
    return im

def tile_tree():
    im = tile_grass()
    for y in range(2, 11):
        for x in range(2, 14):
            if (x - 8) ** 2 + (y - 6) ** 2 <= 25: px(im, x, y, (30, 110, 50, 255))
    for y in range(3, 7):
        for x in range(4, 8): px(im, x, y, (50, 140, 70, 255))
    for y in range(11, 15):
        for x in (7, 8): px(im, x, y, (110, 70, 40, 255))
    return im

sheet = Image.new("RGBA", (T * 4, T), (0, 0, 0, 0))
for i, t in enumerate([tile_grass(), tile_path(), tile_water(), tile_tree()]):
    sheet.paste(t, (i * T, 0))
sheet.save("public/assets/tilesets/tiles.png")

# map: 30 x 20
W, H = 30, 20
GRASS, PATH, WATER, TREE = 1, 2, 3, 4
ground = [GRASS] * (W * H)
obst = [0] * (W * H)
def idx(x, y): return y * W + x

for x in range(W): ground[idx(x, 10)] = PATH          # horizontal road
for y in range(H): ground[idx(15, y)] = PATH          # vertical road
for x in range(W):
    obst[idx(x, 0)] = TREE; obst[idx(x, H - 1)] = TREE
for y in range(H):
    obst[idx(0, y)] = TREE; obst[idx(W - 1, y)] = TREE
for y in range(4, 8):                                  # pond
    for x in range(20, 25): obst[idx(x, y)] = WATER
for _ in range(35):                                    # scattered trees
    x, y = random.randrange(1, W - 1), random.randrange(1, H - 1)
    if ground[idx(x, y)] == GRASS and obst[idx(x, y)] == 0 and abs(x - 15) + abs(y - 10) > 3:
        obst[idx(x, y)] = TREE

def layer(i, name, data):
    return {"data": data, "height": H, "width": W, "id": i, "name": name,
            "opacity": 1, "type": "tilelayer", "visible": True, "x": 0, "y": 0}

tmap = {
    "compressionlevel": -1, "height": H, "width": W, "infinite": False,
    "layers": [layer(1, "ground", ground), layer(2, "obstacles", obst)],
    "nextlayerid": 3, "nextobjectid": 1, "orientation": "orthogonal",
    "renderorder": "right-down", "tiledversion": "1.10.2",
    "tileheight": T, "tilewidth": T, "type": "map", "version": "1.10",
    "tilesets": [{"columns": 4, "firstgid": 1, "image": "../tilesets/tiles.png",
                  "imageheight": T, "imagewidth": T * 4, "margin": 0, "name": "tiles",
                  "spacing": 0, "tilecount": 4, "tileheight": T, "tilewidth": T}],
}
json.dump(tmap, open("public/assets/maps/town.json", "w"))
print("assets written")
