import type { AddNumberAsInteger, SubNumberAsInteger } from "./number";
import type { Kind, unreachable } from "./types";

export type UnitKind = { [symbol: string | symbol]: number };
// eslint-disable-next-line @typescript-eslint/ban-types
export type Dimensionless = Kind<UnitKind, {}>;

export type MultiplyUnit<U1 extends UnitKind, U2 extends UnitKind> = {
    [k in keyof U1 | keyof U2]: k extends keyof U1
        ? k extends keyof U2
            ? AddNumberAsInteger<U1[k], U2[k]>
            : U1[k]
        : k extends keyof U2
        ? U2[k]
        : unreachable;
};
export type DivideUnit<U1 extends UnitKind, U2 extends UnitKind> = {
    [k in keyof U1 | keyof U2]: k extends keyof U1
        ? k extends keyof U2
            ? SubNumberAsInteger<U1[k], U2[k]>
            : U1[k]
        : k extends keyof U2
        ? SubNumberAsInteger<0, U2[k]>
        : unreachable;
};
