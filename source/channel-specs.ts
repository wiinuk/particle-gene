import type { ModuleSpec } from "./worker-module";
import { id } from "./standard-extensions";

export const workerSpec = {
    initialize: {
        args: [id<OffscreenCanvas>],
        transferableObjects: true,
    },
    mouseDown: { args: [] },
    mouseMove: { args: [id<number>, id<number>] },
    mouseUp: { args: [] },
    canvasWrapperResized: { args: [id<number>, id<number>] },
} as const satisfies ModuleSpec;

export const mainSpec = {
    fpsUpdated: { args: [id<number>] },
} as const satisfies ModuleSpec;
