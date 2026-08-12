import type { Insertable, Selectable } from "kysely";

import type {
  FulfillmentDocKind,
  FulfillmentStep,
  ProductKind,
} from "~/contracts/workflow/vocabulary";
import type {
  FileAssetId,
  FulfillmentOrderId,
  UserId,
  WorkflowLeadId,
  WorkflowVenueId,
} from "~/domain/ids";
import type { DatabaseExecutor } from "~/server/platform/database/executor";
import type { Database } from "~/server/platform/database/types";

import type { UnitField } from "./steps";

export type FulfillmentUnit = {
  id: string;
  orderId: FulfillmentOrderId;
  venueId: WorkflowVenueId | null;
  label: string;
  serial: string | null;
  paymentUrl: string | null;
  paymentProofFileAssetId: FileAssetId | null;
  paymentValidated: boolean;
  serviceRef: string | null;
  createdAt: Date;
};

export type FulfillmentDocument = {
  docKind: FulfillmentDocKind;
  fileAssetId: FileAssetId;
  uploadedByUserId: UserId;
  createdAt: Date;
  safeDisplayFilename: string;
  detectedMime: string;
  sizeBytes: number;
};

export type FulfillmentOrder = {
  id: FulfillmentOrderId;
  leadId: WorkflowLeadId;
  productKind: ProductKind | null;
  currentStep: FulfillmentStep;
  serviceBRef: string | null;
  createdBy: UserId;
  createdAt: Date;
  updatedAt: Date;
};

export type FulfillmentOrderDetails = {
  order: FulfillmentOrder;
  units: FulfillmentUnit[];
  documents: FulfillmentDocument[];
};

type OrderRow = Selectable<Database["lead_fulfillment_orders"]>;
type UnitRow = Selectable<Database["lead_fulfillment_units"]>;

