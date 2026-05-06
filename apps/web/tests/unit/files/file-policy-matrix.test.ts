import { describe, expect, it } from "vitest";

import { checkArtifactPolicy } from "~/server/files/policy";
import type { ArtifactType } from "~/server/files/types";

import { makeActor, makeArtifact, type RolePolicyCase } from "@tests/support/files/policy-fixtures";

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

    it("allows executive special cases for sale_proof and negotiation_file", () => {
      const saleProof = checkArtifactPolicy(
        makeActor({ role: "executive" }),
        null,
        "artifact.request",
        "sale_proof",
      );
      const negotiationFile = checkArtifactPolicy(
        makeActor({ role: "executive" }),
        null,
        "artifact.request",
        "negotiation_file",
      );

      expect(saleProof.ok).toBe(true);
      expect(negotiationFile.ok).toBe(true);
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
    const uploadCases: Array<{ name: string; artifact: ReturnType<typeof makeArtifact>; actor: ReturnType<typeof makeActor>; ok: boolean; code?: string }> = [
      {
        name: "allows back_office owner on integration_import requested",
        artifact: makeArtifact({ artifactType: "integration_import", direction: "upload", status: "requested", requestedByUserId: 10 }),
        actor: makeActor({ role: "back_office", userId: 10 }),
        ok: true,
      },
      {
        name: "allows executive owner on sale_proof requested",
        artifact: makeArtifact({ artifactType: "sale_proof", direction: "upload", status: "requested", requestedByUserId: 10 }),
        actor: makeActor({ role: "executive", userId: 10 }),
        ok: true,
      },
      {
        name: "denies download-only types",
        artifact: makeArtifact({ artifactType: "records_export", direction: "download", status: "requested" }),
        actor: makeActor({ role: "back_office" }),
        ok: false,
        code: "artifact_not_uploadable",
      },
      {
        name: "denies wrong status",
        artifact: makeArtifact({ artifactType: "integration_import", direction: "upload", status: "ready" }),
        actor: makeActor({ role: "back_office" }),
        ok: false,
        code: "artifact_upload_wrong_status",
      },
    ];

    for (const testCase of uploadCases) {
      it(testCase.name, () => {
        const result = checkArtifactPolicy(
          testCase.actor,
          testCase.artifact,
          "artifact.upload",
        );

        expect(result.ok).toBe(testCase.ok);
        if (!testCase.ok && testCase.code) {
          if (result.ok) throw new Error("Expected failure");
          expect(result.error.code).toBe(testCase.code);
        }
      });
    }
  });

  describe("artifact.read", () => {
    it("allows back_office in matching scope", () => {
      const result = checkArtifactPolicy(
        makeActor({ role: "back_office", branchId: 1 }),
        makeArtifact({ scopeBranchId: 1 }),
        "artifact.read",
      );
      expect(result.ok).toBe(true);
    });

    it("allows executive special-case read for sale_proof they own", () => {
      const result = checkArtifactPolicy(
        makeActor({ role: "executive", userId: 10 }),
        makeArtifact({ artifactType: "sale_proof", requestedByUserId: 10 }),
        "artifact.read",
      );
      expect(result.ok).toBe(true);
    });

    it("denies branch mismatch for non-elevated actor", () => {
      const result = checkArtifactPolicy(
        makeActor({ role: "back_office", branchId: 1, userId: 11 }),
        makeArtifact({ scopeBranchId: 99 }),
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
