import { describe, expect, it } from "vitest";

import { createStyles } from "../src/state/style";
import { resolveInitialValues } from "../src/state/utils";

// The SSR-critical path: <Motion> renders `initial` values as inline styles so
// the server markup matches the pre-animation state (no flash on hydration).
describe("initial style resolution (SSR path)", () => {
  it("resolves the `initial` variant into latest values", () => {
    const values = resolveInitialValues({
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
    });
    expect(values).toMatchObject({ opacity: 0, y: 20 });
  });

  it("converts transform shorthands into a transform string", () => {
    const style = createStyles({ opacity: 0, y: 20 });
    expect(style).toMatchObject({ opacity: 0 });
    expect(style?.transform).toContain("translateY(20px)");
  });

  it("returns null when there are no style values to apply", () => {
    expect(createStyles({})).toBeNull();
  });
});
