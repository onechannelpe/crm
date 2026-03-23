import { useAction, useSubmissions } from "@solidjs/router";
import { createMemo, createSignal } from "solid-js";

import { useToast } from "~/components/feedback/toast-provider";
import { getErrorMessage } from "~/lib/errors";
import { updateProductPricingMutation } from "~/lib/mutations/settings";
import { productCatalogQuery } from "~/lib/queries/settings";
import { createOptimisticQuery } from "~/lib/ui/create-optimistic-query";

import {
  collectPendingCatalogChanges,
  summarizeCatalogSaveResults,
} from "./catalog-save";
import type {
  CatalogProductDraft,
  CatalogProductRecord,
} from "./catalog.types";

export function createCatalogPageController() {
  const { showToast } = useToast();
  const { data: currentProducts, invalidate: invalidateProducts } =
    createOptimisticQuery(productCatalogQuery, { initialValue: [] });
  const saveProduct = useAction(updateProductPricingMutation);
  const saveSubmissions = useSubmissions(updateProductPricingMutation);
  const [drafts, setDrafts] = createSignal<Record<number, CatalogProductDraft>>(
    {},
  );

  const anySaving = () =>
    saveSubmissions.some((submission) => submission.pending);

  const getDraft = (product: CatalogProductRecord) =>
    drafts()[product.id] ?? {
      price: String(product.price),
      isActive: product.is_active === 1,
    };

  const setDraft = (
    product: CatalogProductRecord,
    next: CatalogProductDraft,
  ) => {
    setDrafts((current: Record<number, CatalogProductDraft>) => ({
      ...current,
      [product.id]: next,
    }));
  };

  const dirtyProductIds = createMemo(() =>
    currentProducts()
      .filter((product) => {
        const draft = drafts()[product.id];
        if (!draft) {
          return false;
        }

        const parsedPrice = Number(draft.price);
        if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
          return true;
        }

        return (
          parsedPrice !== product.price ||
          draft.isActive !== (product.is_active === 1)
        );
      })
      .map((product) => product.id),
  );

  const saveAll = async () => {
    const pendingChanges = collectPendingCatalogChanges({
      products: currentProducts(),
      drafts: drafts(),
      dirtyIds: dirtyProductIds(),
    });

    if (!pendingChanges.ok) {
      showToast("error", "Hay precios inválidos. Revisa antes de guardar.");
      return;
    }

    if (pendingChanges.changes.length === 0) {
      return;
    }

    const results = await Promise.allSettled(
      pendingChanges.changes.map((change) =>
        saveProduct(change.id, change.price, change.isActive),
      ),
    );
    const summary = summarizeCatalogSaveResults(
      pendingChanges.changes,
      results,
    );

    if (summary.successfulIds.length > 0) {
      await invalidateProducts();
      setDrafts((current: Record<number, CatalogProductDraft>) => {
        const next = { ...current };
        for (const id of summary.successfulIds) {
          delete next[id];
        }
        return next;
      });
    }

    if (summary.status === "all-success") {
      showToast("success", "Productos actualizados");
      return;
    }

    if (summary.status === "all-failure") {
      showToast(
        "error",
        getErrorMessage(summary.firstError, "Failed to update products"),
      );
      return;
    }

    showToast(
      "error",
      getErrorMessage(
        summary.firstError,
        "Algunos productos no se pudieron actualizar",
      ),
    );
  };

  return {
    currentProducts,
    anySaving,
    dirtyProductIds,
    getDraft,
    setDraft,
    saveAll,
  };
}
