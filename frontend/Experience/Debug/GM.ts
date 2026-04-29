import type DebugBus from "./DebugBus.js";

type GMCommand = (...args: unknown[]) => unknown;

interface GMCommandEntry {
    name: string;
    description: string;
    handler: GMCommand;
}

declare global {
    interface Window {
        GM: GM;
    }
}

export default class GM {
    private debugBus: DebugBus;
    private commands: Map<string, GMCommandEntry> = new Map();
    private enabled: boolean;

    constructor(debugBus: DebugBus) {
        this.debugBus = debugBus;
        this.enabled =
            import.meta.env.DEV || import.meta.env.VITE_DEBUG === "true";

        if (this.enabled) {
            window.GM = this;
            this.registerBuiltinCommands();
        }
    }

    register(name: string, description: string, handler: GMCommand): void {
        this.commands.set(name, { name, description, handler });

        if (this.enabled) {
            (this as unknown as Record<string, GMCommand>)[name] = (
                ...args: unknown[]
            ) => {
                this.debugBus.emit("gm", "execute", {
                    command: name,
                    args,
                });
                return handler(...args);
            };
        }
    }

    execute(name: string, ...args: unknown[]): unknown {
        const entry = this.commands.get(name);
        if (!entry) {
            console.warn(`[GM] Unknown command: ${name}`);
            return undefined;
        }

        this.debugBus.emit("gm", "execute", { command: name, args });
        return entry.handler(...args);
    }

    help(): void {
        console.table(
            Array.from(this.commands.values()).map((cmd) => ({
                Command: `GM.${cmd.name}()`,
                Description: cmd.description,
            })),
        );
    }

    getState(): Record<string, unknown> {
        this.debugBus.emit("gm", "getState", {});
        return {
            debugEnabled: this.debugBus.isEnabled(),
            registeredCommands: Array.from(this.commands.keys()),
            eventHistory: this.debugBus.getHistory(),
        };
    }

    queryState(path: string): unknown {
        this.debugBus.emit("gm", "queryState", { path });
        const state = this.getState();
        return path.split(".").reduce<unknown>((obj, key) => {
            if (obj && typeof obj === "object" && key in obj) {
                return (obj as Record<string, unknown>)[key];
            }
            return undefined;
        }, state);
    }

    private registerBuiltinCommands(): void {
        this.register("help", "Show all available GM commands", () =>
            this.help(),
        );

        this.register("getState", "Get full debug state snapshot (JSON)", () =>
            this.getState(),
        );

        this.register(
            "queryState",
            "Query specific state by dot path",
            (path: unknown) => this.queryState(path as string),
        );

        this.register(
            "debugHistory",
            "Get debug event history, optionally filtered by category",
            (category?: unknown) =>
                this.debugBus.getHistory(category as string | undefined),
        );

        this.register("clearHistory", "Clear debug event history", () =>
            this.debugBus.clearHistory(),
        );

        this.register(
            "setDebug",
            "Enable or disable debug output",
            (enabled: unknown) => this.debugBus.setEnabled(enabled as boolean),
        );
    }

    isEnabled(): boolean {
        return this.enabled;
    }
}
