import { addStyle, waitElementLoaded } from "./document-extensions";
import { mainSpec, workerSpec } from "./module-specs";
import { connect } from "./p2p";
import classNames, { cssText } from "./styles.module.css";

function handleAsyncError(promise: Promise<void>) {
    promise.catch((error) => console.error(error));
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
    new ResizeObserver((entries) => {
        for (const entry of entries) {
            if (entry.target === canvasWrapper) {
                // const [size] = entry.borderBoxSize;
                // if (size === undefined) continue;
                // const { inlineSize: width, blockSize: height } = size;

                // console.log(`resized: ${width}, ${height}`);
                worker.canvasWrapperResized(
                    canvasWrapper.offsetWidth,
                    canvasWrapper.offsetHeight
                );
            }
        }
    }).observe(canvasWrapper);

    document.body.append(mainElement);

    const worker = connect(
        new Worker(new URL("./worker.ts", import.meta.url)),
        workerSpec,
        {
            fpsUpdated(fps) {
                fpsDisplay.innerText = `FPS: ${fps}`;
            },
        },
        mainSpec
    );

    canvas.addEventListener("pointerdown", () => worker.mouseDown());
    const onUp = () => worker.mouseUp();
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("pointerleave", onUp);
    canvas.addEventListener("pointerout", onUp);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointermove", (e) =>
        worker.mouseMove(e.offsetX, e.offsetY)
    );

    const offscreenCanvas = canvas.transferControlToOffscreen();
    await worker.initialize(offscreenCanvas, [offscreenCanvas]);
    worker.canvasWrapperResized(
        canvasWrapper.offsetWidth,
        canvasWrapper.offsetHeight
    );
}

handleAsyncError(asyncMain());
