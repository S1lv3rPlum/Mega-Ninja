# Builds src/data/areamaps.json: the detailed "zone maps" opened from the world map.
# Cave rooms are scaled from the real cave map (public/assets/maps/cave.json "chambers" layer); the School is laid out by its door positions.
# Run: python3 make_area_maps.py
import json
cave = json.load(open('public/assets/maps/cave.json'))
ch = [l for l in cave['layers'] if l['name'] == 'chambers'][0]['objects']
CX, CY, X0, Y0 = 6, 4, 20, 38
NOTES = {
 'mouth': ('Where you come in from the Quarry. Bring a light.', True),
 'echo': ('A hall that echoes. Tunnels lead north and east.', True),
 'roost': ('Bats nest here. A rock pile hides the short way in.', False),
 'granite': ('Granite guards the stone door to the Crystal Caverns.', True),
 'cross': ('The middle of the cave. Tunnels go every way.', True),
 'grotto': ('Glowing mushrooms and a quiet corner.', False),
 'mine': ('An old collapsed mine. A rock pile blocks the way in.', False),
 'vault': ('The last chamber at the very back. Rocks block the tunnel.', False),
}
rooms = []
for o in ch:
    p = {q['name']: q['value'] for q in o['properties']}
    note, story = NOTES[p['id']]
    rooms.append({'id': p['id'], 'name': p['name'], 'chamber': p['id'], 'story': story, 'note': note,
                  'x': X0 + round(o['x'] / 16 * CX), 'y': Y0 + round(o['y'] / 16 * CY),
                  'w': round(o['width'] / 16 * CX), 'h': round(o['height'] / 16 * CY)})
caves = {
 'title': 'The Caves', 
 'tagline': 'Gold = needed for the story. Orange tunnels need a pickaxe.',
 'rooms': rooms,
 'links': [['mouth', 'echo'], ['mouth', 'grotto'], ['echo', 'roost', 'gate'], ['echo', 'cross'], ['roost', 'granite'], ['cross', 'granite'], ['cross', 'grotto'], ['cross', 'mine', 'gate'], ['mine', 'vault', 'gate']],
 'exits': [{'label': 'To the Quarry', 'x': 20 + 8 * CX, 'y': Y0 + 35 * CY + 1, 'anchor': 'mouth'},
           {'label': 'Stone door to Crystal Caverns', 'x': 20 + 21 * CX, 'y': Y0 + 1 * CY - 3, 'anchor': 'granite'}],
}
# School: classes along the north wall in the order of their doors, dorms on the west wall.
def R(id, name, x, y, w, h, **kw): return dict({'id': id, 'name': name, 'x': x, 'y': y, 'w': w, 'h': h}, **kw)
school = {
 'title': 'The School', 
 'tagline': 'Gold = needed to graduate (all 4 classes). Dorms are optional.',
 'rooms': [
   R('kitchen', 'Kitchen', 60, 40, 52, 30, map='kitchen', story=True, seenFlags=['crafted_cook'], note='Cooking class. The cook teaches kitchen recipes.'),
   R('potions', 'Potion Lab', 118, 40, 52, 30, map='potions', story=True, seenFlags=['crafted_alchemist'], note='Brewing class. The alchemist teaches potions.'),
   R('library', 'Library', 176, 40, 52, 30, map='library', story=True, seenFlags=['library_done'], note='Read every book here for the library class.'),
   R('sparring', 'Sparring Room', 234, 40, 62, 30, map='sparring', story=True, seenFlags=['spar_started'], note='Sparring class. Hit the dummies, then report to the Sparring Master.'),
   R('dorm1', 'Dorm 1', 20, 100, 40, 30, map='dorm1', story=False, note='A dorm room with beds.'),
   R('dorm2', 'Dorm 2', 20, 136, 40, 30, map='dorm2', story=False, note='Another dorm room with beds.'),
   R('school', 'Courtyard', 84, 92, 150, 82, map='school', visitedArea='school', story=True, note='The main hall. The Headmaster is here. Doors lead everywhere.'),
 ],
 'links': [['kitchen', 'school'], ['potions', 'school'], ['library', 'school'], ['sparring', 'school'], ['dorm1', 'school'], ['dorm2', 'school']],
 'exits': [{'label': 'Upstairs: Dojo and Workshop', 'x': 200, 'y': 78, 'anchor': 'school'},
           {'label': 'Garden and barns >', 'x': 268, 'y': 120, 'anchor': 'school'},
           {'label': 'To Town', 'x': 130, 'y': 177, 'anchor': 'school'}],
}

