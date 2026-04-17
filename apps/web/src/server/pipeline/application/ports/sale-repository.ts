import type { LeadId } from "../../domain/lead-record";

export type LeadSale = {
  id: number;
  leadId: LeadId;
  executiveId: number;
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

export type LeadSaleRepository = {
  insert(values: Omit<LeadSale, "id">): Promise<number>;
  findById(id: number): Promise<LeadSale | undefined>;
  findByLeadId(leadId: LeadId): Promise<LeadSale | undefined>;
  list(limit: number, offset: number): Promise<LeadSale[]>;
  listByExecutive(
    executiveId: number,
    limit: number,
    offset: number,
  ): Promise<LeadSale[]>;
};
