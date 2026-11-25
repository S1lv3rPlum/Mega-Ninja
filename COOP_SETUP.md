# Co-op setup (one time, about 10 minutes, free)

Co-op stores the shared world in a free Firebase Realtime Database. Until you paste its address into the game, the CO-OP row on the title screen says "not set up" and everything else works as before.

1. Go to https://console.firebase.google.com and sign in. Click **Add project** (any name, e.g. `mega-ninja`). You can turn Google Analytics off.
2. In the left menu: **Build > Realtime Database > Create Database**. Pick the location nearest you. Choose **Start in locked mode**, then Enable.
3. Open the **Rules** tab. Delete what is there and paste the whole contents of `database.rules.json` from this project. Click **Publish**.
   (These rules only allow access to a path that starts with a valid 6-character world code. Nobody can list worlds; you need the code.)
4. Back on the **Data** tab, copy the address at the top. It looks like
   `https://mega-ninja-default-rtdb.firebaseio.com` (other regions end in `.firebasedatabase.app`).
5. In the repo, edit `src/firebaseConfig.js` and put that address between the quotes:
   `export const DATABASE_URL = 'https://mega-ninja-default-rtdb.firebaseio.com';`
   Commit. Actions deploys it like any other change.
6. Done. Title screen > CO-OP WORLD.

## Playing together
- First player: tap CO-OP WORLD, leave the code blank (starts a new world), type a name. A 6-letter world code appears: write it down.
- Everyone else: tap CO-OP WORLD, type that code, type their own name.
- Same name next time = same character, even on another device. The code is shown on the title row afterwards.
- DEL on the co-op row only forgets the link on that device. The world stays in the cloud.

## What is shared and what is not
Shared: farm plots and crops, rocks/trees/bushes you have worked on, the forest boulder, the town landslide, and the treant (once freed, free for everyone; late arrivals get the Heartwood Lantern from him).
Personal: bag, tools, hearts, gold, quests and rewards (each player earns their own sword), ground drops, position.
Not shared yet: enemies and the live boss fight (each player fights their own).

## Changing maps later
Nothing in Firebase needs changing when you add maps, items or crops. Only an edit to the rules file is needed if you ever want different access rules.

## Good to know
- The free plan is far more than two kids need.
- Anyone who has the code can join, so keep it in the family.
