import * as fc from "fast-check";
import { describe, it } from "vitest";

import { computeNeededAssignments } from "~/server/lead-workflow/domain";

describe("computeNeededAssignments", () => {
  it("result is always >= 0", () => {
    fc.assert(
      fc.property(fc.nat(), fc.nat(), (activeAssignments, bufferTarget) => {
        return computeNeededAssignments(activeAssignments, bufferTarget) >= 0;
      }),
    );
  });

  it("result is always <= bufferTarget", () => {
    fc.assert(
      fc.property(fc.nat(), fc.nat(), (activeAssignments, bufferTarget) => {
        return computeNeededAssignments(activeAssignments, bufferTarget) <= bufferTarget;
      }),
    );
  });

  it("returns 0 when active assignments meet or exceed buffer target", () => {
    fc.assert(
      fc.property(fc.nat(100), (bufferTarget) => {
        const active = bufferTarget + fc.sample(fc.nat(50), 1)[0]!;
        return computeNeededAssignments(active, bufferTarget) === 0;
      }),
    );
  });

  it("returns bufferTarget - active when active is below target", () => {
    fc.assert(
      fc.property(
        fc.nat(100).chain((bufferTarget) =>
          fc.nat(bufferTarget).map((active) => ({ active, bufferTarget })),
        ),
        ({ active, bufferTarget }) => {
          return computeNeededAssignments(active, bufferTarget) === bufferTarget - active;
        },
      ),
    );
  });
});
