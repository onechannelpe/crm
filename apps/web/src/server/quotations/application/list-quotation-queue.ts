import { pipelineRepos } from "~/server/shared/pipeline-runtime";

export function listQuotationQueueQuery(input: {
  limit?: number;
  offset?: number;
}) {
  return pipelineRepos.leads.list({
    stage: "READY_FOR_QUOTATION",
    limit: Math.min(input.limit ?? 50, 200),
    offset: input.offset ?? 0,
  });
}
