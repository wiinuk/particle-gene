import {
    add,
    dot,
    getX,
    getY,
    magnitude,
    newVector2,
    newZeroVector2,
    ReadonlyVector2,
    set,
    sub,
    Vector2,
} from "./vector2";

type ParticleTemplate = {
    kinematic?: boolean;
};
type Reporter = Pick<Console, "time" | "timeEnd">;
interface ParticleManagerOptions {
    reporter?: Reporter;
    /** [m] */
    size?: ReadonlyVector2;
}
export function createParticleManager(
    options?: Readonly<ParticleManagerOptions>
) {
    const reporter = options?.reporter;
    const regionAll = options?.size ?? newVector2(0.9, 0.9);
    const particles: Particle[] = [];
    const particleSize = 0.01;
    const h = particleSize * 1.5;
    const stiffness = 100;
    const density0 = 1000;
    const viscosity = 1;
    const massParticle = particleSize * particleSize * density0;
    const { kernel, gradient } = derivePoly6Kernel(h);
    const gravity: ReadonlyVector2 = newVector2(0, -9.8);
    const {
        clear: clearGrid,
        add: addToGrid,
        enumerateNeighbors,
    } = createCell<Particle>(regionAll, h);
    const timeDelta = 0.001;

    function setParticleToCell() {
        clearGrid();
        addToGrid(particles);
    }

    let addNeighborDensity_density = 0;
    function addNeighborDensity(_other: Particle, rv: ReadonlyVector2) {
        const r = magnitude(rv);
        addNeighborDensity_density += kernel(r) * massParticle;
    }
    function densityPressure() {
        for (let i = 0, n = particles.length; i < n; i++) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const p = particles[i]!;
            if (!p.active) {
                continue;
            }

            addNeighborDensity_density = 0;
            enumerateNeighbors(p, addNeighborDensity);
            const density = addNeighborDensity_density;
            p.density = density;
            p.pressure = Math.max(stiffness * (p.density - density0), 0);
        }
    }

    let addNeighborForce_particle: Particle;
    let addNeighborForce_force: Vector2;
    const addNeighborForce_wp = newZeroVector2();
    const addNeighborForce_dv = newZeroVector2();
    function addNeighborForce(pNeighbor: Particle, rv: ReadonlyVector2) {
        const p = addNeighborForce_particle;
        const force = addNeighborForce_force;
        if (p === pNeighbor) {
            return;
        }
        const r = magnitude(rv);

        // pressure
        const wp = gradient(rv, addNeighborForce_wp);
        const fp =
            -massParticle *
            (pNeighbor.pressure / (pNeighbor.density * pNeighbor.density) +
                p.pressure / (p.density * p.density));
        set(force, getX(force) + getX(wp) * fp, getY(force) + getY(wp) * fp);

        // viscosity
        const r2 = r * r + 0.01 * h * h;
        const dv = sub(p.velocity, pNeighbor.velocity, addNeighborForce_dv);
        const fv =
            (((massParticle * 2 * viscosity) /
                (pNeighbor.density * p.density)) *
                dot(rv, wp)) /
            r2;
        set(force, getX(force) + fv * getX(dv), getY(force) + fv * getY(dv));
    }
    function particleForce() {
        for (let i = 0, n = particles.length; i < n; i++) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const p = particles[i]!;
            if (!p.active || p.kinematic) {
                continue;
            }

            const force = set(p.force, 0, 0);

            addNeighborForce_particle = p;
            addNeighborForce_force = force;
            enumerateNeighbors(p, addNeighborForce);

            // gravity force
            add(force, gravity, force);
        }
    }
    function updateVelocity() {
        for (let i = 0, n = particles.length; i < n; i++) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const p = particles[i]!;
            if (!p.active || p.kinematic) {
                continue;
            }
            const { velocity2, force, position, velocity } = p;
            set(
                velocity2,
                getX(velocity2) + getX(force) * timeDelta,
                getY(velocity2) + getY(force) * timeDelta
            );

            set(
                position,
                getX(position) + getX(velocity2) * timeDelta,
                getY(position) + getY(velocity2) * timeDelta
            );

            set(
                velocity,
                getX(velocity2) + 0.5 * getX(force) * timeDelta,
                getY(velocity2) + 0.5 * getY(force) * timeDelta
            );

            if (
                getX(position) < 0 ||
                getY(position) < 0 ||
                getX(position) > getX(regionAll) ||
                getY(position) > getY(regionAll)
            ) {
                p.remove();
            }
        }
    }
    function update() {
        reporter?.time("registerToGrid");
        setParticleToCell();
        reporter?.timeEnd("registerToGrid");
        reporter?.time("calculateForce");
        densityPressure();
        particleForce();
        reporter?.timeEnd("calculateForce");
        reporter?.time("updateVelocity");
        updateVelocity();
        reporter?.timeEnd("updateVelocity");
    }

    function spawnParticlesInRectangle(
        region: Rectangle,
        { kinematic = false }: ParticleTemplate
    ) {
        const nx = Math.round(region.width / particleSize);
        const ny = Math.round(region.height / particleSize);

        for (let i = 0; i < nx; i++) {
            for (let j = 0; j < ny; j++) {
                const x = region.left + (i + 0.5) * particleSize;
                const y = region.bottom + (j + 0.5) * particleSize;
                particles.push(new Particle(x, y, kinematic));
            }
        }
    }
    function getParticles(): Iterable<
        Readonly<{
            active: boolean;
            position: ReadonlyVector2;
            kinematic: boolean;
        }>
    > {
        return particles;
    }
    return {
        particleSize,
        spawnParticlesInRectangle,
        update,
        getParticles,
    };
}
class Particle {
    position: Vector2;
    velocity: Vector2;
    velocity2: Vector2;
    force: Vector2;
    pressure: number;
    density: number;
    active: boolean;
    kinematic: boolean;
    constructor(x: number, y: number, kinematic: boolean) {
        this.position = newVector2(x, y);
        this.velocity = newZeroVector2();
        this.velocity2 = newZeroVector2();
        this.force = newZeroVector2();
        this.pressure = 0;
        this.density = 0;
        this.active = true;
        this.kinematic = kinematic;
    }

