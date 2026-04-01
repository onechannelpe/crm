import type { Role } from "~/lib/auth/access/rbac";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import { createPipelineQueryDeps } from "../../infrastructure/deps";
import {
  canReadRecord,
  canRevealFullTimeline,
  canViewAllRecords,
} from "../policies/access";
import { resolveAvailableActions } from "../policies/action-availability";
import { presentTimeline, type TimelineItem } from "../presenters/timeline";

type QueryDeps = ReturnType<typeof createPipelineQueryDeps>;

export type RecordDetailOutput = {
  record: NonNullable<Awaited<ReturnType<QueryDeps["records"]["findById"]>>>;
  commercialInput: Awaited<
    ReturnType<QueryDeps["commercialInputs"]["findByRecordId"]>
  >;
  quotations: Awaited<ReturnType<QueryDeps["quotations"]["listByRecord"]>>;
  sale: Awaited<ReturnType<QueryDeps["sales"]["findByRecord"]>>;
  timeline: TimelineItem[];
  availableActions: ReturnType<typeof resolveAvailableActions>;
};

export async function getRecordDetailWithDeps(
  deps: QueryDeps,
  input: {
    actorUserId: number;
    actorRole: Role;
    leadId: number;
  },
): Promise<Result<RecordDetailOutput, DomainError>> {
  if (!canReadRecord(input.actorRole)) {
    return Err(domainError("forbidden", "forbidden", "Access denied"));
  }

  const record = await deps.records.findById(input.leadId);
  if (!record) {
    return Err(
      domainError("not_found", "record_not_found", "Record not found"),
    );
  }

  if (
    !canViewAllRecords(input.actorRole) &&
    record.executive_id !== input.actorUserId
  ) {
    return Err(domainError("forbidden", "forbidden", "Access denied"));
  }

  const [commercialInput, quotations, sale, history] = await Promise.all([
    deps.commercialInputs.findByRecordId(input.leadId),
    deps.quotations.listByRecord(input.leadId),
    deps.sales.findByRecord(input.leadId),
    deps.history.listByRecordId(input.leadId),
  ]);

  return Ok({
    record,
    commercialInput,
    quotations,
    sale,
    timeline: presentTimeline(history, canRevealFullTimeline(input.actorRole)),
    availableActions: resolveAvailableActions({
      actorRole: input.actorRole,
      stage: record.stage,
    }),
  });
}

export async function getRecordDetail(input: {
  actorUserId: number;
  actorRole: Role;
  leadId: number;
}): Promise<Result<RecordDetailOutput, DomainError>> {
  const deps = createPipelineQueryDeps();
  return getRecordDetailWithDeps(deps, input);
}
