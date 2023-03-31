type Bound = [
    centerX: number,
    centerY: number,
    extendX: number,
    extendY: number
];
export type ReadonlyBound = Readonly<Bound>;
export function newBoundOfCenterExtend(
    centerX: number,
    centerY: number,
    extendX: number,
    extendY: number
): Bound {
    return [centerX, centerY, extendX, extendY];
}
function getCenterX(bound: ReadonlyBound) {
    return bound[0];
}
function getCenterY(bound: ReadonlyBound) {
    return bound[1];
}
function getExtendX(bound: ReadonlyBound) {
    return bound[2];
}
function getExtendY(bound: ReadonlyBound) {
    return bound[3];
}
export function getWidth(bound: ReadonlyBound) {
    return getExtendX(bound) * 2;
}
export function getHeight(bound: ReadonlyBound) {
    return getExtendY(bound) * 2;
}
export function getLeft(bound: ReadonlyBound) {
    return getCenterX(bound) - getExtendX(bound);
}
export function getBottom(bound: ReadonlyBound) {
    return getCenterY(bound) - getExtendY(bound);
}
