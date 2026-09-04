import { render } from "@solidjs/testing-library";
import { createSignal, flush } from "solid-js";
import { afterEach, describe, expect, it } from "vitest";

import { AnimatePresence, MotionConfig, motion } from "../src";

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Supplies layout measurements because jsdom does not perform layout. */
function stubBox(element: HTMLElement, box: () => Box) {
  element.getBoundingClientRect = () => {
    const { left, top, width, height } = box();
    return {
      x: left,
      y: top,
      left,
      top,
      right: left + width,
      bottom: top + height,
      width,
      height,
      toJSON: () => ({}),
    } as DOMRect;
  };
}

/** Returns the element's laid-out box after its projection transform. */
function projectedBox(element: HTMLElement): Box {
  const { left, top, width, height } = element.getBoundingClientRect();
  const transform = element.style.transform;

  const translate = /translate3d\((-?[\d.]+)px, (-?[\d.]+)px/.exec(transform);
  const scale = /scale\((-?[\d.]+), (-?[\d.]+)\)/.exec(transform);
  const origin = /(-?[\d.]+)% (-?[\d.]+)%/.exec(element.style.transformOrigin);

  const [scaleX, scaleY] = scale
    ? [Number(scale[1]), Number(scale[2])]
    : [1, 1];
  const [shiftX, shiftY] = translate
    ? [Number(translate[1]), Number(translate[2])]
    : [0, 0];
  const [originX, originY] = origin
    ? [Number(origin[1]) / 100, Number(origin[2]) / 100]
    : [0.5, 0.5];

  const anchorX = left + originX * width;
  const anchorY = top + originY * height;

  return {
    left: anchorX + (left - anchorX) * scaleX + shiftX,
    top: anchorY + (top - anchorY) * scaleY + shiftY,
    width: width * scaleX,
    height: height * scaleY,
  };
}

/** Samples projected boxes across an animation. */
async function sample(element: HTMLElement, duration: number): Promise<Box[]> {
  const boxes: Box[] = [];
  const deadline = Date.now() + duration;
  while (Date.now() < deadline) {
    boxes.push(projectedBox(element));
    await new Promise((resolve) => setTimeout(resolve, 16));
  }
  return boxes;
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 500));

const between = (value: number, low: number, high: number) =>
  value > low && value < high;