# ---- multi-map areas shown as rooms: the garden with its barns, the upper floor with the dojo and workshop
garden = {
 'title': 'The Garden', 'tagline': 'Tame animals in the barns. All optional, and good for pets.',
 'rooms': [
   R('nightbarn', 'Night Barn', 124, 46, 66, 36, map='nightbarn', story=False, note='Night animals: owls, hares, fireflies, bats and sprouts.'),
   R('barn', 'Day Barn', 214, 46, 66, 36, map='barn', story=False, note='Day animals: rabbits, moths, foxes, lizards and crabs.'),
   R('garden', 'Garden', 84, 104, 200, 66, map='garden', visitedArea='garden', story=False, note='The school garden, with a door to each barn.'),
 ],
 'links': [['nightbarn', 'garden'], ['barn', 'garden']],
 'exits': [{'label': '< To the School', 'x': 50, 'y': 132, 'anchor': 'garden'}],
}
upper = {
 'title': 'Upstairs', 'tagline': 'Pet training and enchanting. All optional, but powerful.',
 'rooms': [
   R('dojo', 'Dojo', 60, 46, 70, 36, map='dojo', story=False, note='The Pet Trainer teaches your pets new tricks here.'),
   R('workshop', 'Workshop', 190, 46, 70, 36, map='workshop', story=False, note='The Enchanter adds magic to your weapons and armor.'),
   R('upper', 'Upstairs Hall', 60, 104, 200, 66, map='upper', visitedArea='upper', story=False, note='A hall above the school. Stairs lead down to the courtyard.'),
 ],
 'links': [['dojo', 'upper'], ['workshop', 'upper']],
 'exits': [{'label': 'Stairs down to the School', 'x': 230, 'y': 176, 'anchor': 'upper'}],
}

# ---- single-map areas shown as a fogged terrain map: tiles come from the real map; landmarks show once their spot is explored
import os
def terrain(map_id, title, tagline, marks):
    m = json.load(open(f'public/assets/maps/{map_id}.json'))
    W, H = m['width'], m['height']
    ob = [l for l in m['layers'] if l['name'] == 'obstacles'][0]['data']
    rows = [''.join('#' if ob[y * W + x] else '.' for x in range(W)) for y in range(H)]
    lm = []
    for i, (name, x, y, kind, story, note) in enumerate(marks):
        lm.append({'id': f'{map_id}{i}', 'name': name, 'x': x, 'y': y, 'kind': kind, 'story': story, 'note': note})
    return {'kind': 'terrain', 'map': map_id, 'w': W, 'h': H, 'title': title, 'tagline': tagline, 'rows': rows, 'landmarks': lm}

T = {}
T['town'] = terrain('town', 'Town', 'Gold ring = needed for the story. Fog = not explored yet.', [
  ('Road to the School', 4, 2, 'door', True, 'The way up to the ninja school.'),
  ('Elder Sora', 17, 8, 'npc', True, 'Your journey begins with her.'),
  ('Sensei', 8, 6, 'npc', True, 'Teaches you the way of the blade.'),
  ('Waystone', 15, 8, 'waystone', False, 'Light it to travel here later.'),
  ('Ninja Tailor', 21, 13, 'shop', False, 'Changes the colour of your ninja outfit.'),
  ('Road to the Farm', 29, 10, 'door', True, 'East to the farm.'),
  ('Road to the Forest', 15, 19, 'door', True, 'South to the forest.')])
T['forest'] = terrain('forest', 'Forest', 'Gold ring = needed for the story. Fog = not explored yet.', [
  ('Road to Town', 15, 0, 'door', False, 'North, back to town.'),
  ('Waystone', 13, 1, 'waystone', False, 'Light it to travel here later.'),
  ('Lumberjack', 17, 5, 'npc', False, 'Gives you your axe.'),
  ('Old Fisher', 8, 6, 'shop', False, 'Fishing rods and fishing tips.'),
  ('The Treant', 5, 6, 'boss', True, 'A great tree that guards the Heartwood Lantern.'),
  ('Path to the Quarry', 25, 12, 'door', True, 'East to the quarry.')])
T['quarry'] = terrain('quarry', 'Quarry', 'Gold ring = needed for the story. Fog = not explored yet.', [
  ('Path to the Forest', 0, 12, 'door', False, 'West, back to the forest.'),
  ('Waystone', 1, 10, 'waystone', False, 'Light it to travel here later.'),
  ('Miner', 5, 10, 'shop', False, 'Sells and repairs pickaxes.'),
  ('Surveyor Tam', 22, 4, 'npc', False, 'Teaches cooking and brewing when you finish exploring the cave.'),
  ('Cave mouth', 19, 3, 'door', True, 'The way into the Caves. Bring a light.')])
T['farm'] = terrain('farm', 'Farm', 'Gold ring = needed for the story. Fog = not explored yet.', [
  ('Road to Town', 0, 8, 'door', False, 'West, back to town.'),
  ('Waystone', 1, 6, 'waystone', False, 'Light it to travel here later.'),
  ('Farmer', 9, 7, 'npc', True, 'Gives you seeds and teaches farming.'),
  ('Farm stall', 18, 10, 'shop', False, 'Seeds, supplies, tool repairs and upgrades.')])
