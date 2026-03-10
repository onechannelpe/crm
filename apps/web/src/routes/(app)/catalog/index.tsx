import { useAction, useSubmissions } from "@solidjs/router";
import { createSignal, For } from "solid-js";

import { useToast } from "~/components/feedback/toast-provider";
import { AppPage } from "~/components/layout/page";
import { Button } from "~/components/ui/input/button";
import { Checkbox } from "~/components/ui/input/checkbox";
import { Input } from "~/components/ui/input/input";
import { getErrorMessage } from "~/lib/errors";
import { updateProductPricingMutation } from "~/lib/mutations/settings";
import { productCatalogQuery } from "~/lib/queries/settings";
import { createOptimisticQuery } from "~/lib/ui/create-optimistic-query";

import styles from "./catalog-page.module.css";

export default function CatalogPage() {
  const { showToast } = useToast();

  const { data: currentProducts, update: updateProducts } =
    createOptimisticQuery(productCatalogQuery, { initialValue: [] });
  const saveProduct = useAction(updateProductPricingMutation);
  const saveSubmissions = useSubmissions(updateProductPricingMutation);

  const isSaving = (productId: number) =>
    saveSubmissions.some((s) => s.pending && s.input[0] === productId);

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

  return (
    <AppPage>
      <div class={styles.catalog}>
        <div class={styles.card}>
          <For each={currentProducts()}>
            {(product) => {
              const [price, setPrice] = createSignal(String(product.price));
              const [isActive, setIsActive] = createSignal(
                product.is_active === 1,
              );
              return (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void save(product.id, price(), isActive());
                  }}
                  class={styles.cardItem}
                >
                  <div class={styles.cardMain}>
                    <span class={styles.cardTitle}>{product.name}</span>
                    <span class={styles.cardDescription}>
                      {product.category}
                    </span>
                  </div>
                  <div class={styles.controls}>
                    <div class={styles.priceField}>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        label="Precio unitario"
                        value={price()}
                        onInput={(e) => setPrice(e.currentTarget.value)}
                      />
                    </div>
                    <div class={styles.activeToggle}>
                      <Checkbox
                        label="Activo"
                        checked={isActive()}
                        onInput={(e) => setIsActive(e.currentTarget.checked)}
                      />
                    </div>
                    <div class={styles.submit}>
                      <Button
                        type="submit"
                        disabled={isSaving(product.id)}
                        size="sm"
                      >
                        {isSaving(product.id) ? "Guardando..." : "Guardar"}
                      </Button>
                    </div>
                  </div>
                </form>
              );
            }}
          </For>
        </div>
      </div>
    </AppPage>
  );
}
