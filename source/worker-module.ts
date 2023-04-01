import type { ArrowKind, Id, MapTuple } from "./standard-extensions";

interface UnwrapId extends ArrowKind {
    body: this["parameter"] extends Id<infer x> ? x : this["parameter"];
}
type UnwrapIds<Ts extends readonly unknown[]> = MapTuple<UnwrapId, Ts>;

export type ModuleSpec = {
    readonly [name: string]: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        readonly args: readonly Id<any>[];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        readonly transferableObjects?: boolean;
    };
};
export type SpecToModule<T extends ModuleSpec> = {
    [k in keyof T]: T[k]["transferableObjects"] extends true
        ? (
              ...args: [
                  ...args: UnwrapIds<T[k]["args"]>,
                  transferableObjects: Transferable[]
              ]
          ) => void
        : (...args: UnwrapIds<T[k]["args"]>) => void;
};
export function portToModule<T extends ModuleSpec>(
    port: {
        postMessage(data: unknown, transferableObjects?: Transferable[]): void;
    },
    spec: T
) {
    const module: SpecToModule<T> = Object.create(null);
    Object.keys(spec).forEach((type) => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const { transferableObjects } = spec[type]!;
        module[type as keyof T] = ((...args: unknown[]) => {
            if (transferableObjects) {
                const transferableObjects = args[
                    args.length - 1
                ] as Transferable[];
                args.length--;
                port.postMessage({ type, args }, transferableObjects);
            } else {
                port.postMessage({ type, args });
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }) as any;
    });
    return module;
}

type SpecToMessage<T extends ModuleSpec> = {
    [k in keyof T]: { type: k; args: UnwrapIds<T[k]["args"]> };
}[keyof T];

function addMessageListener<T extends ModuleSpec>(
    worker: Worker,
    module: SpecToModule<T>
) {
    worker.addEventListener("message", (e) => {
        const message = e.data as SpecToMessage<T>;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        module[message.type](...(message.args as any));
    });
}

export function connectWorker<
    TWorker extends ModuleSpec,
    TMain extends ModuleSpec
>(worker: Worker, workerSpec: TWorker, module: SpecToModule<TMain>) {
    addMessageListener(worker, module);
    return { worker: portToModule(worker, workerSpec) };
}
export function dispatchMessage<T extends ModuleSpec>(
    self: DedicatedWorkerGlobalScope,
    _workerSpec: T,
    workerModule: SpecToModule<T>,
    errorHandler = (e: unknown) => console.error(e)
) {
    self.onmessage = (e) => {
        const message = e.data as SpecToMessage<T>;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        workerModule[message.type](...(message.args as any));
    };
    self.onerror = errorHandler;
    self.onrejectionhandled = errorHandler;
    self.onunhandledrejection = errorHandler;
}
