import { expect, it } from "@jest/globals";
import { createParticleManager, Rectangle } from "./simulation";
import { getX, getY } from "./vector2";

it("simulation", () => {
    const stepCount = 180;
    const { particleSize, spawnParticlesInRectangle, update, getParticles } =
        createParticleManager();

    const offset = 0.1;
    const regionInner = new Rectangle(offset, offset, 0.6, 0.4);
    const regionInitial = new Rectangle(offset, offset, 0.2, 0.4);
    const thicknessWall = particleSize * 4;
    // fluid particle
    spawnParticlesInRectangle(regionInitial, { kinematic: false });

    // wall particle
    const width = regionInner.width + 2 * thicknessWall;
    const regionWallBottom = new Rectangle(
        offset - thicknessWall,
        offset - thicknessWall,
        width,
        thicknessWall
    );
    spawnParticlesInRectangle(regionWallBottom, { kinematic: true });

    const regionWallLeft = new Rectangle(
        offset - thicknessWall,
        offset,
        thicknessWall,
        regionInner.height
    );
    spawnParticlesInRectangle(regionWallLeft, { kinematic: true });

    const regionWallRight = new Rectangle(
        regionInner.right,
        offset,
        thicknessWall,
        regionInner.height
    );
    spawnParticlesInRectangle(regionWallRight, { kinematic: true });

    for (let i = 0; i < stepCount; i++) {
        update();
    }
    const positions: { x: number; y: number }[] = [];
    for (const { position } of getParticles()) {
        positions.push({ x: getX(position), y: getY(position) });
    }

    const particles = JSON.stringify(positions);
    expect(particles).toMatchSnapshot();
});
