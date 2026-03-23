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

import styles from "./catalog.module.css";
import base from "./settings-page.module.css";

export default function CatalogPage() {
  const { showToast } = useToast();

  const { data: currentProducts, update: updateProducts } =
    createOptimisticQuery(productCatalogQuery, { initialValue: [] });
  const saveProduct = useAction(updateProductPricingMutation);
  const saveSubmissions = useSubmissions(updateProductPricingMutation);
  const [drafts, setDrafts] = createSignal<
    Record<number, { price: string; isActive: boolean }>
  >({});

  const anySaving = () => saveSubmissions.some((s) => s.pending);

  const getDraft = (product: {
    id: number;
    price: number;
    is_active: number;
  }) =>
    drafts()[product.id] ?? {
      price: String(product.price),
      isActive: product.is_active === 1,
    };

  const setDraft = (
    product: { id: number; price: number; is_active: number },
    next: { price: string; isActive: boolean },
  ) => {
    setDrafts(
      (current: Record<number, { price: string; isActive: boolean }>) => ({
        ...current,
        [product.id]: next,
      }),
    );
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

  const save = async (productId: number, price: string, isActive: boolean) => {
    try {
      const numericPrice = Number(price);
      await updateProducts({
        optimistic: (prev) =>
          prev.map((product) =>
            product.id === productId
              ? { ...product, price: numericPrice, is_active: isActive ? 1 : 0 }
              : product,
          ),
        commit: async () => {
          await saveProduct(productId, numericPrice, isActive);
        },
      });
      showToast("success", "Producto actualizado");
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "Failed to update product"));
    }
  };

  const saveAll = async () => {
    const pendingIds = dirtyProductIds();
    if (pendingIds.length === 0) {
      return;
    }

    const snapshot = drafts();
    const products = currentProducts();

    for (const id of pendingIds) {
      const product = products.find((item) => item.id === id);
      const draft = snapshot[id];

      if (!product || !draft) {
        continue;
      }

      const parsed = Number(draft.price);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        showToast("error", "Hay precios inválidos. Revisa antes de guardar.");
        return;
      }
    }

    for (const id of pendingIds) {
      const product = products.find((item) => item.id === id);
      const draft = snapshot[id];

      if (!product || !draft) {
        continue;
      }

      await save(id, draft.price, draft.isActive);
    }

    setDrafts(
      (current: Record<number, { price: string; isActive: boolean }>) => {
        const next = { ...current };
        for (const id of pendingIds) {
          delete next[id];
        }
        return next;
      },
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
