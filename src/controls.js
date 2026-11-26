// Key names in the game's text, rewritten for phones. No Phaser in here.
// The dialogue says "press Space" / "press J" because that is what a keyboard has. On a touch screen the same actions
// are the A button (talk / use / plant / cast) and the B button (swing the sword), so we swap the words as the text is shown.
const RULES = [
  [/press Space \(or the A button\)/gi, 'tap the A button'],
  [/press J to swing it, or the B button on a phone/gi, 'tap the B button to swing it'],
  [/\(the B button on a phone\)/gi, ''],
  [/\bpress J\b/gi, 'tap the B button'],
  [/\(J\)/g, '(B button)'],
  [/\bpress Space\b/gi, 'tap the A button'],
  [/\bpress M to turn it on\b/gi, 'tap SND to turn it on'],
  [/\bpress F\b/gi, 'tap the F button'],
  [/\bF catches it\b/g, 'the F button catches it'],
  [/\b(I key \/ )?BAG button\b/g, 'BAG button'],
  [/\bSpace again\b/g, 'the A button again'],
  [/\bSpace when\b/g, 'the A button when'],
  [/\bSpace\b/g, 'the A button'],
];

export function touchWording(text) {
  let out = String(text ?? '');
  for (const [re, to] of RULES) out = out.replace(re, to);
  return out.replace(/\s+([.,!?)])/g, '$1').replace(/ {2,}/g, ' ').replace(/(^|[.!?]\s)(tap|the F button) /g, (_m, a, w) => `${a}${w[0].toUpperCase()}${w.slice(1)} `);
}

// text as this device should show it
export const forDevice = (text, touch) => (touch ? touchWording(text) : text);
