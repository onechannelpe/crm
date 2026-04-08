import type {
  LeadPriority,
  LeadStage,
  LeadStatus,
} from "~/pipeline/contracts/lead-schema";

export type LeadListRowView = {
  id: number;
  ruc: string;
  razonSocial: string | null;
  address: string | null;
  executiveId: number;
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
