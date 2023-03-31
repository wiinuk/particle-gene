import type {
    AddInteger,
    IntegerKind,
    IntegerToNumber,
    SignKind,
    SubInteger,
} from "./integer";
import type {
    AddNatural,
    Nat,
    NaturalKind,
    NaturalToNumber,
} from "./natural-number";
import type { Kind, unreachable } from "./types";

type unsafeToNatural<
    n extends number,
    result extends NaturalKind
> = NaturalToNumber<result> extends n
    ? result
    : unsafeToNatural<n, AddNatural<result, Nat[1]>>;

type ToInteger<z extends number> = Kind<
    IntegerKind,
    (
        `${z}` extends `-${infer z2 extends number}` ? ["-", z2] : ["+", z]
    ) extends [infer sign extends SignKind, infer z3 extends number]
        ? `${z3}` extends `${infer z4 extends number}.${number}`
            ? [sign, unsafeToNatural<z4, Nat[0]>]
            : [sign, unsafeToNatural<z3, Nat[0]>]
        : unreachable
>;
export type AddNumberAsInteger<
    x1 extends number,
    x2 extends number
> = IntegerToNumber<AddInteger<ToInteger<x1>, ToInteger<x2>>>;
export type SubNumberAsInteger<
    x1 extends number,
    x2 extends number
> = IntegerToNumber<SubInteger<ToInteger<x1>, ToInteger<x2>>>;
