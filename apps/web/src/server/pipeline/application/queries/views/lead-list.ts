import type {
  LeadPriority,
  LeadStage,
  LeadStatus,
} from "~/pipeline/contracts/lead-schema";
import type { LeadId } from "~/server/pipeline/domain/lead-record";
import type { UserId } from "~/server/shared/ids";

export type LeadListRowView = {
  id: LeadId;
  ruc: string;
  razonSocial: string | null;
  address: string | null;
  executiveId: UserId;
  executiveName: string;
  stage: LeadStage;
  status: LeadStatus | null;
  prioridad: LeadPriority | null;
  nextStep: string;
  createdAt: number;
  updatedAt: number;
};

export type LeadListView = {
  rows: LeadListRowView[];
  totalCount: number;
};
