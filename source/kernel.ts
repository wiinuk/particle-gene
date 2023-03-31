import {
    getX,
    getY,
    magnitude,
    newZeroVector2,
    ReadonlyVector2,
    set,
    Vector2,
} from "./vector2";

export interface Kernel {
    readonly kernel: (this: unknown, r: number) => number;
    readonly gradient: (
        this: unknown,
        rv: ReadonlyVector2,
        result?: Vector2
    ) => Vector2;
}

/**
 * @param h 影響半径
 */
export function derivePoly6Kernel(h: number) {
    const alpha = 4 / (Math.PI * h ** 8);
    function kernel(r: number) {
        if (r < h) {
            return alpha * (h * h - r * r) ** 3;
        }
        return 0;
    }
    function gradient(rv: ReadonlyVector2, result = newZeroVector2()) {
        const r = magnitude(rv);
        if (r < h) {
            const c = -6 * alpha * (h * h - r * r) ** 2;
            return set(result, c * getX(rv), c * getY(rv));
        }
        return set(result, 0, 0);
    }
    return { kernel, gradient };
}
