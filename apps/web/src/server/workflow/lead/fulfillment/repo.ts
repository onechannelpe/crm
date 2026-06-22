import { randomUUIDv7 } from "bun";
import type { Insertable, Selectable } from "kysely";

import type {
  FulfillmentDocKind,
  FulfillmentStep,
  ProductKind,
} from "~/contracts/workflow/vocabulary";
import type { Database } from "~/lib/db/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

import type { UnitField } from "./steps";

export type FulfillmentUnit = {
  id: string;
  orderId: string;
  venueId: string | null;
  label: string;
  serial: string | null;
  paymentUrl: string | null;
  paymentProofArtifactId: string | null;
  paymentValidated: boolean;
  serviceRef: string | null;
  createdAt: number;
};

export type FulfillmentDocument = {
  docKind: FulfillmentDocKind;
  artifactId: string;
  fileAssetId: number;
  uploadedByUserId: number;
  createdAt: number;
  safeDisplayFilename: string;
  detectedMime: string;
  sizeBytes: number;
};

export type FulfillmentOrder = {
  id: string;
  leadId: string;
  productKind: ProductKind | null;
  currentStep: FulfillmentStep;
  serviceBRef: string | null;
  createdBy: number;
  createdAt: number;
  updatedAt: number;
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
    paymentProofArtifactId: row.payment_proof_artifact_id,
    paymentValidated: row.payment_validated === 1,
    serviceRef: row.service_a_ref,
    createdAt: row.created_at,
  };
}

export function createFulfillmentRepo(db: DatabaseExecutor) {
  return {
    async createOrder(input: {
      leadId: string;
      createdBy: number;
      currentStep: FulfillmentStep;
      now: number;
    }): Promise<string> {
      const id = randomUUIDv7();
      await db
        .insertInto("lead_fulfillment_orders")
        .values({
          id,
          lead_id: input.leadId,
          product_kind: null,
          current_step: input.currentStep,
          service_b_ref: null,
          created_by: input.createdBy,
          created_at: input.now,
          updated_at: input.now,
        })
        .executeTakeFirstOrThrow();
      return id;
    },

    async createUnits(
      units: Array<{
        orderId: string;
        venueId: string | null;
        label: string;
        now: number;
      }>,
    ): Promise<void> {
      if (units.length === 0) return;
      const rows: Insertable<Database["lead_fulfillment_units"]>[] = units.map(
        (unit) => ({
          id: randomUUIDv7(),
          order_id: unit.orderId,
          venue_id: unit.venueId,
          label: unit.label,
          serial_number: null,
          payment_url: null,
          payment_proof_artifact_id: null,
          payment_validated: 0,
          service_a_ref: null,
          created_at: unit.now,
        }),
      );
      await db.insertInto("lead_fulfillment_units").values(rows).execute();
    },

    async findByLeadId(
      leadId: string,
    ): Promise<FulfillmentOrderDetails | null> {
      const orderRow = await db
        .selectFrom("lead_fulfillment_orders")
        .selectAll()
        .where("lead_id", "=", leadId)
        .executeTakeFirst();
      if (!orderRow) return null;

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
            "d.artifact_id as artifactId",
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
          artifactId: row.artifactId,
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
      orderId: string,
      productKind: ProductKind,
      now: number,
    ): Promise<void> {
      await db
        .updateTable("lead_fulfillment_orders")
        .set({ product_kind: productKind, updated_at: now })
        .where("id", "=", orderId)
        .execute();
    },

    async setStep(
      orderId: string,
      step: FulfillmentStep,
      now: number,
    ): Promise<void> {
      await db
        .updateTable("lead_fulfillment_orders")
        .set({ current_step: step, updated_at: now })
        .where("id", "=", orderId)
        .execute();
    },

    async setServiceBRef(
      orderId: string,
      ref: string,
      now: number,
    ): Promise<void> {
      await db
        .updateTable("lead_fulfillment_orders")
        .set({ service_b_ref: ref, updated_at: now })
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

    // Clears one field on every unit of the order, used when a review step is
    // rejected so the prior actor re-supplies the value.
    async clearUnitField(orderId: string, field: UnitField): Promise<void> {
      await db
        .updateTable("lead_fulfillment_units")
        .set({ [field]: null })
        .where("order_id", "=", orderId)
        .execute();
    },

    async markPaymentsValidated(orderId: string): Promise<void> {
      await db
        .updateTable("lead_fulfillment_units")
        .set({ payment_validated: 1 })
        .where("order_id", "=", orderId)
        .execute();
    },

    async addDocument(input: {
      orderId: string;
      docKind: FulfillmentDocKind;
      artifactId: string;
      fileAssetId: number;
      uploadedByUserId: number;
      now: number;
    }): Promise<void> {
      await db
        .insertInto("lead_fulfillment_documents")
        .values({
          order_id: input.orderId,
          doc_kind: input.docKind,
          artifact_id: input.artifactId,
          file_asset_id: input.fileAssetId,
          uploaded_by_user_id: input.uploadedByUserId,
          created_at: input.now,
        })
        .execute();
    },

    // Resolves the uploaded file behind an artifact so a fulfillment document can
    // reference the concrete asset. Uses the latest source upload binding.
    async findUploadedAsset(
      artifactId: string,
    ): Promise<{ fileAssetId: number } | null> {
      const row = await db
        .selectFrom("artifact_file_bindings")
        .select(["file_asset_id as fileAssetId"])
        .where("artifact_id", "=", artifactId)
        .where("binding_role", "=", "source_upload")
        .orderBy("version_no", "desc")
        .executeTakeFirst();
      return row ? { fileAssetId: row.fileAssetId } : null;
    },
  };
}

export type FulfillmentRepository = ReturnType<typeof createFulfillmentRepo>;
