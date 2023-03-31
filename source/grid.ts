import { modulo } from "./standard-extensions";
import { getX, getY, magnitude, newZeroVector2, sub, Vector2 } from "./vector2";

export type Grid<T> = {
    readonly h: number;
    readonly width: number;
    readonly height: number;
    readonly countX: number;
    readonly countY: number;
    readonly cells: Array<Array<T>>;
};

export function newGrid<T>(width: number, height: number, h: number) {
    const countX = Math.ceil(width / h);
    const countY = Math.ceil(height / h);
    return {
        h,
        width,
        height,
        countX,
        countY,
        cells: new Array(countX * countY),
    } satisfies Grid<T>;
}
export function clearGrid<T>({ cells }: Grid<T>) {
    for (let i = 0; i < cells.length; i++) {
        // TODO: `length = 0` で代替できる?
        cells[i] = [];
    }
}
export function addToGrid<T>(grid: Grid<T>, x: number, y: number, value: T) {
    const { cells } = grid;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    cells[getCellIndex(grid, x, y)]!.push(value);
}

function getIndexX<T>({ h }: Grid<T>, x: number) {
    return Math.floor(x / h);
}
function getIndexY<T>({ h }: Grid<T>, y: number) {
    return Math.floor(y / h);
}
export function getCellIndex<T>(grid: Grid<T>, x: number, y: number): number {
    return getIndexX(grid, x) + getIndexY(grid, y) * grid.countX;
}

type Reducer<E, S, T> = (
    environment: E,
    state: S,
    other: T,
    rv: Readonly<Vector2>,
    target: T
) => S;

const resultVector2 = newZeroVector2();
export function reduceEachNeighbors<
    E,
    S,
    T extends { readonly position: Vector2 }
>(
    environment: E,
    state: S,
    grid: Grid<T>,
    target: T,
    reducer: Reducer<E, S, T>
): S {
    const indexX = getIndexX(grid, getX(target.position));
    const indexY = getIndexY(grid, getY(target.position));

    for (let i = indexX - 1; i <= indexX + 1; i++) {
        // TODO: 範囲チェックを削除
        // if (i < 0 || grid.countX <= i) {
        //     continue;
        // }

        for (let j = indexY - 1; j <= indexY + 1; j++) {
            // TODO: 範囲チェックを削除
            // if (j < 0 || grid.countY <= j) {
            //     continue;
            // }

            // 端と端がつながっている
            const indexCell =
                modulo(i, grid.countX) + modulo(j, grid.countY) * grid.countX;
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const cell = grid.cells[indexCell]!;

            for (let k = 0, cellLength = cell.length; k < cellLength; k++) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const pNeighbor = cell[k]!;

                const rv = sub(
                    target.position,
                    pNeighbor.position,
                    resultVector2
                );
                if (grid.h <= magnitude(rv)) {
                    continue;
                }

                state = reducer(environment, state, pNeighbor, rv, target);
            }
        }
    }
    return state;
}
