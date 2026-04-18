import type { LeadId, UserId } from "~/server/shared/ids";

export type SaleView = {
  id: number;
  leadId: LeadId;
  executiveId: UserId;
  proveedorActual: string;
  tasaActual: number;
  gpv: number;
  ticket: number;
  abono: number;
  cantidadPos: number;
  banco: string;
  nroCuenta: string;
  cci: string | null;
  createdAt: number;
};
