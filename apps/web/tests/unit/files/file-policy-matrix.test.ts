import {
  makeActor,
  makeArtifact,
  type RolePolicyCase,
} from "@tests/support/files/policy-fixtures";
import { describe, expect, it } from "vitest";

import { checkArtifactPolicy } from "~/server/files/policy";
import type { ArtifactType } from "~/server/files/types";
import { asBranchId, asUserId } from "~/server/shared/ids";

function runRoleMatrix(input: {
  action: "artifact.request" | "artifact.audit.read";
  cases: RolePolicyCase[];
  requestArtifactType?: ArtifactType;
}) {
  for (const { role, ok } of input.cases) {
    it(`${input.action} ${ok ? "allows" : "denies"} ${role}`, () => {
      const result = checkArtifactPolicy(
        makeActor({ role }),
        null,
        input.action,
        input.requestArtifactType,
      );
      expect(result.ok).toBe(ok);
    });
  }
}

describe("checkArtifactPolicy role matrix", () => {
  describe("artifact.request", () => {
    runRoleMatrix({
      action: "artifact.request",
      cases: [
        { role: "admin", ok: true },
        { role: "back_office", ok: true },
        { role: "supervisor", ok: false },
        { role: "executive", ok: false },
      ],
      requestArtifactType: "records_export",
    });

    it("allows executive special cases for sale_proof and rate_revision_file", () => {
      const saleProof = checkArtifactPolicy(
        makeActor({ role: "executive" }),
        null,
        "artifact.request",
        "sale_proof",
      );
      const revisionFile = checkArtifactPolicy(
        makeActor({ role: "executive" }),
        null,
        "artifact.request",
        "rate_revision_file",
      );

      expect(saleProof.ok).toBe(true);
      expect(revisionFile.ok).toBe(true);
    });

    it("does not let the executive request an unsigned adenda (readable, not owned)", () => {
      const result = checkArtifactPolicy(
        makeActor({ role: "executive" }),
        null,
        "artifact.request",
        "addendum_unsigned",
      );

      expect(result.ok).toBe(false);
    });
  });

  describe("artifact.audit.read", () => {
    runRoleMatrix({
      action: "artifact.audit.read",
      cases: [
        { role: "supervisor", ok: true },
        { role: "sales_manager", ok: true },
        { role: "back_office", ok: false },
        { role: "executive", ok: false },
      ],
    });
  });

  describe("artifact.upload", () => {
    const uploadAllowedCases: Array<{
      artifact: ReturnType<typeof makeArtifact>;
      actor: ReturnType<typeof makeActor>;
    }> = [
      {
        artifact: makeArtifact({
          artifactType: "integration_import",
          direction: "upload",
          status: "requested",
          requestedByUserId: asUserId("10"),
        }),
        actor: makeActor({ role: "back_office", userId: asUserId("10") }),
      },
      {
        artifact: makeArtifact({
          artifactType: "sale_proof",
          direction: "upload",
          status: "requested",
          requestedByUserId: asUserId("10"),
        }),
        actor: makeActor({ role: "executive", userId: asUserId("10") }),
      },
    ];

    const uploadDeniedCases: Array<{
      artifact: ReturnType<typeof makeArtifact>;
      actor: ReturnType<typeof makeActor>;
      code: string;
    }> = [
      {
        artifact: makeArtifact({
          artifactType: "records_export",
          direction: "download",
          status: "requested",
        }),
        actor: makeActor({ role: "back_office" }),
        code: "artifact_not_uploadable",
      },
      {
        artifact: makeArtifact({
          artifactType: "integration_import",
          direction: "upload",
          status: "ready",
        }),
        actor: makeActor({ role: "back_office" }),
        code: "artifact_upload_wrong_status",
      },
    ];

    it.each(uploadAllowedCases)(
      "allows valid upload case",
      ({ actor, artifact }) => {
        const result = checkArtifactPolicy(actor, artifact, "artifact.upload");
        expect(result.ok).toBe(true);
      },
    );

    it.each(uploadDeniedCases)(
      "denies invalid upload case",
      ({ actor, artifact, code }) => {
        const result = checkArtifactPolicy(actor, artifact, "artifact.upload");
        expect(result.ok).toBe(false);
        if (result.ok) throw new Error("Expected failure");
        expect(result.error.code).toBe(code);
      },
    );
  });

  describe("artifact.read", () => {
    it("allows back_office in matching scope", () => {
      const result = checkArtifactPolicy(
        makeActor({ role: "back_office", branchId: asBranchId("1") }),
        makeArtifact({ scopeBranchId: asBranchId("1") }),
        "artifact.read",
      );
      expect(result.ok).toBe(true);
    });

    it("allows executive special-case read for sale_proof they own", () => {
      const result = checkArtifactPolicy(
        makeActor({ role: "executive", userId: asUserId("10") }),
        makeArtifact({
          artifactType: "sale_proof",
          requestedByUserId: asUserId("10"),
        }),
        "artifact.read",
      );
      expect(result.ok).toBe(true);
    });

    // Regression: the executive must download the unsigned adenda that back
    // office generated (AWAITING_SIGNATURE step) to send it to the client. They
    // are not the uploader, so the same-branch scope check is what allows it.
    it("allows executive to read the unsigned adenda back office generated on their branch", () => {
      const result = checkArtifactPolicy(
        makeActor({
          role: "executive",
          userId: asUserId("44"),
          branchId: asBranchId("4"),
        }),
        makeArtifact({
          artifactType: "addendum_unsigned",
          direction: "upload",
          requestedByUserId: asUserId("30"),
          scopeBranchId: asBranchId("4"),
        }),
        "artifact.read",
      );
      expect(result.ok).toBe(true);
    });

    it("denies executive reading an unsigned adenda scoped to another branch", () => {
      const result = checkArtifactPolicy(
        makeActor({
          role: "executive",
          userId: asUserId("44"),
          branchId: asBranchId("4"),
        }),
        makeArtifact({
          artifactType: "addendum_unsigned",
          direction: "upload",
          requestedByUserId: asUserId("30"),
          scopeBranchId: asBranchId("7"),
        }),
        "artifact.read",
      );
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("Expected failure");
      expect(result.error.code).toBe("artifact_scope_mismatch");
    });

    it("still denies executive reading a back-office-only document (transactions report)", () => {
      const result = checkArtifactPolicy(
        makeActor({
          role: "executive",
          userId: asUserId("44"),
          branchId: asBranchId("4"),
        }),
        makeArtifact({
          artifactType: "transactions_report",
          direction: "upload",
          requestedByUserId: asUserId("30"),
          scopeBranchId: asBranchId("4"),
        }),
        "artifact.read",
      );
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("Expected failure");
      expect(result.error.code).toBe("artifact_read_forbidden");
    });

    it("denies branch mismatch for non-elevated actor", () => {
      const result = checkArtifactPolicy(
        makeActor({
          role: "back_office",
          branchId: asBranchId("1"),
          userId: asUserId("11"),
        }),
        makeArtifact({ scopeBranchId: asBranchId("99") }),
        "artifact.read",
      );
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("Expected failure");
      expect(result.error.code).toBe("artifact_scope_mismatch");
    });

    it("denies revoked artifact", () => {
      const result = checkArtifactPolicy(
        makeActor({ role: "back_office" }),
        makeArtifact({ status: "revoked" }),
        "artifact.read",
      );
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("Expected failure");
      expect(result.error.code).toBe("artifact_unavailable");
    });
  });
});
