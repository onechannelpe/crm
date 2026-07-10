import { render } from "@solidjs/testing-library";
import { Show, createSignal } from "solid-js";
import { afterEach, describe, expect, it } from "vitest";

import { Motion, Presence, mountedStates } from "../src";

describe("<Motion>", () => {
  afterEach(() => document.body.replaceChildren());

  it("renders the tag with pass-through attrs and children", () => {
    const { container } = render(() => (
      <Motion.div class="card" data-x="1">
        hello
      </Motion.div>
    ));
    const el = container.querySelector("div.card") as HTMLElement;
    expect(el).toBeTruthy();
    expect(el.getAttribute("data-x")).toBe("1");
    expect(el.textContent).toBe("hello");
  });

  it("applies the `initial` variant as inline style before animating", () => {
    const { container } = render(() => (
      <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        x
      </Motion.div>
    ));
    const el = container.querySelector("div") as HTMLElement;
    expect(el.style.opacity).toBe("0");
  });

  it("registers the mounted element in mountedStates", () => {
    const { container } = render(() => <Motion.div>y</Motion.div>);
    const el = container.querySelector("div") as HTMLElement;
    expect(mountedStates.has(el)).toBe(true);
  });
});

describe("<Presence>", () => {
  afterEach(() => document.body.replaceChildren());

  it("renders present children", () => {
    const [shown] = createSignal(true);
    const { container } = render(() => (
      <Presence>
        <Show when={shown()}>
          <Motion.div data-probe="p" exit={{ opacity: 0 }}>
            p
          </Motion.div>
        </Show>
      </Presence>
    ));
    expect(container.querySelector('[data-probe="p"]')).toBeTruthy();
  });
});
