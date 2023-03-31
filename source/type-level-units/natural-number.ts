import type { Kind } from "./types";

export type NaturalKind = never[];
export type Nat = {
    [0]: Kind<NaturalKind, []>;
    [1]: Kind<NaturalKind, [never]>;
};
export type NaturalToNumber<n extends NaturalKind> = n["length"];
export type AddNatural<n1 extends NaturalKind, n2 extends NaturalKind> = Kind<
    NaturalKind,
    [...n1, ...n2]
>;
export type SubNatural<
    n1 extends NaturalKind,
    n2 extends NaturalKind
> = n1 extends [...n2, ...infer n3]
    ? n3 extends NaturalKind
        ? n3
        : never
    : never;
