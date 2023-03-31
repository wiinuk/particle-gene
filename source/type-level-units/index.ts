import type { Id } from "./types";
import type { DivideUnit, MultiplyUnit, UnitKind } from "./unit";
export { UnitKind, Dimensionless } from "./unit";
export { id } from "./types";

const privatePhantomSymbol = Symbol("privatePhantom");
export type numberWith<U> = {
    readonly [privatePhantomSymbol]: U;
};

export function withoutUnit(value: numberWith<unknown>) {
    return value as unknown as number;
}
export function unit<U>(value: number, _unit: Id<U>) {
    return value as unknown as numberWith<U>;
}

export function add<U>(x1: numberWith<U>, x2: numberWith<U>) {
    return (withoutUnit(x1) + withoutUnit(x2)) as unknown as numberWith<U>;
}
export function sub<U>(x1: numberWith<U>, x2: numberWith<U>) {
    return (withoutUnit(x1) - withoutUnit(x2)) as unknown as numberWith<U>;
}
export function mul<U1 extends UnitKind, U2 extends UnitKind>(
    x1: numberWith<U1>,
    x2: numberWith<U2>
) {
    return (withoutUnit(x1) * withoutUnit(x2)) as unknown as numberWith<
        MultiplyUnit<U1, U2>
    >;
}
export function div<U1 extends UnitKind, U2 extends UnitKind>(
    x1: numberWith<U1>,
    x2: numberWith<U2>
) {
    return (withoutUnit(x1) / withoutUnit(x2)) as unknown as numberWith<
        DivideUnit<U1, U2>
    >;
}
export function sqrt<U extends UnitKind>(x: numberWith<MultiplyUnit<U, U>>) {
    return Math.sqrt(withoutUnit(x)) as unknown as numberWith<U>;
}