describe("layout", () => {
  afterEach(() => document.body.replaceChildren());

  it("interpolates the box between where the element was and where the render put it", async () => {
    const [wide, setWide] = createSignal(false);

    const { container } = render(() => (
      // The container's class moves the child without changing the child's DOM.
      <div class={wide() ? "row wide" : "row"}>
        <motion.div class="box" layout transition={{ duration: 0.4 }} />
      </div>
    ));

    const element = container.querySelector(".box") as HTMLElement;
    const collapsed = { left: 0, top: 0, width: 100, height: 100 };
    const expanded = { left: 200, top: 0, width: 300, height: 100 };
    stubBox(element, () => (wide() ? expanded : collapsed));

    // Establish the initial layout baseline.
    await new Promise((resolve) => setTimeout(resolve, 50));

    setWide(true);
    flush();

    const boxes = await sample(element, 250);
    // The element must occupy intermediate position and size during the flight.
    const midpoints = boxes.filter(
      (box) =>
        between(box.left, collapsed.left, expanded.left) &&
        between(box.width, collapsed.width, expanded.width),
    );
    expect(midpoints.length).toBeGreaterThan(3);

    const first = midpoints[0];
    const last = midpoints[midpoints.length - 1];
    expect(last.left).toBeGreaterThan(first.left);
    expect(last.width).toBeGreaterThan(first.width);

    await settle();
    expect(projectedBox(element)).toEqual(expanded);
  });

  it("moves without resizing when only the position is asked for", async () => {
    const [wide, setWide] = createSignal(false);

    const { container } = render(() => (
      <div class={wide() ? "row wide" : "row"}>
        <motion.div
          class="box"
          layout="position"
          transition={{ duration: 0.4 }}
        />
      </div>
    ));

    const element = container.querySelector(".box") as HTMLElement;
    const collapsed = { left: 0, top: 0, width: 100, height: 100 };
    const expanded = { left: 200, top: 0, width: 300, height: 100 };
    stubBox(element, () => (wide() ? expanded : collapsed));

    await new Promise((resolve) => setTimeout(resolve, 50));

    setWide(true);
    flush();

    const boxes = await sample(element, 250);
    const moving = boxes.filter((box) =>
      between(box.left, collapsed.left, expanded.left),
    );
    expect(moving.length).toBeGreaterThan(3);

    // Position-only projection keeps the destination size throughout the flight.
    for (const box of boxes) expect(box.width).toBe(expanded.width);

    await settle();
    expect(projectedBox(element)).toEqual(expanded);
  });

  it("lands the layout change without moving when animations are switched off", async () => {
    const [wide, setWide] = createSignal(false);

    const { container } = render(() => (
      <MotionConfig skipAnimations>
        <div class={wide() ? "row wide" : "row"}>
          <motion.div class="box" layout transition={{ duration: 0.4 }} />
        </div>
      </MotionConfig>
    ));

    const element = container.querySelector(".box") as HTMLElement;
    const collapsed = { left: 0, top: 0, width: 100, height: 100 };
    const expanded = { left: 200, top: 0, width: 300, height: 100 };
    stubBox(element, () => (wide() ? expanded : collapsed));

    await new Promise((resolve) => setTimeout(resolve, 50));

    setWide(true);
    flush();

    // Layout projection has its own animation path, so the off switch must reach it.
    const boxes = await sample(element, 200);
    for (const box of boxes) expect(box).toEqual(expanded);
  });

  it("leaves a running layout animation alone when the page changes elsewhere", async () => {
    const [wide, setWide] = createSignal(false);
    const [noise, setNoise] = createSignal(0);

    const { container } = render(() => (
      <div>
        <div class={wide() ? "row wide" : "row"}>
          <motion.div class="box" layout transition={{ duration: 0.4 }} />
        </div>
        <ul class="elsewhere">{noise() > 0 ? <li>noise</li> : null}</ul>
      </div>
    ));

    const element = container.querySelector(".box") as HTMLElement;
    const collapsed = { left: 0, top: 0, width: 100, height: 100 };
    const expanded = { left: 200, top: 0, width: 300, height: 100 };
    stubBox(element, () => (wide() ? expanded : collapsed));

    await new Promise((resolve) => setTimeout(resolve, 50));

    setWide(true);
    flush();
    await new Promise((resolve) => setTimeout(resolve, 60));

    // An unrelated list must not give this node a fresh destination snapshot.
    setNoise(1);
    flush();

    const boxes = await sample(element, 200);
    const midpoints = boxes.filter((box) =>
      between(box.left, collapsed.left, expanded.left),
    );
    expect(midpoints.length).toBeGreaterThan(3);

    await settle();
    expect(projectedBox(element)).toEqual(expanded);
  });

  it("carries a layoutId out of the box its counterpart occupied", async () => {
    const [open, setOpen] = createSignal(false);

    const { container } = render(() => (
      // The counterpart moves when the newcomer mounts.
      <div class={open() ? "row open" : "row"}>
        <motion.div
          class="thumb"
          layoutId="card"
          transition={{ duration: 0.4 }}
        />
        <AnimatePresence when={open()}>
          {() => (
            <motion.div
              class="full"
              layoutId="card"
              transition={{ duration: 0.4 }}
            />
          )}
        </AnimatePresence>
      </div>
    ));

    const thumbBox = { left: 0, top: 0, width: 100, height: 100 };
    const movedThumbBox = { left: 900, top: 0, width: 100, height: 100 };
    const fullBox = { left: 300, top: 200, width: 400, height: 300 };

    const thumb = container.querySelector(".thumb") as HTMLElement;
    stubBox(thumb, () => (open() ? movedThumbBox : thumbBox));
    await new Promise((resolve) => setTimeout(resolve, 50));

    setOpen(true);
    flush();
    const full = container.querySelector(".full") as HTMLElement;
    stubBox(full, () => fullBox);

    const boxes = await sample(full, 250);

    // The newcomer starts at the outgoing member's previous box.
    const [origin] = boxes.filter((box) => box.left !== fullBox.left);
    expect(origin.left).toBeLessThan(thumbBox.left + 40);
    expect(origin.width).toBeLessThan(thumbBox.width + 40);

    const travelling = boxes.filter(
      (box) =>
        between(box.left, thumbBox.left, fullBox.left) &&
        between(box.width, thumbBox.width, fullBox.width),
    );
    expect(travelling.length).toBeGreaterThan(3);

    // Both members follow the shared trajectory while they crossfade.
    const outgoing = projectedBox(thumb);
    expect(between(outgoing.left, thumbBox.left, fullBox.left)).toBe(true);
    expect(between(outgoing.width, thumbBox.width, fullBox.width)).toBe(true);

    await settle();
    expect(projectedBox(full)).toEqual(fullBox);
    expect(Number(thumb.style.opacity)).toBe(0);
  });

  it("hands the transition back to the surviving member when the other unmounts", async () => {
    const [open, setOpen] = createSignal(true);

    const { container } = render(() => (
      <div>
        <motion.div
          class="thumb"
          layoutId="card"
          transition={{ duration: 0.4 }}
        />
        <AnimatePresence when={open()}>
          {() => (
            <motion.div
              class="full"
              layoutId="card"
              transition={{ duration: 0.4 }}
            />
          )}
        </AnimatePresence>
      </div>
    ));

    const thumbBox = { left: 0, top: 0, width: 100, height: 100 };
    const fullBox = { left: 300, top: 200, width: 400, height: 300 };

    const thumb = container.querySelector(".thumb") as HTMLElement;
    const full = container.querySelector(".full") as HTMLElement;
    stubBox(thumb, () => thumbBox);
    stubBox(full, () => fullBox);

    await settle();

    setOpen(false);
    flush();

    const boxes = await sample(thumb, 250);

    // The survivor starts at the removed member's box and walks home.
    expect(boxes[0].left).toBeGreaterThan(fullBox.left - 40);
    const travelling = boxes.filter(
      (box) =>
        between(box.left, thumbBox.left, fullBox.left) &&
        between(box.width, thumbBox.width, fullBox.width),
    );
    expect(travelling.length).toBeGreaterThan(3);

    await settle();
    expect(projectedBox(thumb)).toEqual(thumbBox);
    expect(container.querySelector(".full")).toBeNull();
  });
});
