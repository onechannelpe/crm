import { describe, expect, it } from "vitest";

import {
  allSessionsRevokedChanges,
  serializeAuditChanges,
  sessionRevokedByAdminChanges,
} from "~/contracts/audit";

describe("audit changes contracts", () => {
  it("serializes undefined changes as null", () => {
    expect(serializeAuditChanges()).toBeNull();
  });

  it("serializes falsey but valid values", () => {
    expect(serializeAuditChanges(false)).toBe("false");
    expect(serializeAuditChanges(0)).toBe("0");
    expect(serializeAuditChanges("")).toBe('""');
  });

  it("builds typed session revoke payloads", () => {
    expect(sessionRevokedByAdminChanges("s-1", 9)).toEqual({
      sessionId: "s-1",
      revokedBy: 9,
    });
    expect(allSessionsRevokedChanges(9)).toEqual({ revokedBy: 9 });
  });
});
