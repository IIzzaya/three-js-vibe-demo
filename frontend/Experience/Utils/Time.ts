import { clampTimeScale } from "./RunContext.js";

export default class Time {
    start: number;
    current: number;
    elapsed: number;
    /** Raw wall-clock delta in seconds (unscaled). */
    rawDelta: number;
    /** Scaled delta in seconds (rawDelta × timeScale). Consumers read this. */
    delta: number;
    /** Accumulated scaled game time in seconds since start. */
    gameSeconds: number;
    /** Current scaling multiplier. 1 = real-time, 4 = 4× faster. */
    timeScale: number;

    constructor() {
        this.start = Date.now();
        this.current = this.start;
        this.elapsed = 0;
        this.rawDelta = 0.016;
        this.delta = 0.016;
        this.gameSeconds = 0;
        this.timeScale = 1;
    }

    update(): void {
        const currentTime = Date.now();
        let raw = (currentTime - this.current) / 1000;
        this.current = currentTime;

        // Cap huge gaps (tab was backgrounded etc.) at 1 wall-second to
        // avoid physics explosions when scaled.
        if (raw > 1) raw = 1;

        this.rawDelta = raw;
        this.delta = raw * this.timeScale;
        this.elapsed += raw;
        this.gameSeconds += this.delta;
    }

    getDelta(): number {
        return this.delta;
    }

    /** Returns the previous timeScale. */
    setTimeScale(scale: number): number {
        const prev = this.timeScale;
        this.timeScale = clampTimeScale(scale);
        return prev;
    }
}
