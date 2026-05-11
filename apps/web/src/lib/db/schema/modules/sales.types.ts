import type { Generated } from "kysely";

import type {
  AbonoBank,
  AccountTypeKind,
  ModalidadCobro,
} from "~/workflow/contracts/lead-schema";

export interface WorkflowLeadVenuesTable {
  id: Generated<string>;
  lead_id: string;
  nombre_comercial: string;
  pos_quantity: number;
  link_url: string | null;
  online_url: string | null;
  online_modalidad: ModalidadCobro | null;
  direccion: string;
  referencia: string;
  distrito: string;
  provincia: string;
  departamento: string;
  created_at: number;
  created_by: number;
}

export interface WorkflowLeadVenueAccountsTable {
  id: Generated<string>;
  venue_id: string;
  currency: "PEN" | "USD";
  bank: AbonoBank;
  account_type: AccountTypeKind;
  account_number: string;
  cci: string | null;
  is_settlement: 0 | 1;
}

export interface WorkflowCurrencyKindsTable {
  value: "PEN" | "USD";
}

export interface WorkflowAccountTypeKindsTable {
  value: AccountTypeKind;
}

export interface WorkflowAbonoBanksTable {
  value: AbonoBank;
}
