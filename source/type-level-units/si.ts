import type { Kind } from "./types";
import type { UnitKind } from "./unit";

export const m = Symbol("m");
export type metre = Kind<UnitKind, { [m]: 1 }>;
export const kg = Symbol("second");
export type kilogram = Kind<UnitKind, { [kg]: 1 }>;
export const s = Symbol("second");
export type second = Kind<UnitKind, { [s]: 1 }>;
