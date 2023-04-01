import { mainSpec, workerSpec } from "./channel-specs";
import {
    type SpecToModule,
    dispatchMessage,
    portToModule,
} from "./worker-module";
import { Rectangle, createParticleManager } from "./simulation";
import { error } from "./standard-extensions";
import { type Vector2, newZeroVector2 } from "./vector2";

interface Camera {
    /** [m] */
    centerX: number;
    /** [m] */
    centerY: number;
    /**
     * [m]
     * 正方形の画面の長さが、仮想世界の何メートルかを表す。
     * 数値が大きいほど広い範囲が見える。
     */
    meterPerViewPortLength: number;
}
interface World {
    /** [milliseconds] */
    now: DOMHighResTimeStamp;
    context: OffscreenCanvasRenderingContext2D;
    camera: Camera;
}
function createFpsCounter(mainModule: SpecToModule<typeof mainSpec>) {
    let frameCount = 0;
    let previousFrameCount: number | null = null;
    let previousTime = 0;
    function update(world: World) {
        const { now } = world;
        if (1000 <= now - previousTime) {
            if (previousFrameCount !== frameCount) {
                mainModule.fpsUpdated(frameCount);
            }
            previousFrameCount = frameCount;
            previousTime = now;
            frameCount = 0;
        }
        frameCount++;
    }
    return { update };
}
function getCanvasPxPerMeter({ context, camera }: World) {
    const size = context.canvas.width;
    return size / camera.meterPerViewPortLength;
}
function worldPointToCanvasPoint(
    { context, camera }: World,
    worldX: number,
    worldY: number,
    result: Vector2
) {
    /** [px] */
    const size = context.canvas.width;
    /** [px/m] */
    const pxPerMeter = size / camera.meterPerViewPortLength;
    const offset = size * 0.5;
    result[0] = (worldX - camera.centerX) * pxPerMeter + offset;
    result[1] = (worldY - camera.centerY) * -pxPerMeter + offset;
    return result;
}
function canvasPointToWorldPoint(
    { context, camera }: World,
    canvasX: number,
    canvasY: number,
    result = newZeroVector2()
) {
    /** [px] */
    const size = context.canvas.width;
    /** [px/m] */
    const pxPerMeter = size / camera.meterPerViewPortLength;
    const offset = size * 0.5;
    result[0] = (canvasX - offset) / pxPerMeter + camera.centerX;
    result[1] = (canvasY - offset) / -pxPerMeter + camera.centerY;
    return result;
}
function createReporter() {
    const entries: unknown[] = [];
    function clear() {
        entries.length = 0;
    }
    function display() {
        const lines: string[] = [];
        const labelToStartTime = new Map<string, number>();
        for (let i = 0; i < entries.length; ) {
            const entry = entries[i++];
            switch (entry) {
                case log: {
                    const message = entries[i++] as unknown;
                    lines.push(String(message));
                    break;
                }
                case time: {
                    const label = entries[i++] as string;
                    const now = entries[i++] as number;
                    labelToStartTime.set(label, now);
                    break;
                }
                case timeEnd: {
                    const label = entries[i++] as string;
                    const now = entries[i++] as number;

                    const startTime = labelToStartTime.get(label);
                    if (startTime === undefined) {
                        lines.push(`info: Timer '${label}' does not exist`);
                    } else {
                        lines.push(`${label}: ${now - startTime}ms`);
                        labelToStartTime.delete(label);
                    }
                    break;
                }
                default: {
                    lines.push(
                        `internal error: ${
                            typeof entry === "function" ? entry.name : entry
                        }`
                    );
                    break;
                }
            }
        }
        return lines.join("\n");
    }
    function log(message: string) {
        entries.push(log, message);
    }
    function time(label: string) {
        entries.push(time, label, performance.now());
    }
    function timeEnd(label: string) {
        entries.push(timeEnd, label, performance.now());
    }
    return {
        log,
        time,
        timeEnd,
        clear,
        display,
    };
}

const mouse = {
    clicked: false,
    canvasX: 0,
    canvasY: 0,
};
let wrapperOffsetWidth = 0;
let wrapperOffsetHeight = 0;

const mainModule = portToModule(self, mainSpec);

