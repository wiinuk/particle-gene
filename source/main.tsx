import { newBoundOfCenterExtend } from "./bound";
import { addStyle, waitElementLoaded } from "./document-extensions";
import { createParticleManager, Rectangle } from "./simulation";
import { error } from "./standard-extensions";
import classNames, { cssText } from "./styles.module.css";
import { newZeroVector2 } from "./vector2";

function handleAsyncError(promise: Promise<void>) {
    promise.catch((error) => console.error(error));
}

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
    context: CanvasRenderingContext2D;
    camera: Camera;
}
interface Visual {
    render(world: World): void;
}

function getCanvasPxPerMeter({ context, camera }: World) {
    const size = context.canvas.width;
    return size / camera.meterPerViewPortLength;
}
function worldPointToCanvasPoint(
    { context, camera }: World,
    worldX: number,
    worldY: number,
    result = newZeroVector2()
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

class TextVisual implements Visual {
    private _tempVec2 = newZeroVector2();
    constructor(
        public text: string,
        public font: string,
        public fillStyle: string,
        /** [m] */
        public x: number,
        /** [m] */
        public y: number
    ) {}
    render(world: World) {
        const { context } = world;
        context.font = this.font;
        context.textAlign = "start";
        context.textBaseline = "top";
        context.direction = "inherit";
        context.fillStyle = this.fillStyle;
        const [x, y] = worldPointToCanvasPoint(
            world,
            this.x,
            this.y,
            this._tempVec2
        );
        context.fillText(this.text, x, y);
    }
}
/*
    sensor1, sensor2, module1, output1;

    sensor1 => module1
    module1 => output1
    sensor2 => module2 => output
    input1 =>
    // 掴む
    // 食べる
    // 動く
*/
class FPSVisual implements Visual {
    frameCount = 0;
    previousFrameCount: number | null = null;
    previousTime = 0;
    constructor(public element: HTMLElement) {}
    render(world: World) {
        const { now } = world;
        if (1000 <= now - this.previousTime) {
            if (this.previousFrameCount !== this.frameCount) {
                this.element.innerText = `FPS: ${this.frameCount}`;
            }
            this.previousFrameCount = this.frameCount;
            this.previousTime = now;
            this.frameCount = 0;
        }
        this.frameCount++;
    }
}
class Renderer {
    _visuals: Visual[] = [];
}
function createRenderer() {
    return new Renderer();
}

function createReporter() {
    const log: unknown[] = [];
    function clear() {
        log.length = 0;
    }
    function display() {
        const lines: string[] = [];
        const labelToStartTime = new Map<string, number>();
        for (let i = 0; i < log.length; ) {
            const entry = log[i++];
            switch (entry) {
                case time: {
                    const label = log[i++] as string;
                    const now = log[i++] as number;
                    labelToStartTime.set(label, now);
                    break;
                }
                case timeEnd: {
                    const label = log[i++] as string;
                    const now = log[i++] as number;

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
    function time(label: string) {
        log.push(time, label, performance.now());
    }
    function timeEnd(label: string) {
        log.push(timeEnd, label, performance.now());
    }
    return {
        time,
        timeEnd,
        clear,
        display,
    };
}
async function asyncMain() {
    await waitElementLoaded();

    addStyle(cssText);

    const canvas = (
        <canvas class={classNames["main-canvas"]}></canvas>
    ) as HTMLCanvasElement;
    const canvasWrapper = (
        <div class={classNames["main-canvas-wrapper"]}>{canvas}</div>
    );
    const fpsDisplay = <div class="fps"></div>;
    const mainElement = (
        <div class={classNames["main-element"]}>
            {canvasWrapper}
            {fpsDisplay}
        </div>
    );
    document.body.append(mainElement);

    const context =
        canvas.getContext("2d") ?? error`キャンバスに描画できません`;

    const mouse = {
        clicked: false,
        canvasX: 0,
        canvasY: 0,
    };
    canvas.addEventListener("pointerdown", () => (mouse.clicked = true));
    const onUp = () => (mouse.clicked = false);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("pointerleave", onUp);
    canvas.addEventListener("pointerout", onUp);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointermove", (e) => {
        mouse.canvasX = e.offsetX;
        mouse.canvasY = e.offsetY;
    });

    const renderer = createRenderer();

    const fps = new FPSVisual(fpsDisplay);
    renderer._visuals.push(fps);

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
    manager.spawnParticlesInRectangle(regionWallBottom, { kinematic: true });

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
    }
    function render(now: DOMHighResTimeStamp) {
        requestAnimationFrame(render);
        world.now = now;

        const size = Math.min(
            canvasWrapper.offsetWidth,
            canvasWrapper.offsetHeight
        );
        const canvasWidth = (canvas.width = size);
        const canvasHeight = (canvas.height = size);
        context.clearRect(0, 0, canvasWidth, canvasHeight);
        context.fillStyle = "black";
        context.fillRect(0, 0, canvasWidth, canvasHeight);

        spawnIfClicked();

        const [mouseX, mouseY] = worldPointToCanvasPoint(world, 0.5, 0.5);
        context.fillStyle = "red";
        context.beginPath();
        context.ellipse(mouseX, mouseY, 10, 10, 0, 0, Math.PI * 2);
        context.fill();

        const visuals = renderer._visuals;
        for (let i = 0; i < visuals.length; i++) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            visuals[i]!.render(world);
        }

        reporter.time("drawing");
        const canvasPoint = newZeroVector2();
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
                canvasPoint
            );
            const radius = manager.particleSize * canvasPxPerMeter;

            context.beginPath();
            context.fillStyle = kinematic
                ? "rgba(45, 45, 45, 0.5)"
                : "rgba(173, 216, 230, 0.5)";
            context.arc(canvasX, canvasY, radius, 0, Math.PI * 2);
            context.fill();
        }
        reporter.timeEnd("drawing");

        for (let i = 0; i < timeScale; i++) {
            manager.update();
        }

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

    requestAnimationFrame(render);
}

handleAsyncError(asyncMain());
