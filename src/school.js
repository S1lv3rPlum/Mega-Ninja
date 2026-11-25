// The ninja school's classes: sparring lessons, the library, beds and the barn animals. No Phaser in here.
// All progress lives in gs.flags (personal, saved): spar_started, spar_hits, spar_passed, library_done, fed_<id>.

export const LESSON_HITS = 10; // sword hits on a dummy per lesson
export const LESSONS = 5; // lessons to pass

export function sparLessons(gs) {
  return Math.min(LESSONS, Math.floor((gs.flags.spar_hits ?? 0) / LESSON_HITS));
}
// extra damage on every sword swing once you have passed sparring
export function sparBonus(gs) {
  return gs.flags.spar_passed ? 1 : 0;
}

// You hit a practice dummy. Returns { msg }.
export function hitDummy(gs) {
  if (!gs.flags.spar_started) return { msg: 'Talk to the Sparring Master first.' };
  if (gs.flags.spar_passed) return { msg: 'Good form!' };
  const before = sparLessons(gs);
  if (before >= LESSONS) return { msg: 'All lessons done! Report to the Sparring Master.' };
  gs.flags.spar_hits = (gs.flags.spar_hits ?? 0) + 1;
  const after = sparLessons(gs);
  if (after > before) return { msg: after >= LESSONS ? 'Last lesson done! Report to the Sparring Master.' : `Lesson ${after} of ${LESSONS} complete!` };
  return { msg: `Hit! ${gs.flags.spar_hits % LESSON_HITS} of ${LESSON_HITS}` };
}

const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

export function talkSparMaster(gs, data) {
  if (!gs.flags.spar_started) {
    gs.flags.spar_started = true;
    return { lines: data.lines, afterClose: () => 'Hit the dummies with your sword (J).' };
  }
  const n = sparLessons(gs);
  if (gs.flags.spar_passed) return { lines: data.repeatLines };
  if (n >= LESSONS) {
    gs.flags.spar_passed = true;
    return { lines: data.passLines, afterClose: () => 'Your sword hits harder now!' };
  }
  return { lines: [fill(data.progress, { n, total: LESSONS, hits: LESSON_HITS })] };
}

export function booksRead(gs, bookIds) {
  return bookIds.filter((id) => gs.flags[`met_${id}`]).length;
}

// Reading every book in the library earns a permanent extra heart.
export function talkLibrarian(gs, data, bookIds) {
  const n = booksRead(gs, bookIds);
  if (gs.flags.library_done) return { lines: data.repeatLines };
  if (n >= bookIds.length) {
    gs.flags.library_done = true;
    gs.maxHp += 2;
    gs.hp = gs.maxHp;
    return { lines: data.doneLines, afterClose: () => 'A new heart! You read every book.' };
  }
  return { lines: [fill(data.progress, { n, total: bookIds.length })] };
}

export function rest(gs, data) {
  gs.hp = gs.maxHp;
  return { lines: data.lines, afterClose: () => 'You feel rested.' };
}

// Feeding the barn animals (they are only for looking at and feeding, not for taming)
const FOODS = [['carrot', 'a carrot'], ['wheat', 'some wheat'], ['herb', 'an herb']];
export function talkFeeder(gs, npcId, data) {
  const first = !gs.flags[`met_${npcId}`];
  gs.flags[`met_${npcId}`] = true;
  return { lines: first ? [...data.lines] : [data.repeatLines?.[0] ?? data.lines[0]], afterClose: () => null, choice: menu() };

  function menu() {
    const options = FOODS.map(([item, label]) => ({ label: `Feed ${label} (${gs.items[item] ?? 0})`, disabled: (gs.items[item] ?? 0) <= 0 }));
    options.push({ label: 'Just pet it', disabled: false }, { label: 'Leave', disabled: false });
    return {
      options,
      onPick: (i) => {
        if (i === FOODS.length + 1) return { lines: [], afterClose: () => null };
        if (i === FOODS.length) return { lines: [data.petLine], afterClose: () => null, choice: menu() };
        const [item] = FOODS[i];
        gs.items[item] -= 1;
        const k = (gs.flags[`fed_${npcId}`] ?? 0) + 1;
        gs.flags[`fed_${npcId}`] = k;
        return { lines: [data.fedLines[(k - 1) % data.fedLines.length]], afterClose: () => null, choice: menu() };
      },
    };
  }
}

// ---- the upstairs (Pet Dojo + Enchanting Workshop) opens once the first-year classes are done
export const BASICS = [
  ['crafted_cook', 'cook something in the kitchen'],
  ['crafted_alchemist', 'brew a potion in the potion lab'],
  ['library_done', 'read every book in the library'],
  ['spar_passed', 'pass sparring class'],
];
export const basicsMissing = (gs) => BASICS.filter(([f]) => !gs.flags[f]).map(([, label]) => label);

// The Headmaster: first visit = the welcome; later he checks your classes and opens the stairs.
export function talkHeadmaster(gs, data) {
  const first = !gs.flags.met_headmaster;
  gs.flags.met_headmaster = true;
  if (gs.flags.school_upper) return { lines: data.upperLines };
  const missing = basicsMissing(gs);
  if (missing.length === 0) {
    gs.flags.school_upper = true;
    return { lines: [...(first ? data.lines : []), ...data.okLines], afterClose: () => 'The stairs are open!' };
  }
  return { lines: [...(first ? data.lines : []), `${data.needLine} ${missing.join('; ')}.`] };
}
