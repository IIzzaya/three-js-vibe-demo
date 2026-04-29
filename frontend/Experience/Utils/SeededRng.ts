/**
 * Seeded pseudo-random number generator utilities.
 *
 * Used by deterministic subsystems so that the same seed always produces
 * the same map / objectives / waves — enabling Sprint-to-Sprint regression
 * comparison.
 *
 * Algorithm: mulberry32 (32-bit state, ~2^32 period, fast).
 */

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
    let state = seed | 0;
    return () => {
        state = (state + 0x6d2b79f5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Derive a sub-seed from a parent seed and a label. Stable across runs.
 * Used so a single "session seed" can spawn independent RNG streams for
 * map / objectives / waves without them interfering.
 */
export function deriveSeed(parent: number, label: string): number {
    let h = parent | 0;
    for (let i = 0; i < label.length; i++) {
        h = Math.imul(h ^ label.charCodeAt(i), 0x01000193) | 0;
    }
    h ^= h >>> 16;
    return h | 0;
}

/** Produce a fresh seed when the run doesn't specify one. */
export function generateRandomSeed(): number {
    return (Math.random() * 0x7fffffff) | 0;
}
