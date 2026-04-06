import type {
  PipelineLeadPriority,
  PipelineLeadStage,
  PipelineLeadStatus,
} from "./lead-detail";

export type PipelineLeadListRow = {
  id: number;
  ruc: string;
  razonSocial: string | null;
  address: string | null;
  executiveId: number;
  stage: PipelineLeadStage;
  status: PipelineLeadStatus | null;
  prioridad: PipelineLeadPriority | null;
  createdAt: number;
  updatedAt: number;
};

export type PipelineLeadList = {
  rows: PipelineLeadListRow[];
  totalCount: number;
};
