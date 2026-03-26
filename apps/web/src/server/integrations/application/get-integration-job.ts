import { pipelineRepos } from "~/server/shared/pipeline-runtime";

export function getIntegrationJobQuery(jobId: number) {
  return pipelineRepos.integrationJobs.findById(jobId);
}
