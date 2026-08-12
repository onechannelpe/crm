import type { Generated } from "kysely";

import type {
  SettlementBank,
  AccountTypeKind,
  CollectionMode,
} from "~/contracts/workflow/vocabulary";
import type {
  IdColumn,
  UserId,
  WorkflowLeadId,
  WorkflowVenueId,
} from "~/domain/ids";

export interface WorkflowLeadVenuesTable {
  id: IdColumn<WorkflowVenueId>;
  lead_id: IdColumn<WorkflowLeadId>;
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
  created_at: Date;
  created_by: IdColumn<UserId>;
}

export interface WorkflowLeadVenueAccountsTable {
  id: Generated<string>;
  venue_id: IdColumn<WorkflowVenueId>;
  currency: "PEN" | "USD";
  bank: SettlementBank;
  account_type: AccountTypeKind;
  account_number: string;
  cci: string | null;
  is_settlement: boolean;
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