function toOrder(row: OrderRow): FulfillmentOrder {
  return {
    id: row.id,
    leadId: row.lead_id,
    productKind: row.product_kind,
    currentStep: row.current_step,
    serviceBRef: row.service_b_ref,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toUnit(row: UnitRow): FulfillmentUnit {
  return {
    id: row.id,
    orderId: row.order_id,
    venueId: row.venue_id,
    label: row.label,
    serial: row.serial_number,
    paymentUrl: row.payment_url,
    paymentProofFileAssetId: row.payment_proof_file_asset_id,
    paymentValidated: row.payment_validated,
    serviceRef: row.service_a_ref,
    createdAt: row.created_at,
  };
}

export function createFulfillmentRepo(db: DatabaseExecutor) {
  return {
    async createOrder(input: {
      leadId: WorkflowLeadId;
      createdBy: UserId;
      currentStep: FulfillmentStep;
      createdAt: Date;
    }): Promise<FulfillmentOrderId> {
      const row = await db
        .insertInto("lead_fulfillment_orders")
        .values({
          lead_id: input.leadId,
          product_kind: null,
          current_step: input.currentStep,
          service_b_ref: null,
          created_by: input.createdBy,
          created_at: input.createdAt,
          updated_at: input.createdAt,
        })
        .returning("id")
        .executeTakeFirstOrThrow();
      return row.id;
    },

    async createUnits(
      units: Array<{
        orderId: FulfillmentOrderId;
        venueId: WorkflowVenueId | null;
        label: string;
        createdAt: Date;
      }>,
    ): Promise<void> {
      if (units.length === 0) {
        return;
      }
      const rows: Insertable<Database["lead_fulfillment_units"]>[] = units.map(
        (unit) => ({
          order_id: unit.orderId,
          venue_id: unit.venueId,
          label: unit.label,
          serial_number: null,
          payment_url: null,
          payment_proof_file_asset_id: null,
          payment_validated: false,
          service_a_ref: null,
          created_at: unit.createdAt,
        }),
      );
      await db.insertInto("lead_fulfillment_units").values(rows).execute();
    },

    async findByLeadId(
      leadId: WorkflowLeadId,
    ): Promise<FulfillmentOrderDetails | null> {
      const orderRow = await db
        .selectFrom("lead_fulfillment_orders")
        .selectAll()
        .where("lead_id", "=", leadId)
        .executeTakeFirst();
      if (!orderRow) {
        return null;
      }

      const [unitRows, docRows] = await Promise.all([
        db
          .selectFrom("lead_fulfillment_units")
          .selectAll()
          .where("order_id", "=", orderRow.id)
          .orderBy("created_at", "asc")
          .execute(),
        db
          .selectFrom("lead_fulfillment_documents as d")
          .innerJoin("file_assets as f", "f.id", "d.file_asset_id")
          .select([
            "d.doc_kind as docKind",
            "d.file_asset_id as fileAssetId",
            "d.uploaded_by_user_id as uploadedByUserId",
            "d.created_at as createdAt",
            "f.safe_display_filename as safeDisplayFilename",
            "f.detected_mime as detectedMime",
            "f.size_bytes as sizeBytes",
          ])
          .where("d.order_id", "=", orderRow.id)
          .orderBy("d.created_at", "asc")
          .execute(),
      ]);

      return {
        order: toOrder(orderRow),
        units: unitRows.map(toUnit),
        documents: docRows.map((row) => ({
          docKind: row.docKind,
          fileAssetId: row.fileAssetId,
          uploadedByUserId: row.uploadedByUserId,
          createdAt: row.createdAt,
          safeDisplayFilename: row.safeDisplayFilename,
          detectedMime: row.detectedMime,
          sizeBytes: row.sizeBytes,
        })),
      };
    },

    async setProductKind(
      orderId: FulfillmentOrderId,
      productKind: ProductKind,
      updatedAt: Date,
    ): Promise<void> {
      await db
        .updateTable("lead_fulfillment_orders")
        .set({ product_kind: productKind, updated_at: updatedAt })
        .where("id", "=", orderId)
        .execute();
    },

    async setStep(
      orderId: FulfillmentOrderId,
      step: FulfillmentStep,
      updatedAt: Date,
    ): Promise<void> {
      await db
        .updateTable("lead_fulfillment_orders")
        .set({ current_step: step, updated_at: updatedAt })
        .where("id", "=", orderId)
        .execute();
    },

    async setServiceBRef(
      orderId: FulfillmentOrderId,
      ref: string,
      updatedAt: Date,
    ): Promise<void> {
      await db
        .updateTable("lead_fulfillment_orders")
        .set({ service_b_ref: ref, updated_at: updatedAt })
        .where("id", "=", orderId)
        .execute();
    },

    async setUnitField(
      unitId: string,
      field: UnitField,
      value: string,
    ): Promise<void> {
      await db
        .updateTable("lead_fulfillment_units")
        .set({ [field]: value })
        .where("id", "=", unitId)
        .execute();
    },

    // Used by the reject step: prior actor re-supplies the value.
    async clearUnitField(
      orderId: FulfillmentOrderId,
      field: UnitField,
    ): Promise<void> {
      await db
        .updateTable("lead_fulfillment_units")
        .set({ [field]: null })
        .where("order_id", "=", orderId)
        .execute();
    },

    async listUnitPayments(
      orderId: FulfillmentOrderId,
    ): Promise<{ label: string; paymentUrl: string | null }[]> {
      const rows = await db
        .selectFrom("lead_fulfillment_units")
        .select(["label", "payment_url"])
        .where("order_id", "=", orderId)
        .orderBy("created_at", "asc")
        .execute();
      return rows.map((row) => ({
        label: row.label,
        paymentUrl: row.payment_url,
      }));
    },

    async markPaymentsValidated(orderId: FulfillmentOrderId): Promise<void> {
      await db
        .updateTable("lead_fulfillment_units")
        .set({ payment_validated: true })
        .where("order_id", "=", orderId)
        .execute();
    },

    async addDocument(input: {
      orderId: FulfillmentOrderId;
      docKind: FulfillmentDocKind;
      fileAssetId: FileAssetId;
      uploadedByUserId: UserId;
      createdAt: Date;
    }): Promise<void> {
      await db
        .insertInto("lead_fulfillment_documents")
        .values({
          order_id: input.orderId,
          doc_kind: input.docKind,
          file_asset_id: input.fileAssetId,
          uploaded_by_user_id: input.uploadedByUserId,
          created_at: input.createdAt,
        })
        .execute();
    },

    async findDocumentByFileAssetId(input: {
      orderId: FulfillmentOrderId;
      fileAssetId: FileAssetId;
    }): Promise<FulfillmentDocument | null> {
      const row = await db
        .selectFrom("lead_fulfillment_documents as d")
        .innerJoin("file_assets as f", "f.id", "d.file_asset_id")
        .select([
          "d.doc_kind as docKind",
          "d.file_asset_id as fileAssetId",
          "d.uploaded_by_user_id as uploadedByUserId",
          "d.created_at as createdAt",
          "f.safe_display_filename as safeDisplayFilename",
          "f.detected_mime as detectedMime",
          "f.size_bytes as sizeBytes",
        ])
        .where("d.order_id", "=", input.orderId)
        .where("d.file_asset_id", "=", input.fileAssetId)
        .executeTakeFirst();

      return row
        ? {
            docKind: row.docKind,
            fileAssetId: row.fileAssetId,
            uploadedByUserId: row.uploadedByUserId,
            createdAt: row.createdAt,
            safeDisplayFilename: row.safeDisplayFilename,
            detectedMime: row.detectedMime,
            sizeBytes: row.sizeBytes,
          }
        : null;
    },
  };
}

export type FulfillmentRepository = ReturnType<typeof createFulfillmentRepo>;
