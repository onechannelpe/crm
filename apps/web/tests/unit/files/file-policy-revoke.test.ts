import { describe, expect, it } from "vitest";

import { checkArtifactPolicy } from "~/server/files/policy";

import { makeActor, makeArtifact } from "@tests/support/files/policy-fixtures";

describe("checkArtifactPolicy artifact.revoke", () => {
  it("allows revoke for admin on non-terminal artifact", () => {
    const result = checkArtifactPolicy(
      makeActor({ role: "admin" }),
      makeArtifact({ status: "ready" }),
      "artifact.revoke",
    );

    expect(result.ok).toBe(true);
  });

  it("denies revoke for unauthorized role", () => {
    const result = checkArtifactPolicy(
      makeActor({ role: "back_office" }),
      makeArtifact({ status: "ready" }),
      "artifact.revoke",
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    expect(result.error.code).toBe("artifact_revoke_forbidden");
  });

  it("denies revoke when artifact is already terminal", () => {
    const revoked = checkArtifactPolicy(
      makeActor({ role: "admin" }),
      makeArtifact({ status: "revoked" }),
      "artifact.revoke",
    );
    const expired = checkArtifactPolicy(
      makeActor({ role: "superuser" }),
      makeArtifact({ status: "expired" }),
      "artifact.revoke",
    );

    expect(revoked.ok).toBe(false);
    expect(expired.ok).toBe(false);
    if (revoked.ok || expired.ok) throw new Error("Expected failures");
    expect(revoked.error.code).toBe("artifact_already_terminal");
    expect(expired.error.code).toBe("artifact_already_terminal");
  });
});
