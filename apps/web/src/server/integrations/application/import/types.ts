import {
  type LeadPriority,
  type LeadStage,
  type LeadStatus,
} from "~/contracts/workflow/vocabulary";
import type { NotificationIntent } from "~/server/notifications/types";

export type RowResult =
  | { row: number; ok: false; reason: string }
  | { row: number; ok: true };

export type ImportRowInput =
  | {
      row: number;
      ruc: string;
      type: "import_status";
      status: LeadStatus;
    }
  | {
      row: number;
      ruc: string;
      type: "import_prioridad";
      prioridad: LeadPriority;
    };

export type LoadedLead = {
  id: string;
  organization_id: string;
  ruc: string;
  executive_id: number;
  created_by: number;
  updated_by: number | null;
  updated_at: number;
  status: LeadStatus | null;
  prioridad: LeadPriority | null;
  stage: LeadStage;
};

export type LeadMutationOutcome = {
  row: ImportRowInput;
  leadId: string;
  ruc: string;
  executiveId: number;
  previousStatus: LeadStatus | null;
  previousPrioridad: LeadPriority | null;
  previousStage: LeadStage;
  nextStatus: LeadStatus | null;
  nextPrioridad: LeadPriority | null;
  nextStage: LeadStage;
  changedAt: number;
  stageChanged: boolean;
};

export type LeadMutationResult =
  | {
      ok: false;
      rowResult: RowResult;
    }
  | {
      ok: true;
      rowResult: RowResult;
      mutation: LeadMutationOutcome;
    };

export type PlannedOutboxEvents = {
  notificationIntents: NotificationIntent[];
};
