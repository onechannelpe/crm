import { createPipelineDeps, type PipelineDeps } from "./deps";

export type PipelineQueryRuntime = {
  deps: PipelineDeps;
};

export function createPipelineQueryRuntime(): PipelineQueryRuntime {
  return {
    deps: createPipelineDeps(),
  };
}
