/** Deterministic 32-bit PRNG. Same seed, same sequence. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Independent stream for a given seed and day so results never depend on call order. */
export function dayRandom(seed: number, day: number): () => number {
  return mulberry32((seed ^ Math.imul(day + 1, 0x9e3779b1)) >>> 0);
}

let counter = 0;
export function uid(prefix = "id"): string {
  counter = (counter + 1) % 1_000_000;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}
