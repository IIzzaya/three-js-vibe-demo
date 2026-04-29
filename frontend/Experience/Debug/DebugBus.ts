import { EventEmitter } from "events";

export interface DebugEvent {
    category: string;
    action: string;
    data: Record<string, unknown>;
    timestamp: number;
}

type DebugEventHandler = (event: DebugEvent) => void;

const DEBUG_ENV_KEY = "VITE_DEBUG";

export default class DebugBus extends EventEmitter {
    private enabled: boolean;
    private history: DebugEvent[] = [];
    private maxHistory = 500;
    private handlers: Map<string, DebugEventHandler[]> = new Map();

    constructor() {
        super();
        this.enabled =
            import.meta.env.DEV || import.meta.env[DEBUG_ENV_KEY] === "true";
    }

    emit(
        category: string,
        action: string,
        data: Record<string, unknown> = {},
    ): boolean {
        if (!this.enabled) return false;

        const event: DebugEvent = {
            category,
            action,
            data,
            timestamp: performance.now(),
        };

        this.history.push(event);
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }

        const tag = `[EVENT] ${category}:${action}`;
        console.log(tag, data);

        const key = `${category}:${action}`;
        const categoryHandlers = this.handlers.get(key) || [];
        categoryHandlers.forEach((handler) => handler(event));

        const wildcardHandlers = this.handlers.get(`${category}:*`) || [];
        wildcardHandlers.forEach((handler) => handler(event));

        const globalHandlers = this.handlers.get("*") || [];
        globalHandlers.forEach((handler) => handler(event));

        return true;
    }

    on(pattern: string, handler: DebugEventHandler): this {
        const existing = this.handlers.get(pattern) || [];
        existing.push(handler);
        this.handlers.set(pattern, existing);
        return this;
    }

    off(pattern: string, handler: DebugEventHandler): this {
        const existing = this.handlers.get(pattern) || [];
        this.handlers.set(
            pattern,
            existing.filter((h) => h !== handler),
        );
        return this;
    }

    getHistory(category?: string): DebugEvent[] {
        if (!category) return [...this.history];
        return this.history.filter((e) => e.category === category);
    }

    getLastEvent(category: string, action?: string): DebugEvent | undefined {
        for (let i = this.history.length - 1; i >= 0; i--) {
            const event = this.history[i];
            if (event.category === category) {
                if (!action || event.action === action) {
                    return event;
                }
            }
        }
        return undefined;
    }

    clearHistory(): void {
        this.history = [];
    }

    isEnabled(): boolean {
        return this.enabled;
    }

    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }
}
