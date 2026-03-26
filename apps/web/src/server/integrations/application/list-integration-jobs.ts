import { pipelineRepos } from "~/server/shared/pipeline-runtime";

export function listIntegrationJobsQuery(input: {
  limit?: number;
  offset?: number;
}) {
  return pipelineRepos.integrationJobs.list(
    Math.min(input.limit ?? 50, 200),
    input.offset ?? 0,
  );
}
