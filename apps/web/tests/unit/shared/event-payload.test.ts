import { describe, expect, it } from "vitest";

import {
  diffFields,
  parseFieldChanges,
  serializeEventPayload,
  serializeFieldChanges,
  type FieldChange,
} from "~/contracts/events";

describe("field changes", () => {
  it("returns only changed keys with typed values", () => {
    expect(
      diffFields(
        { enabled: false, count: 2, label: "same" },
        { enabled: true, count: 3, label: "same" },
        ["enabled", "count", "label"],
      ),
    ).toEqual([
      { field: "enabled", from: false, to: true },
      { field: "count", from: 2, to: 3 },
    ]);
  });

  it("returns no changes for equal snapshots", () => {
    expect(
      diffFields({ status: "OPEN" }, { status: "OPEN" }, ["status"]),
    ).toEqual([]);
  });
});

describe("event payload serialization", () => {
  it("serializes undefined or null payload as null", () => {
    expect(serializeEventPayload()).toBeNull();
    expect(serializeEventPayload(null)).toBeNull();
  });

  it("serializes falsey but valid values", () => {
    expect(serializeEventPayload(false)).toBe("false");
    expect(serializeEventPayload(0)).toBe("0");
    expect(serializeEventPayload("")).toBe('""');
  });
});

describe("field change serialization", () => {
  it("serializes empty changes as null", () => {
    expect(serializeFieldChanges([])).toBeNull();
  });

  it("round-trips structured field changes", () => {
    const changes: FieldChange[] = [
      { field: "status", from: "DISPONIBLE", to: "CARTERIZADO" },
      { field: "proposedDebitRate", from: 1.2, to: null },
    ];
    expect(parseFieldChanges(serializeFieldChanges(changes))).toEqual(changes);
  });

  it("parses null and malformed input as empty", () => {
    expect(parseFieldChanges(null)).toEqual([]);
    expect(parseFieldChanges("not json")).toEqual([]);
  });
});
