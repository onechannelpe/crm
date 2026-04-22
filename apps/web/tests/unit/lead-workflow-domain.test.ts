import { describe, expect, it } from "vitest";

import { computeNeededAssignments } from "~/server/contact-assignments/domain/assignment-demand";

describe("computeNeededAssignments", () => {
  it("returns 0 when active assignments meet or exceed buffer target", () => {
    expect(computeNeededAssignments(10, 10)).toBe(0);
    expect(computeNeededAssignments(15, 10)).toBe(0);
    expect(computeNeededAssignments(100, 50)).toBe(0);
  });

  it("returns bufferTarget - active when active is below target", () => {
    expect(computeNeededAssignments(5, 10)).toBe(5);
    expect(computeNeededAssignments(0, 10)).toBe(10);
    expect(computeNeededAssignments(40, 50)).toBe(10);
  });

  it("handles zero buffer target", () => {
    expect(computeNeededAssignments(0, 0)).toBe(0);
    expect(computeNeededAssignments(10, 0)).toBe(0);
  });

  it("handles large values", () => {
    expect(computeNeededAssignments(1000000, 2000000)).toBe(1000000);
    expect(computeNeededAssignments(2000000, 1000000)).toBe(0);
  });
});
