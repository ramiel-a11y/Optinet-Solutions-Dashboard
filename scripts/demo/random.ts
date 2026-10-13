// Deterministic randomness for the demo seed. Every value comes from a stream keyed by
// a string, so the same client-month always gets the same amount whatever the run date
// or however many other values were drawn first.

// 32-bit string hash with a murmur-style finaliser. Stable across platforms.
export function hash32(key: string, seed = 0x9e3779b9): number {
  let h = (seed ^ key.length) >>> 0;
  for (let i = 0; i < key.length; i++) {
    h = Math.imul(h ^ key.charCodeAt(i), 0x5bd1e995);
    h ^= h >>> 15;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

// mulberry32 seeded from the key: floats in [0, 1).
export function rng(key: string): () => number {
  let a = hash32(key);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function intBetween(r: () => number, min: number, max: number): number {
  return min + Math.floor(r() * (max - min + 1));
}

// base, nudged by up to ±spread of itself.
export function vary(r: () => number, base: number, spread: number): number {
  return base * (1 + (r() * 2 - 1) * spread);
}

export function pick<T>(r: () => number, items: readonly T[]): T {
  return items[Math.floor(r() * items.length)];
}

export const cents = (n: number): number => Math.round(n * 100) / 100;

// numeric columns travel as strings through drizzle.
export const money = (n: number): string => cents(n).toFixed(2);

// A v4-shaped UUID derived from the key: re-seeding gives each record the same id, so
// a bookmarked record link keeps working after a refresh.
export function uuidFor(key: string): string {
  const hex = [1, 2, 3, 4]
    .map((s) => hash32(key, Math.imul(s, 0x85ebca6b)).toString(16).padStart(8, '0'))
    .join('');
  const variant = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
