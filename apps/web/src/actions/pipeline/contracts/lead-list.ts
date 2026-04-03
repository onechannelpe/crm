import type { Lead } from "~/server/pipeline/domain/lead";

export type LeadListRow = {
  id: number;
  ruc: string;
  razonSocial: string | null;
  address: string | null;
  executiveId: number;
  stage: Lead["stage"];
  status: Lead["status"];
  prioridad: Lead["prioridad"];
  createdAt: number;
  updatedAt: number;
};

export type LeadListOutput = {
  rows: LeadListRow[];
  totalCount: number;
};
