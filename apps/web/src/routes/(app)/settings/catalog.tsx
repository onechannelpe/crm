import { useAction, useSubmissions } from "@solidjs/router";
import { For, createMemo, createSignal } from "solid-js";

import { useToast } from "~/components/feedback/toast-provider";
import { SettingsSection } from "~/components/settings/SettingsSection";
import { Button } from "~/components/ui/input/button";
import { Checkbox } from "~/components/ui/input/checkbox";
import { Input } from "~/components/ui/input/input";
import { getErrorMessage } from "~/lib/errors";
import { updateProductPricingMutation } from "~/lib/mutations/settings";
import { productCatalogQuery } from "~/lib/queries/settings";
import { createOptimisticQuery } from "~/lib/ui/create-optimistic-query";

import {
  collectPendingCatalogChanges,
  summarizeCatalogSaveResults,
  type CatalogProductDraft,
  type CatalogProductRecord,
} from "./catalog-save";

import styles from "./catalog.module.css";
import base from "./settings-page.module.css";

export default function CatalogPage() {
  const { showToast } = useToast();

  const { data: currentProducts, invalidate: invalidateProducts } =
    createOptimisticQuery(productCatalogQuery, { initialValue: [] });
  const saveProduct = useAction(updateProductPricingMutation);
  const saveSubmissions = useSubmissions(updateProductPricingMutation);
  const [drafts, setDrafts] = createSignal<Record<number, CatalogProductDraft>>(
    {},
  );

  const anySaving = () => saveSubmissions.some((s) => s.pending);

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

        const parsed = Number(draft.price);
        if (!Number.isFinite(parsed) || parsed <= 0) {
          return true;
        }

        return (
          parsed !== product.price ||
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

  return (
    <>
      <SettingsSection
        title="Precios y disponibilidad"
        description="Ajusta el precio unitario y activa o desactiva cada producto."
      >
        <div class={styles.catalogList}>
          <For each={currentProducts()}>
            {(product) => {
              return (
                <div class={styles.catalogItem}>
                  <div class={styles.catalogItemMeta}>
                    <span class={styles.catalogItemName}>{product.name}</span>
                    <span class={styles.catalogItemCategory}>
                      {product.category}
                    </span>
                  </div>
                  <div class={styles.catalogItemControls}>
                    <div style={{ width: "9rem" }}>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        label="Precio unitario"
                        value={getDraft(product).price}
                        onInput={(e) =>
                          setDraft(product, {
                            ...getDraft(product),
                            price: e.currentTarget.value,
                          })
                        }
                      />
                    </div>
                    <Checkbox
                      label="Activo"
                      checked={getDraft(product).isActive}
                      onInput={(e) =>
                        setDraft(product, {
                          ...getDraft(product),
                          isActive: e.currentTarget.checked,
                        })
                      }
                    />
                  </div>
                </div>
              );
            }}
          </For>
        </div>
        <div class={base.formActions}>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={dirtyProductIds().length === 0}
            loading={anySaving()}
            onClick={() => {
              void saveAll();
            }}
          >
            Guardar cambios
          </Button>
        </div>
      </SettingsSection>
    </>
  );
}
