export type Vector2 = [x: number, y: number];
export type ReadonlyVector2 = Readonly<Vector2>;
export function newVector2(x: number, y: number): Vector2 {
    return [x, y];
}
export function newZeroVector2() {
    return newVector2(0, 0);
}
export function getX(vector: ReadonlyVector2): number {
    return vector[0];
}
export function getY(vector: ReadonlyVector2): number {
    return vector[1];
}
export function setX(vector: Vector2, value: number): void {
    vector[0] = value;
    return;
}
export function setY(vector: Vector2, value: number): void {
    vector[1] = value;
    return;
}
export function dot(
    vector1: ReadonlyVector2,
    vector2: ReadonlyVector2
): number {
    return getX(vector1) * getX(vector2) + getY(vector1) * getY(vector2);
}
export function magnitude(vector: ReadonlyVector2): number {
    return Math.sqrt(dot(vector, vector));
}
export function set(vector: Vector2, x: number, y: number): Vector2 {
    setX(vector, x);
    setY(vector, y);
    return vector;
}
export function sub(
    vector1: ReadonlyVector2,
    vector2: ReadonlyVector2,
    result: Vector2
) {
    return set(
        result,
        getX(vector1) - getX(vector2),
        getY(vector1) - getY(vector2)
    );
}
export function add(
    vector1: ReadonlyVector2,
    vector2: ReadonlyVector2,
    result: Vector2
) {
    return set(
        result,
        getX(vector1) + getX(vector2),
        getY(vector1) + getY(vector2)
    );
}
export function distanceInTorus(
    vector1: ReadonlyVector2,
    vector2: ReadonlyVector2,
    torusSize: ReadonlyVector2,
    result: Vector2
) {
    const sizeX = getX(torusSize);
    const sizeY = getY(torusSize);
    const x = Math.abs(
        ((getX(vector2) - getX(vector1) + sizeX / 2) % sizeX) - sizeX / 2
    );
    const y = Math.abs(
        ((getY(vector2) - getY(vector1) + sizeY / 2) % sizeY) - sizeY / 2
    );
    return set(result, x, y);
}
