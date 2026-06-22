import type { Generated } from "kysely";

import type {
  FulfillmentDocKind,
  FulfillmentStep,
  ProductKind,
} from "~/contracts/workflow/vocabulary";

// One fulfillment order per lead. Created when the lead enters FULFILLMENT
// (last venue funded). product_kind is null until back office picks it on the
// CHOOSE_PRODUCT step; current_step then follows the per-kind sequence.
export interface LeadFulfillmentOrdersTable {
  id: string;
  lead_id: string;
  product_kind: ProductKind | null;
  current_step: FulfillmentStep;
  // External reference returned by service B when the signed addendum is loaded
  // (refurbished branch). Free text the back office records.
  service_b_ref: string | null;
  created_by: number;
  created_at: number;
  updated_at: number;
}

// One physical POS per unit (derived from venue POS counts). Per-unit data is
// filled across the late steps; a step is complete only when every unit on the
// order carries the value that step requires.
export interface LeadFulfillmentUnitsTable {
  id: string;
  order_id: string;
  venue_id: string | null;
  label: string;
  serial_number: string | null;
  payment_url: string | null;
  payment_proof_artifact_id: string | null;
  payment_validated: 0 | 1;
  service_a_ref: string | null;
  created_at: number;
}

// Binds an uploaded artifact to the order for a given document handoff, mirroring
// workflow_sale_proof_files. doc_kind disambiguates the fulfillment document.
export interface LeadFulfillmentDocumentsTable {
  id: Generated<number>;
  order_id: string;
  doc_kind: FulfillmentDocKind;
  artifact_id: string;
  file_asset_id: number;
  uploaded_by_user_id: number;
  created_at: number;
}
