"""Generates labeled placeholder art for Mega-Ninja.
Every file is the size the game expects, so you can swap in real art by
dropping a PNG with the SAME filename and size over it. Safe to re-run."""
from PIL import Image, ImageDraw, ImageFont
import os

T = 16
OUT = "public/assets"

def font(size):
    try:
        return ImageFont.load_default(size=size)
    except TypeError:
        return ImageFont.load_default()

def save(im, rel):
    path = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path)

# ---------- 16x16 characters ----------
def person(skin, outfit, accent, mask=True):
    im = Image.new("RGBA", (T, T), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rectangle([4, 1, 11, 6], fill=outfit)              # hood / head
    if mask:
        d.rectangle([5, 3, 10, 4], fill=skin)            # eye slit
        d.point([6, 3], fill=(20, 20, 20, 255)); d.point([9, 3], fill=(20, 20, 20, 255))
    else:
        d.rectangle([5, 2, 10, 5], fill=skin)
        d.point([6, 3], fill=(20, 20, 20, 255)); d.point([9, 3], fill=(20, 20, 20, 255))
    d.rectangle([3, 7, 12, 11], fill=outfit)             # body
    d.rectangle([3, 8, 12, 8], fill=accent)              # belt/sash
    d.rectangle([4, 12, 6, 15], fill=outfit); d.rectangle([9, 12, 11, 15], fill=outfit)
    d.rectangle([4, 1, 11, 1], fill=accent)              # headband
    return im

SK = (240, 200, 160, 255)
save(person(SK, (35, 35, 50, 255), (210, 40, 50, 255)), "sprites/player.png")        # hero ninja
save(person(SK, (90, 60, 120, 255), (230, 200, 60, 255), mask=False), "sprites/npc.png")
save(person(SK, (150, 30, 30, 255), (20, 20, 20, 255)), "sprites/enemy-ninja.png")
save(person(SK, (30, 90, 60, 255), (200, 200, 200, 255)), "sprites/enemy-scout.png")

# ---------- 64x64 battle portraits ----------
def portrait(color, label):
    im = Image.new("RGBA", (64, 64), color)
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 63, 63], outline=(255, 255, 255, 255), width=2)
    d.line([0, 0, 63, 63], fill=(255, 255, 255, 120)); d.line([0, 63, 63, 0], fill=(255, 255, 255, 120))
    d.text((32, 32), label, font=font(10), fill=(255, 255, 255, 255), anchor="mm")
    return im

save(portrait((60, 60, 90, 255), "HERO"), "sprites/hero-portrait.png")
save(portrait((150, 40, 40, 255), "ENEMY"), "sprites/enemy-ninja-battle.png")
save(portrait((40, 110, 70, 255), "SCOUT"), "sprites/enemy-scout-battle.png")
save(portrait((110, 40, 140, 255), "BOSS"), "sprites/boss-battle.png")

# ---------- 16x16 item icons ----------
def icon(bg, letter):
    im = Image.new("RGBA", (T, T), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([1, 1, 14, 14], radius=3, fill=bg, outline=(255, 255, 255, 255))
    d.text((8, 8), letter, font=font(10), fill=(255, 255, 255, 255), anchor="mm")
    return im

save(icon((200, 60, 80, 255), "P"), "items/potion.png")
save(icon((120, 120, 140, 255), "S"), "items/shuriken.png")
save(icon((200, 170, 40, 255), "K"), "items/key.png")
save(icon((40, 140, 200, 255), "$"), "items/coin.png")
save(icon((120, 70, 160, 255), "?"), "items/scroll.png")

# ---------- UI ----------
# title logo
logo = Image.new("RGBA", (224, 56), (0, 0, 0, 0))
d = ImageDraw.Draw(logo)
d.rounded_rectangle([0, 0, 223, 55], radius=8, fill=(25, 25, 40, 230), outline=(210, 40, 50, 255), width=3)
d.text((112, 28), "MEGA-NINJA", font=font(26), fill=(255, 255, 255, 255), anchor="mm")
save(logo, "ui/title-logo.png")

# title background (full screen)
bg = Image.new("RGBA", (320, 240), (20, 20, 40, 255))
d = ImageDraw.Draw(bg)
for y in range(240):
    c = int(20 + 40 * y / 240)
    d.line([0, y, 320, y], fill=(c, c // 2, 60 + c // 2, 255))
d.ellipse([220, 30, 280, 90], fill=(240, 230, 200, 255))   # moon
d.text((160, 215), "TITLE BACKGROUND 320x240", font=font(9), fill=(255, 255, 255, 180), anchor="mm")
save(bg, "ui/title-bg.png")

# dialogue box
box = Image.new("RGBA", (304, 56), (0, 0, 0, 0))
d = ImageDraw.Draw(box)
d.rounded_rectangle([0, 0, 303, 55], radius=6, fill=(20, 20, 35, 235), outline=(255, 255, 255, 255), width=2)
save(box, "ui/dialogue-box.png")

# menu button
btn = Image.new("RGBA", (96, 24), (0, 0, 0, 0))
d = ImageDraw.Draw(btn)
d.rounded_rectangle([0, 0, 95, 23], radius=5, fill=(40, 40, 70, 255), outline=(210, 40, 50, 255), width=2)
save(btn, "ui/button.png")

# health bar frame + fill
frame = Image.new("RGBA", (64, 8), (0, 0, 0, 0))
ImageDraw.Draw(frame).rectangle([0, 0, 63, 7], outline=(255, 255, 255, 255), fill=(30, 30, 30, 255))
save(frame, "ui/hp-frame.png")
fill = Image.new("RGBA", (62, 6), (60, 200, 90, 255))
save(fill, "ui/hp-fill.png")

# battle background
bb = Image.new("RGBA", (320, 240), (40, 60, 90, 255))
d = ImageDraw.Draw(bb)
d.rectangle([0, 150, 320, 240], fill=(60, 100, 60, 255))
d.text((160, 20), "BATTLE BACKGROUND 320x240", font=font(9), fill=(255, 255, 255, 200), anchor="mm")
save(bb, "ui/battle-bg.png")

# favicon / app icon
ic = Image.new("RGBA", (64, 64), (25, 25, 40, 255))
d = ImageDraw.Draw(ic)
d.rectangle([0, 0, 63, 63], outline=(210, 40, 50, 255), width=4)
d.text((32, 32), "MN", font=font(28), fill=(255, 255, 255, 255), anchor="mm")
save(ic, "ui/icon.png")
print("placeholders written")
