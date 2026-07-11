import type { Generated } from "kysely";

import type {
  FulfillmentDocKind,
  FulfillmentStep,
  ProductKind,
} from "~/contracts/workflow/vocabulary";
import type {
  FileAssetId,
  FulfillmentOrderId,
  GeneratedId,
  IdColumn,
  NullableIdColumn,
  UserId,
  WorkflowLeadId,
  WorkflowVenueId,
} from "~/server/shared/ids";

// One fulfillment order per lead. Created when the lead enters FULFILLMENT
// (last venue funded). product_kind is null until the owning executive picks it
// on the CHOOSE_PRODUCT step; current_step then follows the per-kind sequence.
export interface LeadFulfillmentOrdersTable {
  id: GeneratedId<FulfillmentOrderId>;
  lead_id: IdColumn<WorkflowLeadId>;
  product_kind: ProductKind | null;
  current_step: FulfillmentStep;
  // Back-office-typed text captured at AWAITING_PDF_COMPILE on the refurbished
  // branch; the matching service-A reference lives on lead_fulfillment_units.
  service_b_ref: string | null;
  created_by: IdColumn<UserId>;
  created_at: Date;
  updated_at: Date;
}

// One physical POS per unit (derived from venue POS counts). Per-unit data is
// filled across the late steps; a step is complete only when every unit on the
// order carries the value that step requires.
export interface LeadFulfillmentUnitsTable {
  id: Generated<string>;
  order_id: IdColumn<FulfillmentOrderId>;
  venue_id: NullableIdColumn<WorkflowVenueId>;
  label: string;
  serial_number: string | null;
  payment_url: string | null;
  payment_proof_file_asset_id: NullableIdColumn<FileAssetId>;
  payment_validated: boolean;
  service_a_ref: string | null;
  created_at: Date;
}

// Binds an uploaded file to the order for a given document handoff.
// doc_kind disambiguates the fulfillment document.
export interface LeadFulfillmentDocumentsTable {
  id: Generated<string>;
  order_id: IdColumn<FulfillmentOrderId>;
  doc_kind: FulfillmentDocKind;
  file_asset_id: IdColumn<FileAssetId>;
  uploaded_by_user_id: IdColumn<UserId>;
  created_at: Date;
}
