/**
 * RunContext — module-global configuration for a single gameplay run.
 *
 * Parsed from URL params at bootstrap (`?seed=42&timeScale=4`) and consumed
 * by Experience / World during initialization. After World consumes the
 * seed, it is locked — later `setSeed()` calls become no-ops.
 *
 * Design notes:
 * - Exists as module-global singleton (not a class) so it can be imported
 *   by any subsystem without circular deps with Experience.
 * - Never mutate defaults directly; use the setter API so DebugBus events
 *   fire correctly.
 */

import { generateRandomSeed } from "./SeededRng.js";

export const MIN_TIME_SCALE = 0.1;
export const MAX_TIME_SCALE = 4;

interface RunContextState {
    seed: number;
    seedExplicitlySet: boolean;
    seedLocked: boolean;
    timeScale: number;
    initialized: boolean;
}

const state: RunContextState = {
    seed: 0,
    seedExplicitlySet: false,
    seedLocked: false,
    timeScale: 1,
    initialized: false,
};

export function clampTimeScale(n: number): number {
    if (!Number.isFinite(n)) return 1;
    return Math.max(MIN_TIME_SCALE, Math.min(MAX_TIME_SCALE, n));
}

/**
 * Initialize RunContext from the current page URL. Safe to call multiple
 * times — only the first call parses; subsequent calls are no-ops unless
 * `force` is true (used by tests).
 */
export function initRunContextFromURL(force = false): RunContextState {
    if (state.initialized && !force) return { ...state };

    let search = "";
    if (
        typeof globalThis !== "undefined" &&
        (globalThis as { location?: { search?: string } }).location
    ) {
        search = (globalThis as { location: { search: string } }).location
            .search;
    }
    const params = new URLSearchParams(search);

    const seedParam = params.get("seed");
    if (seedParam !== null && seedParam !== "") {
        const parsed = parseInt(seedParam, 10);
        if (Number.isFinite(parsed)) {
            state.seed = parsed | 0;
            state.seedExplicitlySet = true;
        }
    }
    if (!state.seedExplicitlySet) {
        state.seed = generateRandomSeed();
    }

    const tsParam = params.get("timeScale");
    if (tsParam !== null && tsParam !== "") {
        const parsed = parseFloat(tsParam);
        if (Number.isFinite(parsed)) {
            state.timeScale = clampTimeScale(parsed);
        }
    }

    state.initialized = true;
    return { ...state };
}

export function getSeed(): number {
    if (!state.initialized) initRunContextFromURL();
    return state.seed;
}

export function isSeedExplicit(): boolean {
    return state.seedExplicitlySet;
}

/**
 * Set a seed. Only succeeds if the seed hasn't been locked yet (World has
 * not consumed it). Returns true on success, false on rejection.
 */
export function setSeed(seed: number): boolean {
    if (state.seedLocked) return false;
    if (!Number.isFinite(seed)) return false;
    state.seed = seed | 0;
    state.seedExplicitlySet = true;
    if (!state.initialized) state.initialized = true;
    return true;
}

export function lockSeed(): void {
    state.seedLocked = true;
}

export function isSeedLocked(): boolean {
    return state.seedLocked;
}

export function getTimeScale(): number {
    if (!state.initialized) initRunContextFromURL();
    return state.timeScale;
}

export function setTimeScale(scale: number): number {
    const clamped = clampTimeScale(scale);
    state.timeScale = clamped;
    if (!state.initialized) state.initialized = true;
    return clamped;
}

/** TEST-ONLY reset helper. */
export function __resetForTests(): void {
    state.seed = 0;
    state.seedExplicitlySet = false;
    state.seedLocked = false;
    state.timeScale = 1;
    state.initialized = false;
}
