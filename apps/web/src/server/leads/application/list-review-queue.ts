import { pipelineRepos } from "~/server/shared/pipeline-runtime";

export function listReviewQueueQuery(input: {
  limit?: number;
  offset?: number;
}) {
  return pipelineRepos.leads.list({
    stage: "PENDING_EXTERNAL_REVIEW",
    limit: Math.min(input.limit ?? 50, 200),
    offset: input.offset ?? 0,
  });
}
