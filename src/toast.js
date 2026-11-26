// How long a pop-up message stays on screen. No Phaser in here.
// Reading speed for kids: about 2.5 seconds to start with, plus 80 ms for every character (a long locked-door
// message of ~86 characters stays ~9 seconds), never less than 3.5 s and never more than 12 s.
export const TOAST_BASE = 2500;
export const TOAST_PER_CHAR = 80;
export const TOAST_MIN = 3500;
export const TOAST_MAX = 12000;
export const FADE_MS = 500;

export const toastMs = (msg) => Math.min(TOAST_MAX, Math.max(TOAST_MIN, TOAST_BASE + TOAST_PER_CHAR * String(msg ?? '').length));
