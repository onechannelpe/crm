import type { Generated } from "kysely";

import type {
  SettlementBank,
  AccountTypeKind,
  CollectionMode,
} from "~/contracts/workflow/vocabulary";

export interface WorkflowLeadVenuesTable {
  id: Generated<string>;
  lead_id: string;
  trade_name: string;
  pos_quantity: number;
  link_url: string | null;
  online_url: string | null;
  online_collection_mode: CollectionMode | null;
  address: string;
  address_reference: string;
  district: string;
  province: string;
  department: string;
  created_at: number;
  created_by: number;
}

export interface WorkflowLeadVenueAccountsTable {
  id: Generated<string>;
  venue_id: string;
  currency: "PEN" | "USD";
  bank: SettlementBank;
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

export interface WorkflowSettlementBanksTable {
  value: SettlementBank;
}