function initialize(canvas: OffscreenCanvas) {
    wrapperOffsetWidth = canvas.height;
    wrapperOffsetHeight = canvas.width;

    const context = (canvas.getContext("2d") ??
        error`キャンバスに描画できません`) as OffscreenCanvasRenderingContext2D;

    const camera: Camera = {
        centerX: 0.5,
        centerY: 0.5,
        meterPerViewPortLength: 1,
    };
    const world: World = {
        camera,
        context,
        now: performance.now(),
    };

    const fpsCounter = createFpsCounter(mainModule);

    const timeScale = 5;
    const reporter = createReporter();
    const manager = createParticleManager({ reporter });
    const offset = 0.1;
    const regionInner = new Rectangle(offset, offset, 0.6, 0.4);
    const regionInitial = new Rectangle(offset, offset, 0.2, 0.4);
    const thicknessWall = manager.particleSize * 4;
    // fluid particle
    manager.spawnParticlesInRectangle(regionInitial, { kinematic: false });

    // wall particle
    const width = regionInner.width + 2 * thicknessWall;
    const regionWallBottom = new Rectangle(
        offset - thicknessWall,
        offset - thicknessWall,
        width,
        thicknessWall
    );
    manager.spawnParticlesInRectangle(regionWallBottom, {
        kinematic: true,
    });

    const regionWallLeft = new Rectangle(
        offset - thicknessWall,
        offset,
        thicknessWall,
        regionInner.height
    );
    manager.spawnParticlesInRectangle(regionWallLeft, { kinematic: true });

    const regionWallRight = new Rectangle(
        regionInner.right,
        offset,
        thicknessWall,
        regionInner.height
    );
    manager.spawnParticlesInRectangle(regionWallRight, { kinematic: true });

    /** [ms] */
    const spawnSpan = 100;
    let lastSpawnTime = 0;
    function spawnIfClicked() {
        const { now } = world;
        if (!mouse.clicked || now < lastSpawnTime + spawnSpan) {
            return;
        }

        lastSpawnTime = now;
        const [x, y] = canvasPointToWorldPoint(
            world,
            mouse.canvasX,
            mouse.canvasY
        );
        manager.spawnParticlesInRectangle(
            new Rectangle(x, y, manager.particleSize, manager.particleSize),
            { kinematic: false }
        );
    }
    function renderReporterMessages() {
        const message = reporter.display();
        reporter.clear();

        context.fillStyle = "white";
        const lines = message.split("\n");
        let baseLineY = 0;
        for (const line of lines) {
            const metrics = context.measureText(line);
            baseLineY += metrics.fontBoundingBoxAscent;
            context.fillText(line, 0, baseLineY);
        }
    }
    const renderParticles_canvasPoint = newZeroVector2();
    function renderParticles() {
        const canvasPxPerMeter = getCanvasPxPerMeter(world);
        for (const {
            active,
            position: [worldX, worldY],
            kinematic,
        } of manager.getParticles()) {
            if (!active) {
                continue;
            }
            const [canvasX, canvasY] = worldPointToCanvasPoint(
                world,
                worldX,
                worldY,
                renderParticles_canvasPoint
            );
            const radius = manager.particleSize * canvasPxPerMeter * 0.5;

            context.beginPath();
            context.fillStyle = kinematic
                ? "rgba(45, 45, 45, 0.5)"
                : "rgba(173, 216, 230, 0.5)";
            context.arc(canvasX, canvasY, radius, 0, Math.PI * 2);
            context.fill();
        }
    }
    function render(now: DOMHighResTimeStamp) {
        requestAnimationFrame(render);
        world.now = now;

        fpsCounter.update(world);

        const size = Math.min(wrapperOffsetWidth, wrapperOffsetHeight);

        const canvasWidth = (canvas.width = size);
        const canvasHeight = (canvas.height = size);

        context.clearRect(0, 0, canvasWidth, canvasHeight);
        context.fillStyle = "black";
        context.fillRect(0, 0, canvasWidth, canvasHeight);

        spawnIfClicked();

        context.fillStyle = "red";
        context.beginPath();
        context.ellipse(
            mouse.canvasX,
            mouse.canvasY,
            10,
            10,
            0,
            0,
            Math.PI * 2
        );
        context.fill();

        reporter.time("drawing");
        renderParticles();
        reporter.timeEnd("drawing");

        for (let i = 0; i < timeScale; i++) {
            manager.update();
        }

        renderReporterMessages();
    }

    requestAnimationFrame(render);
}

dispatchMessage(self as DedicatedWorkerGlobalScope, workerSpec, {
    initialize,
    mouseDown() {
        mouse.clicked = true;
    },
    mouseUp() {
        mouse.clicked = false;
    },
    mouseMove(offsetX, offsetY) {
        mouse.canvasX = offsetX;
        mouse.canvasY = offsetY;
    },
    canvasWrapperResized(offsetWidth, offsetHeight) {
        wrapperOffsetWidth = offsetWidth;
        wrapperOffsetHeight = offsetHeight;
    },
});
