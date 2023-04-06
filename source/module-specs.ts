import type { ModuleSpec } from "./p2p";
import { id } from "./standard-extensions";

export const workerSpec = {
    initialize: {
        kind: "call",
        args: [id<OffscreenCanvas>],
        result: id<void>,
    },
    mouseDown: { kind: "notify", args: [] },
    mouseMove: { kind: "notify", args: [id<number>, id<number>] },
    mouseUp: { kind: "notify", args: [] },
    canvasWrapperResized: { kind: "notify", args: [id<number>, id<number>] },
} as const satisfies ModuleSpec;

export const mainSpec = {
    fpsUpdated: { kind: "notify", args: [id<number>] },
} as const satisfies ModuleSpec;
