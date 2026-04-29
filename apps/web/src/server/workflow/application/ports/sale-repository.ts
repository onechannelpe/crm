import type {
  AbonoBank,
  AccountTypeKind,
} from "~/workflow/contracts/lead-schema";

export type LeadSale = {
  id: string;
  leadId: string;
  executiveId: number;
  createdAt: number;
};

export type LeadSaleRepository = {
  insert(values: Omit<LeadSale, "id">): Promise<string>;
  findById(id: string): Promise<LeadSale | undefined>;
  findByLeadId(leadId: string): Promise<LeadSale | undefined>;
  list(limit: number, offset: number): Promise<LeadSale[]>;
  listByExecutive(
    executiveId: number,
    limit: number,
    offset: number,
  ): Promise<LeadSale[]>;
};

export type LeadSaleVenue = {
  id: string;
  saleId: string;
  leadId: string;
  nombreComercial: string;
  cantidadPos: number;
  direccion: string;
  referencia: string;
  distrito: string;
  provincia: string;
  departamento: string;
  solesAccount: {
    banco: AbonoBank;
    tipoCuenta: AccountTypeKind;
    nroCuenta: string;
    cci?: string;
    isSettlement: boolean;
  };
  dollarAccount?: {
    banco: AbonoBank;
    tipoCuenta: AccountTypeKind;
    nroCuenta: string;
    cci?: string;
    isSettlement: boolean;
  };
  createdAt: number;
  createdBy: number;
};

export type LeadSaleVenueRepository = {
  insert(values: Omit<LeadSaleVenue, "id">): Promise<string>;
  findById(id: string): Promise<LeadSaleVenue | undefined>;
  listBySaleId(saleId: string): Promise<LeadSaleVenue[]>;
  listByLeadId(leadId: string): Promise<LeadSaleVenue[]>;
};
