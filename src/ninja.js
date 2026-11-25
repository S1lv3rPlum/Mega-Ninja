// Which colour ninja you play as. No Phaser in here.
// The hero is black with a red scarf and headband. A "colour" swaps just the red parts (any strongly red pixel,
// so it also works on new art), keeping the shading. gs.ninja = 'red' | 'pink' | 'green' | 'yellow'.
export const NINJA_COLORS = {
  red: { name: 'Black + Red', rgb: [255, 0, 0] },
  pink: { name: 'Black + Pink', rgb: [255, 105, 180] },
  green: { name: 'Black + Green', rgb: [40, 205, 90] },
  yellow: { name: 'Black + Yellow', rgb: [255, 215, 40] },
};
export const NINJA_IDS = Object.keys(NINJA_COLORS);
export const DEFAULT_NINJA = 'red';

export const ninjaId = (gs) => (NINJA_COLORS[gs?.ninja] ? gs.ninja : DEFAULT_NINJA);

// a strongly red, visible pixel is part of the scarf/headband
export const isAccent = (r, g, b, a = 255) => a > 0 && r >= 100 && r > g * 2 && r > b * 2;

// the new colour of one pixel. A red pixel is "red strength" (r - the grey part) on top of a grey/white part,
// so the soft light and dark edges of the art keep their shading.
export function recolorPixel(r, g, b, id) {
  const c = NINJA_COLORS[id]?.rgb;
  if (!c || id === 'red') return [r, g, b];
  const w = Math.min(g, b);
  const k = (r - w) / 255;
  return c.map((v) => Math.max(0, Math.min(255, Math.round(v * k + w))));
}

// Recolour a whole RGBA buffer (ImageData.data) in place
export function recolorData(data, id) {
  if (id === 'red' || !NINJA_COLORS[id]) return data;
  for (let i = 0; i < data.length; i += 4) {
    if (!isAccent(data[i], data[i + 1], data[i + 2], data[i + 3])) continue;
    const [r, g, b] = recolorPixel(data[i], data[i + 1], data[i + 2], id);
    data[i] = r; data[i + 1] = g; data[i + 2] = b;
  }
  return data;
}

// The Ninja Tailor: choose a colour any time. `onChange(id)` applies it to the game.
export function talkTailor(gs, npcId, data, onChange) {
  const first = !gs.flags[`met_${npcId}`];
  gs.flags[`met_${npcId}`] = true;
  const options = NINJA_IDS.map((id) => ({ label: NINJA_COLORS[id].name + (ninjaId(gs) === id ? ' (now)' : ''), disabled: false }));
  options.push({ label: 'Never mind', disabled: false });
  return {
    lines: first ? [...data.lines, data.menu] : [data.menu],
    afterClose: () => null,
    choice: {
      options,
      onPick: (i) => {
        if (i >= NINJA_IDS.length) return { lines: [data.farewell], afterClose: () => null };
        const id = NINJA_IDS[i];
        gs.ninja = id;
        if (onChange) onChange(id);
        return { lines: [data.doneLine], afterClose: () => null };
      },
    },
  };
}
