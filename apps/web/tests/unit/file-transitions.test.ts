import { describe, expect, it } from "vitest";

import {
  assertValidTransition,
  isValidTransition,
} from "~/server/files/transitions";
import type { ArtifactStatus } from "~/server/files/types";

const ALL_STATUSES: ArtifactStatus[] = [
  "requested",
  "receiving",
  "validating",
  "scanning",
  "ready",
  "processing",
  "completed",
  "failed",
  "expired",
  "revoked",
];

describe("isValidTransition", () => {
  it("allows requested -> receiving (upload begin)", () => {
    expect(isValidTransition("requested", "receiving")).toBe(true);
  });

  it("allows requested -> ready (sync export)", () => {
    expect(isValidTransition("requested", "ready")).toBe(true);
  });

  it("allows requested -> failed", () => {
    expect(isValidTransition("requested", "failed")).toBe(true);
  });

  it("allows requested -> revoked", () => {
    expect(isValidTransition("requested", "revoked")).toBe(true);
  });

  it("allows receiving -> validating", () => {
    expect(isValidTransition("receiving", "validating")).toBe(true);
  });

  it("allows validating -> scanning", () => {
    expect(isValidTransition("validating", "scanning")).toBe(true);
  });

  it("allows scanning -> ready", () => {
    expect(isValidTransition("scanning", "ready")).toBe(true);
  });

  it("allows ready -> processing", () => {
    expect(isValidTransition("ready", "processing")).toBe(true);
  });

  it("allows ready -> completed", () => {
    expect(isValidTransition("ready", "completed")).toBe(true);
  });

  it("allows ready -> expired", () => {
    expect(isValidTransition("ready", "expired")).toBe(true);
  });

  it("allows ready -> revoked", () => {
    expect(isValidTransition("ready", "revoked")).toBe(true);
  });

  it("allows processing -> completed", () => {
    expect(isValidTransition("processing", "completed")).toBe(true);
  });

  it("allows processing -> failed", () => {
    expect(isValidTransition("processing", "failed")).toBe(true);
  });

  it("allows completed -> expired", () => {
    expect(isValidTransition("completed", "expired")).toBe(true);
  });

  it("blocks forward skipping from requested to processing", () => {
    expect(isValidTransition("requested", "processing")).toBe(false);
  });

  it("blocks backward transitions from completed", () => {
    expect(isValidTransition("completed", "requested")).toBe(false);
    expect(isValidTransition("completed", "ready")).toBe(false);
  });

  it("blocks all transitions from terminal states failed/revoked", () => {
    for (const to of ALL_STATUSES) {
      expect(isValidTransition("failed", to)).toBe(false);
      expect(isValidTransition("revoked", to)).toBe(false);
    }
  });

  it("blocks all transitions from expired", () => {
    for (const to of ALL_STATUSES) {
      expect(isValidTransition("expired", to)).toBe(false);
    }
  });

  it("blocks receiving -> ready (must go through validating)", () => {
    expect(isValidTransition("receiving", "ready")).toBe(false);
  });
});

describe("assertValidTransition", () => {
  it("does not throw for valid transitions", () => {
    expect(() => assertValidTransition("requested", "receiving")).not.toThrow();
    expect(() => assertValidTransition("ready", "completed")).not.toThrow();
  });

  it("throws for invalid transitions", () => {
    expect(() => assertValidTransition("completed", "requested")).toThrow(
      "Invalid artifact status transition",
    );
    expect(() => assertValidTransition("failed", "ready")).toThrow(
      "Invalid artifact status transition",
    );
  });
});
