import type { Id } from "./standard-extensions";
import type { unreachable } from "./type-level-units/types";

type UnwrapIds<Ts extends readonly unknown[]> = Ts extends readonly [
    Id<infer x>,
    ...infer xs
]
    ? [x, ...UnwrapIds<xs>]
    : Ts extends readonly []
    ? []
    : Ts extends readonly Id<infer x>[]
    ? x[]
    : unreachable;

type NotifyMethodDescriptor = {
    readonly kind: "notify";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readonly args: readonly Id<any>[];
};
type CallMethodDescriptor = {
    readonly kind: "call";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readonly args: readonly Id<any>[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readonly result: Id<any>;
};
type MethodDescriptor = NotifyMethodDescriptor | CallMethodDescriptor;
export type ModuleSpec = {
    readonly [name: string]: MethodDescriptor;
};

type MethodInterfaceReturnType<D extends MethodDescriptor> =
    D extends CallMethodDescriptor
        ? D["result"] extends Id<infer x>
            ? x extends Promise<infer _>
                ? x
                : Promise<x>
            : unreachable
        : void;

type MethodImplementationReturnType<D extends MethodDescriptor> =
    D extends CallMethodDescriptor
        ? D["result"] extends Id<infer x>
            ? x
            : unreachable
        : void;

export type SpecToModuleInterface<T extends ModuleSpec> = {
    [k in keyof T]: (
        ...args: [...args: UnwrapIds<T[k]["args"]>, transfer?: Transferable[]]
    ) => MethodInterfaceReturnType<T[k]>;
};
export type SpecToModuleImplementation<T extends ModuleSpec> = {
    [k in keyof T]: (
        ...args: UnwrapIds<T[k]["args"]>
    ) => MethodImplementationReturnType<T[k]>;
};

type Port = {
    postMessage(data: unknown, transfer?: Transferable[]): void;
    addEventListener(
        type: "message",
        listener: (e: MessageEvent<unknown>) => void
    ): void;
};

type Connection = {
    newId(): number;
    createPromiseFor(id: number): Promise<unknown>;
};
const portToConnection = new WeakMap<Port, Connection>();
function getOrInitializeConnection(port: Port) {
    type ResponseHandler = (response: ResponseMessage) => void;

    const c = portToConnection.get(port);
    if (c) return c;

    let nextId = 0;
    const responseHandlers = new Map<number, ResponseHandler>();

    function newId() {
        return nextId++;
    }
    function createPromiseFor(id: number) {
        return new Promise<unknown>((resolve, reject) => {
            responseHandlers.set(id, (response) =>
                response.kind === "return"
                    ? resolve(response.result)
                    : reject(response.reason)
            );
        });
    }
    const connection: Connection = { newId, createPromiseFor };

    portToConnection.set(port, connection);

    port.addEventListener("message", (e) => {
        const response = e.data as Message;
        switch (response.kind) {
            case "return":
            case "throw": {
                const { id } = response;
                const handler = responseHandlers.get(id);
                if (!handler) {
                    throw new Error(`handler ${id} not found`);
                }
                responseHandlers.delete(id);
                handler(response);
            }
        }
    });
    return connection;
}

function popTransferFromArgs(argsLength: number, args: unknown[]) {
    if (args.length === argsLength + 1) {
        const transfer = args[args.length - 1] as Transferable[] | undefined;
        args.length--;
        return transfer;
    }
    return undefined;
}
function createNotifyMethodWrapper(
    methodName: string,
    descriptor: NotifyMethodDescriptor,
    port: Port
) {
    const argsLength = descriptor.args.length;
    return (...args: unknown[]) => {
        port.postMessage(
            { kind: "notify", methodName, args } satisfies NotifyRequest,
            popTransferFromArgs(argsLength, args)
        );
    };
}
function createCallMethodWrapper(
    methodName: string,
    descriptor: CallMethodDescriptor,
    port: Port
) {
    const argsLength = descriptor.args.length;
    return (...args: unknown[]) => {
        const connection = getOrInitializeConnection(port);
        const id = connection.newId();
        const promise = connection.createPromiseFor(id);
        port.postMessage(
            { kind: "call", methodName, args, id } satisfies CallRequest,
            popTransferFromArgs(argsLength, args)
        );
        return promise;
    };
}

function createRemoteMethodWrapper(
    methodName: string,
    descriptor: MethodDescriptor,
    port: Port
) {
    const { kind } = descriptor;
    switch (kind) {
        case "notify":
            return createNotifyMethodWrapper(methodName, descriptor, port);
        case "call":
            return createCallMethodWrapper(methodName, descriptor, port);
        default:
            throw new Error(`unexpected kind: ${kind satisfies never}`);
    }
}
type NotifyRequest<
    N = string,
    M extends NotifyMethodDescriptor = NotifyMethodDescriptor
> = {
    kind: "notify";
    methodName: N;
    args: UnwrapIds<M["args"]>;
};

type CallRequest<
    N = string,
    M extends CallMethodDescriptor = CallMethodDescriptor
> = {
    kind: "call";
    methodName: N;
    args: UnwrapIds<M["args"]>;
    id: number;
};

type RequestMessage = NotifyRequest | CallRequest;
type ResponseMessage =
    | { kind: "return"; id: number; result: unknown }
    | { kind: "throw"; id: number; reason: unknown };

type Message = RequestMessage | ResponseMessage;

function handleCallRequest<S extends ModuleSpec>(
    module: SpecToModuleImplementation<S>,
    request: CallRequest<keyof S, CallMethodDescriptor>,
    port: Port
) {
    const args = request.args;
    let hasError = false;
    let result: unknown;
    try {
        const method = module[request.methodName];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result = method(...(args as any));
    } catch (e) {
        hasError = true;
        result = e;
    }

    const { id } = request;
    if (hasError) {
        port.postMessage({
            kind: "throw",
            id,
            reason: result,
        } satisfies ResponseMessage);
        return;
    }
    if (result instanceof Promise) {
        result.then(
            (result) => {
                port.postMessage({
                    kind: "return",
                    id,
                    result,
                } satisfies ResponseMessage);
            },
            (reason) => {
                port.postMessage({
                    kind: "throw",
                    id,
                    reason,
                } satisfies ResponseMessage);
            }
        );
        return;
    }
    port.postMessage({
        kind: "return",
        id,
        result,
    } satisfies ResponseMessage);
}
function handleRequest(
    port: Port,
    module: SpecToModuleImplementation<ModuleSpec>,
    request: Message
) {
    const { kind } = request;
    switch (kind) {
        case "notify": {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            module[request.methodName]!(...request.args);
            return;
        }
        case "call": {
            handleCallRequest(module, request, port);
            return;
        }
    }
}

function addRequestListener<T extends ModuleSpec>(
    port: Port,
    module: SpecToModuleImplementation<T>
) {
    port.addEventListener("message", (e) => {
        const request = e.data as Message;
        handleRequest(port, module, request);
    });
}

function portToModule<T extends ModuleSpec>(port: Port, spec: T) {
    const module: SpecToModuleInterface<T> = Object.create(null);
    Object.keys(spec).forEach((methodName) => {
        module[methodName as keyof T] = createRemoteMethodWrapper(
            methodName,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            spec[methodName]!,
            port
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ) as any;
    });
    return module;
}

export function connect<
    TImportSpec extends ModuleSpec,
    TExportSpec extends ModuleSpec
>(
    port: Port,
    importSpec: TImportSpec,
    exportModule: SpecToModuleImplementation<TExportSpec>,
    _exportSpec: TExportSpec
) {
    addRequestListener(port, exportModule);
    return portToModule(port, importSpec);
}
