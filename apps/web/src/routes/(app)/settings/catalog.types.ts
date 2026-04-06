import type { ProductCatalogItem } from "~/actions/settings/admin-products";

export interface CatalogProductDraft {
  price: string;
  isActive: boolean;
}

export type CatalogProductRecord = ProductCatalogItem;

export interface PendingCatalogChange {
  id: number;
  price: number;
  isActive: boolean;
}

export type PendingCatalogChangesResult =
  | { ok: true; changes: PendingCatalogChange[] }
  | { ok: false; reason: "invalid-price" };

export interface CatalogSaveSummary {
  successfulIds: number[];
  firstError?: unknown;
  status: "all-success" | "partial-failure" | "all-failure";
}
