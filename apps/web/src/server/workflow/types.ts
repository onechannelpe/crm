import type { DatabaseExecutor } from "~/server/platform/database/executor";

/**
 * Dependencies and operation instant shared by a workflow write.
 *
 * A transaction derives another context with its transaction executor while
 * preserving `operationAt` for the complete write.
 */
export interface WorkflowWriteContext {
  readonly executor: DatabaseExecutor;
  readonly operationAt: Date;
}
