"use server";

import { requestArtifact, requestDownloadToken } from "~/server/files/service";
import { serverRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import { isErr } from "~/server/shared/result";

export async function queueLeadExport(): Promise<{
  artifactId: number;
  token: string;
}> {
  return runAction({
    actionName: "integration.queue_export",
    access: { kind: "permission", permission: "file:artifact:request" },
    input: {},
    execute: async (ctx) => {
      const { repo, storage, syncExecutor } = serverRuntime.files;
      const artifactResult = await requestArtifact(
        ctx,
        {
          artifactType: "leads_export",
          executionMode: "sync",
          workflowContext: {},
        },
        { repo, storage, syncExecutor },
      );
      if (isErr(artifactResult)) return artifactResult;

      const tokenResult = await requestDownloadToken(
        ctx,
        artifactResult.value.artifact.id,
        { repo, storage, syncExecutor },
      );
      if (isErr(tokenResult)) return tokenResult;

      return {
        ok: true as const,
        value: {
          artifactId: artifactResult.value.artifact.id,
          token: tokenResult.value.token,
        },
      };
    },
  });
}
