export type Id<T> = (x: T) => T;
export const id = <T>(x: T) => x;

export type Kind<K, T extends K> = T;
export type unreachable = never;