T['crystal'] = terrain('crystal', 'Crystal Caverns', 'Gold ring = needed for the story. Fog = not explored yet.', [
  ('Stairs to the Caves', 4, 0, 'door', True, 'Back up to the Caves.'),
  ('Waystone', 6, 1, 'waystone', False, 'Light it to travel here later.'),
  ('Torn Note', 3, 12, 'thing', False, 'A note someone left behind.'),
  ('Crack in the wall', 31, 2, 'door', False, 'A narrow crack. It needs a very bright light.'),
  ('Archway to the Ruins', 1, 13, 'door', True, 'Sealed with wave marks.'),
  ('Archway to the Desert', 31, 13, 'door', True, 'Sealed with a crescent mark.'),
  ('Bat Queen\'s roost', 24, 22, 'boss', True, 'The Bat Queen guards the cold passage.'),
  ('Passage to the Peaks', 33, 22, 'door', True, 'A freezing draft blows from here.')])
T['market'] = terrain('market', 'Enchanted Market', 'All shops, all optional. Not needed for the story.', [
  ('Back to the Caverns', 15, 21, 'door', False, 'The crack leads back out.'),
  ('Hexsmith', 5, 3, 'shop', False, 'Makes dark weapons.'),
  ('Critter Seller', 12, 3, 'shop', False, 'Sells hex creatures.'),
  ('Charm Seller', 19, 3, 'shop', False, 'Sells charms.'),
  ('The Brewer', 26, 3, 'shop', False, 'Sells dark brews.')])
T['peaks'] = terrain('peaks', 'Frozen Peaks', 'Gold ring = needed for the story. Fog = not explored yet.', [
  ('Passage to the Caverns', 0, 24, 'door', False, 'Back to the Crystal Caverns.'),
  ('Waystone', 1, 22, 'waystone', False, 'Light it to travel here later.'),
  ('Wandering Tinker', 3, 20, 'shop', False, 'Repairs tools and buys wood and stone.'),
  ('Old Hermit', 4, 26, 'npc', False, 'Warns about the thin ice and the Yeti.'),
  ('The Yeti', 13, 4, 'boss', True, 'Guards the Frost Boots.'),
  ('Path to the Ruins', 38, 11, 'door', True, 'East to the Ruins.')])
T['ruins'] = terrain('ruins', 'Sunken Ruins', 'Gold ring = needed for the story. Fog = not explored yet.', [
  ('Path to the Peaks', 0, 25, 'door', False, 'West, back to the Peaks.'),
  ('Waystone', 1, 23, 'waystone', False, 'Light it to travel here later.'),
  ('Worn Stone', 2, 25, 'thing', False, 'An old carved stone.'),
  ('Archway to the Caverns', 11, 3, 'door', False, 'The archway back to the Crystal Caverns.'),
  ('Rune Stone', 6, 7, 'thing', True, 'One of three rune stones.'),
  ('Rune Stone', 27, 7, 'thing', True, 'One of three rune stones.'),
  ('Rune Stone', 32, 22, 'thing', True, 'One of three rune stones.'),
  ('Inner Door', 16, 6, 'door', True, 'Opens when all the runes are right.'),
  ('Sea Serpent', 16, 3, 'boss', True, 'Guards half of the Moon Crest.'),
  ('Princess\'s Note', 18, 2, 'thing', False, 'A note from the princess.')])
T['desert'] = terrain('desert', 'Desert', 'Gold ring = needed for the story. Fog = not explored yet.', [
  ('Archway to the Caverns', 0, 15, 'door', False, 'West, back to the Crystal Caverns.'),
  ('Sign', 3, 15, 'thing', False, 'A desert sign.'),
  ('Scorpion King', 35, 23, 'boss', True, 'Guards the other half of the Moon Crest.'),
  ('Road to the Bazaar', 43, 5, 'door', False, 'East to the Desert Bazaar.')])
T['bazaar'] = terrain('bazaar', 'Desert Bazaar', 'Gold ring = needed for the story. Fog = not explored yet.', [
  ('Road to the Desert', 0, 13, 'door', False, 'West, back to the desert.'),
  ('Waystone', 16, 19, 'waystone', False, 'Light it to travel here later.'),
  ('Armorsmith', 5, 3, 'shop', False, 'Makes armor.'),
  ('Treat Seller', 12, 3, 'shop', False, 'Sells pet treats.'),
  ('Gem Trader', 20, 3, 'shop', False, 'Buys and sells gems.'),
  ('Wandering Tinker', 21, 15, 'shop', False, 'Repairs tools and buys wood and stone.'),
  ('The Princess', 28, 3, 'npc', True, 'She knows where the Moon Crest halves went.')])
out = {'cave': caves, 'school': school, 'garden': garden, 'upper': upper}
out.update(T)
json.dump(out, open('src/data/areamaps.json', 'w'), indent=None, separators=(',', ':'))
print(sorted(out), len(open('src/data/areamaps.json').read()))
