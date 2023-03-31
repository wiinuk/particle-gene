import type {
    AddNatural,
    Nat,
    NaturalKind,
    NaturalToNumber,
    SubNatural,
} from "./natural-number";
import type { Kind, unreachable } from "./types";

export type SignKind = "-" | "+";
export type IntegerKind = [SignKind, NaturalKind];
export type Int = {
    [-1]: ["-", Nat[1]];
    [0]: ["+", Nat[0]];
    [1]: ["+", Nat[1]];
};
export type IntegerToNumber<z extends IntegerKind> = `${z[0] extends "-"
    ? "-"
    : ""}${NaturalToNumber<z[1]>}` extends `${infer x extends number}`
    ? x
    : unreachable;

type Normalize<z extends IntegerKind> = Kind<
    IntegerKind,
    z[1] extends Nat[0] ? Int[0] : z
>;

type subNaturalToInteger<
    n1 extends NaturalKind,
    n2 extends NaturalKind
> = SubNatural<n1, n2> extends never
    ? ["-", SubNatural<n2, n1>]
    : ["+", SubNatural<n1, n2>];

export type AddInteger<
    z1 extends IntegerKind,
    z2 extends IntegerKind
> = Normalize<
    z1[0] extends "+"
        ? z2[0] extends "+"
            ? ["+", AddNatural<z1[1], z2[1]>]
            : subNaturalToInteger<z1[1], z2[1]>
        : z2[0] extends "+"
        ? subNaturalToInteger<z2[1], z1[1]>
        : ["-", AddNatural<z1[1], z2[1]>]
>;

export type SubInteger<
    z1 extends IntegerKind,
    z2 extends IntegerKind
> = Normalize<
    z1[0] extends "+"
        ? z2[0] extends "+"
            ? subNaturalToInteger<z1[1], z2[1]>
            : ["+", AddNatural<z1[1], z2[1]>]
        : z2[0] extends "+"
        ? ["-", AddNatural<z1[1], z2[1]>]
        : subNaturalToInteger<z2[1], z1[1]>
>;