    remove() {
        this.active = false;
    }
}

type ParticleKind = {
    readonly active: boolean;
    readonly position: Vector2;
};
function createCell<T extends ParticleKind>(
    region: ReadonlyVector2,
    h: number
) {
    const nx = Math.ceil(getX(region) / h);
    const ny = Math.ceil(getY(region) / h);
    const buckets = new Array<T[]>(nx * ny);
    for (let i = 0; i < buckets.length; i++) {
        buckets[i] = [];
    }

    function getIndexX(positionX: number) {
        return Math.floor(positionX / h);
    }
    function getIndexY(positionY: number) {
        return Math.floor(positionY / h);
    }
    function getCellIndex(position: ReadonlyVector2) {
        return getIndexX(getX(position)) + getIndexY(getY(position)) * nx;
    }

    function clear() {
        for (let i = 0, n = buckets.length; i < n; i++) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            buckets[i]!.length = 0;
        }
    }
    function add(particles: T[]) {
        for (let i = 0, n = particles.length; i < n; i++) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const p = particles[i]!;
            if (!p.active) {
                continue;
            }
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            buckets[getCellIndex(p.position)]!.push(p);
        }
    }

    const enumerateNeighbors_rv = newZeroVector2();
    function enumerateNeighbors<TState>(
        target: T,
        action: (other: T, rv: ReadonlyVector2, state: TState) => void,
        state: TState
    ): void;
    function enumerateNeighbors(
        target: T,
        action: (other: T, rv: ReadonlyVector2, state?: undefined) => void
    ): void;
    function enumerateNeighbors<TState>(
        target: T,
        action: (other: T, rv: ReadonlyVector2, state?: TState) => void,
        state?: TState
    ) {
        const { position } = target;
        const indexX = getIndexX(getX(position));
        const indexY = getIndexY(getY(position));

        for (let i = indexX - 1; i <= indexX + 1; i++) {
            if (i < 0 || i >= nx) {
                continue;
            }

            for (let j = indexY - 1; j <= indexY + 1; j++) {
                if (j < 0 || j >= ny) {
                    continue;
                }
                const indexCell = i + j * nx;

                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const bucket = buckets[indexCell]!;
                for (let k = 0, n = bucket.length; k < n; k++) {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    const pNeighbor = bucket[k]!;
                    const rv = sub(
                        position,
                        pNeighbor.position,
                        enumerateNeighbors_rv
                    );
                    if (magnitude(rv) >= h) {
                        continue;
                    }

                    action(pNeighbor, rv, state);
                }
            }
        }
    }
    return { clear, add, enumerateNeighbors };
}

export class Rectangle {
    width: number;
    height: number;
    left: number;
    right: number;
    bottom: number;
    top: number;
    constructor(x: number, y: number, width: number, height: number) {
        this.width = width;
        this.height = height;
        this.left = x;
        this.right = x + width;
        this.bottom = y;
        this.top = y + height;
    }
}

function derivePoly6Kernel(h: number) {
    const alpha = 4 / (Math.PI * h ** 8);

    function kernel(r: number) {
        return r < h ? alpha * (h * h - r * r) ** 3 : 0;
    }

    function gradient(rv: ReadonlyVector2, result: Vector2) {
        const r = magnitude(rv);
        if (r < h) {
            const c = -6 * alpha * (h * h - r * r) ** 2;
            return set(result, c * getX(rv), c * getY(rv));
        } else {
            return set(result, 0, 0);
        }
    }
    return {
        kernel,
        gradient,
    };
}
