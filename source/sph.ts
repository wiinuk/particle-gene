import {
    getBottom,
    getHeight,
    getLeft,
    getWidth,
    ReadonlyBound,
} from "./bound";
import {
    addToGrid,
    clearGrid,
    Grid,
    newGrid,
    reduceEachNeighbors,
} from "./grid";
import { Kernel, derivePoly6Kernel } from "./kernel";
import { modulo } from "./standard-extensions";
import {
    magnitude,
    newVector2,
    Vector2,
    getX,
    getY,
    newZeroVector2,
    set,
    sub,
    dot,
    add,
} from "./vector2";

interface ParticleEnvironment extends Kernel {
    readonly particleSize: number;
    readonly grid: Grid<Particle>;
    /** 基準密度 */
    readonly density0: number;
    /** 圧力の剛性 */
    readonly stiffness: number;
    /** 影響半径 */
    readonly h: number;
    readonly gravity: Vector2;
    timeDelta: number;

    readonly initialMass: number;
    readonly initialViscosity: number;
}
export type Particle = {
    isActive: boolean;
    readonly position: Vector2;
    readonly velocity: Vector2;
    readonly velocity2: Vector2;
    readonly force: Vector2;
    /** 粘性係数 */
    readonly viscosity: number;
    readonly mass: number;
    pressure: number;
    density: number;
};
function newParticle(
    environment: ParticleEnvironment,
    x: number,
    y: number
): Particle {
    return {
        position: newVector2(x, y),
        velocity: newZeroVector2(),
        velocity2: newZeroVector2(),
        force: newZeroVector2(),
        pressure: 0,
        density: 0,
        isActive: true,
        mass: environment.initialMass,
        viscosity: environment.initialViscosity,
    };
}
function addParticlesToGrid(
    grid: Grid<Particle>,
    particles: readonly Particle[]
): void {
    for (let i = 0; i < particles.length; i++) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const particle = particles[i]!;
        if (!particle.isActive) {
            continue;
        }
        addToGrid(
            grid,
            getX(particle.position),
            getY(particle.position),
            particle
        );
    }
}
function addDensityOfNeighbors(
    environment: ParticleEnvironment,
    density: number,
    other: Particle,
    rv: Readonly<Vector2>
) {
    const r = magnitude(rv);
    return density + environment.kernel(r) * other.mass;
}
function updateDensityAndPressures(
    environment: ParticleEnvironment,
    particles: readonly Particle[]
) {
    const { stiffness, density0 } = environment;
    for (let i = 0, length = particles.length; i < length; i++) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const particle = particles[i]!;
        if (!particle.isActive) {
            continue;
        }

        const density = reduceEachNeighbors(
            environment,
            0,
            environment.grid,
            particle,
            addDensityOfNeighbors
        );
        particle.density = density;
        particle.pressure = Math.max(
            stiffness * (particle.density - density0),
            0
        );
    }
}

function updateForces(
    environment: ParticleEnvironment,
    particles: readonly Particle[]
): void {
    const temp = {
        environment,
        force: newZeroVector2(),
        wp: newZeroVector2(),
        dv: newZeroVector2(),
    };
    for (let i = 0, length = particles.length; i < length; i++) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const particle = particles[i]!;
        if (!particle.isActive) {
            continue;
        }

        // TODO: particle.force を使う
        const { force } = temp;
        set(force, 0, 0);

        reduceEachNeighbors(
            temp,
            undefined,
            environment.grid,
            particle,
            (temp, _, other, rv, particle) => {
                if (particle === other) {
                    return undefined;
                }
                const {
                    force,
                    environment: { h, gradient },
                } = temp;

                const r = magnitude(rv);

                // 圧力
                const wp = gradient(rv, temp.wp);
                const fp =
                    -other.mass *
                    (other.pressure / (other.density * other.density) +
                        particle.pressure /
                            (particle.density * particle.density));
                set(
                    force,
                    getX(force) + getX(wp) * fp,
                    getY(force) + getY(wp) * fp
                );

                // 粘度
                const r2 = r * r + 0.01 * h * h;
                const dv = sub(particle.velocity, other.velocity, temp.dv);
                const fv =
                    (((other.mass * (particle.viscosity + other.viscosity)) /
                        (other.density * particle.density)) *
                        dot(rv, wp)) /
                    r2;
                set(
                    force,
                    getX(force) + fv * getX(dv),
                    getY(force) + fv * getY(dv)
                );
            }
        );

        // 重力
        add(force, environment.gravity, force);

        set(particle.force, getX(force), getY(force));
    }
}

function registerParticleToCell(
    { grid }: ParticleEnvironment,
    particles: readonly Particle[]
) {
    clearGrid(grid);
    addParticlesToGrid(grid, particles);
}

export function updateParticles(
    environment: ParticleEnvironment,
    particles: readonly Particle[]
) {
    registerParticleToCell(environment, particles);
    updateDensityAndPressures(environment, particles);
    updateForces(environment, particles);

    for (let i = 0, length = particles.length; i < length; i++) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const particle = particles[i]!;
        if (!particle.isActive) {
            continue;
        }
        const { velocity, velocity2, force, position } = particle;

        set(
            velocity2,
            getX(velocity2) + getX(force) * environment.timeDelta,
            getY(velocity2) + getY(force) * environment.timeDelta
        );
        set(
            position,
            getX(position) + getX(velocity2) * environment.timeDelta,
            getY(position) + getY(velocity2) * environment.timeDelta
        );
        set(
            velocity,
            getX(velocity2) + 0.5 * getX(force) * environment.timeDelta,
            getY(velocity2) + 0.5 * getY(force) * environment.timeDelta
        );

        // 端と端がつながっている世界
        set(
            position,
            modulo(getX(position), environment.grid.width),
            modulo(getY(position), environment.grid.height)
        );
    }
}

/**
 * @param width [m]
 * @param height [m]
 */
export function createEnvironment(
    width = 0.9,
    height = 0.9
): ParticleEnvironment {
    /** [m] 粒子の大きさ */
    const particleSize = 0.01;
    const h = particleSize * 1.5;
    const stiffness = 100;
    const density0 = 1000;
    const viscosity = 1;
    /** 粒子の質量 */
    const massParticle = particleSize * particleSize * density0;
    const { kernel, gradient } = derivePoly6Kernel(h);
    /** 重力加速度 */
    const gravity = newVector2(0, -9.8);
    const grid = newGrid(width, height, h);
    const timeDelta = 0.001;

    return {
        particleSize,
        initialMass: massParticle,
        initialViscosity: viscosity,
        h,
        grid,
        density0,
        stiffness,
        gravity,
        timeDelta,
        kernel,
        gradient,
    };
}

export function spawnParticlesInBound(
    environment: ParticleEnvironment,
    particles: Particle[],
    bound: ReadonlyBound
) {
    const { particleSize } = environment;

    const countX = Math.round(getWidth(bound) / particleSize);
    const countY = Math.round(getHeight(bound) / particleSize);
    for (let i = 0; i < countX; i++) {
        for (let j = 0; j < countY; j++) {
            const x = getLeft(bound) + (i + 0.5) * particleSize;
            const y = getBottom(bound) + (j + 0.5) * particleSize;
            const particle = newParticle(environment, x, y);
            particles.push(particle);
        }
    }
}
