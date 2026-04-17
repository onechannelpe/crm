import type {
  LeadPriority,
  LeadStage,
  LeadStatus,
} from "~/pipeline/contracts/lead-schema";
import type { LeadId } from "~/server/pipeline/domain/lead-record";

export type LeadListRowView = {
  id: LeadId;
  ruc: string;
  razonSocial: string | null;
  address: string | null;
  executiveId: number;
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
