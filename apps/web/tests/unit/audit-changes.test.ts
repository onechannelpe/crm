import { describe, expect, it } from "vitest";

import {
  allSessionsRevokedChanges,
  serializeAuditChanges,
  sessionRevokedByAdminChanges,
} from "../../src/lib/contracts/audit";
import { asUserId } from "../../src/server/shared/ids";

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
    expect(
      sessionRevokedByAdminChanges(
        "s-1",
        asUserId("00000000-0000-0000-0000-000000000009"),
      ),
    ).toEqual({
      sessionId: "s-1",
      revokedBy: asUserId("00000000-0000-0000-0000-000000000009"),
    });
    expect(
      allSessionsRevokedChanges(
        asUserId("00000000-0000-0000-0000-000000000009"),
      ),
    ).toEqual({ revokedBy: asUserId("00000000-0000-0000-0000-000000000009") });
  });
});
