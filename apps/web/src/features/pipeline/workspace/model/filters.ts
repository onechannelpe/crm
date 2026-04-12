import type { LeadListFilters } from "~/features/pipeline/data/types";
import type { Role } from "~/lib/auth/access/rbac";

import type { LeadWorkspaceViewId } from "./types";

function isLeadWorkspaceViewId(value: string): value is LeadWorkspaceViewId {
  return (
    value === "mine" ||
    value === "review" ||
    value === "quotation" ||
    value === "all"
  );
}

export function parseWorkspaceView(
  value: string | undefined,
): LeadWorkspaceViewId | null {
  if (!value) return null;
  return isLeadWorkspaceViewId(value) ? value : null;
}

export function defaultWorkspaceView(role: Role): LeadWorkspaceViewId {
  return role === "back_office" ? "review" : "mine";
}

export function resolveWorkspaceFilters(input: {
  view: LeadWorkspaceViewId;
  actorUserId: number;
}): LeadListFilters {
  const base: LeadListFilters = {};

  switch (input.view) {
    case "review":
      return { ...base, stage: "PENDING_EXTERNAL_REVIEW" };
    case "quotation":
      return { ...base, stage: "READY_FOR_QUOTATION" };
    case "all":
      return base;
    case "mine":
    default:
      return { ...base, executiveId: input.actorUserId };
  }
}
