import type { AppContext } from "~/server/shared/action-runtime/context";
import {
  listSaleProofFiles,
  requestSaleProofDownloadToken,
  uploadSaleProofFile,
} from "~/server/workflow/application/commands/sale-proof-files";
import {
  requestNegotiationDownloadToken,
  uploadNegotiationFile,
} from "~/server/workflow/application/commands/negotiation-files";

import type { WorkflowCommandDeps } from "./create-workflow-command-deps";

type UploadFileInput = {
  ctx: AppContext;
  leadId: string;
  file: {
    name: string;
    sizeBytes: number;
    stream: ReadableStream<Uint8Array>;
  };
};

type DownloadFileInput = {
  ctx: AppContext;
  leadId: string;
  artifactId: string;
};

export function createWorkflowFileCommands(deps: WorkflowCommandDeps) {
  return {
    listSaleProofFiles: (input: { ctx: AppContext; leadId: string }) =>
      listSaleProofFiles(
        {
          leadReader: deps.repos.leads,
          filesRepo: deps.filesRepo,
          filesStorage: deps.filesStorage,
          filesSyncExecutor: deps.filesSyncExecutor,
        },
        input,
      ),
    uploadSaleProofFile: (input: UploadFileInput) =>
      uploadSaleProofFile(
        {
          leadReader: deps.repos.leads,
          filesRepo: deps.filesRepo,
          filesStorage: deps.filesStorage,
          filesSyncExecutor: deps.filesSyncExecutor,
        },
        input,
      ),
    requestSaleProofDownloadToken: (input: DownloadFileInput) =>
      requestSaleProofDownloadToken(
        {
          leadReader: deps.repos.leads,
          filesRepo: deps.filesRepo,
          filesStorage: deps.filesStorage,
          filesSyncExecutor: deps.filesSyncExecutor,
        },
        input,
      ),
    uploadNegotiationFile: (input: UploadFileInput) =>
      uploadNegotiationFile(
        {
          leadReader: deps.repos.leads,
          filesRepo: deps.filesRepo,
          filesStorage: deps.filesStorage,
          filesSyncExecutor: deps.filesSyncExecutor,
        },
        input,
      ),
    requestNegotiationDownloadToken: (input: DownloadFileInput) =>
      requestNegotiationDownloadToken(
        {
          leadReader: deps.repos.leads,
          filesRepo: deps.filesRepo,
          filesStorage: deps.filesStorage,
          filesSyncExecutor: deps.filesSyncExecutor,
        },
        input,
      ),
  };
}
