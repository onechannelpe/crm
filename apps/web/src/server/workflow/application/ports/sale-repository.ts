import type { SaleVenueAccount } from "~/contracts/workflow/primitives";
import type { ModalidadCobro } from "~/contracts/workflow/vocabulary";
import type { DomainError } from "~/server/shared/domain-error";
import type { Result } from "~/server/shared/result";

export type LeadVenue = {
  id: string;
  leadId: string;
  nombreComercial: string;
  posQuantity: number;
  linkUrl: string | null;
  onlineUrl: string | null;
  onlineModalidad: ModalidadCobro | null;
  direccion: string;
  referencia: string;
  distrito: string;
  provincia: string;
  departamento: string;
  solesAccount?: SaleVenueAccount & { currency: "PEN" };
  dollarAccount?: SaleVenueAccount & { currency: "USD" };
  createdAt: number;
  createdBy: number;
};

export type LeadVenueInsert = Omit<
  LeadVenue,
  "id" | "solesAccount" | "dollarAccount"
>;

export type LeadVenueAccounts = {
  solesAccount: SaleVenueAccount & { currency: "PEN" };
  dollarAccount?: SaleVenueAccount & { currency: "USD" };
};

export type LeadVenueRepository = {
  insert(values: LeadVenueInsert): Promise<string>;
  addAccounts(
    venueId: string,
    accounts: LeadVenueAccounts,
    now: number,
  ): Promise<void>;
  findById(id: string): Promise<Result<LeadVenue | undefined, DomainError>>;
  listByLeadId(leadId: string): Promise<Result<LeadVenue[], DomainError>>;
  countByLeadId(leadId: string): Promise<number>;
  countWithAccounts(leadId: string): Promise<number>;
};
