import { useAction, useSubmissions } from "@solidjs/router";
import { createSignal, For } from "solid-js";

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
    <div class={base.content}>
      <SettingsSection
        title="Precios y disponibilidad"
        description="Ajusta el precio unitario y activa o desactiva cada producto."
      >
        <div class={styles.catalogList}>
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
                  class={styles.catalogItem}
                >
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
                        value={price()}
                        onInput={(e) => setPrice(e.currentTarget.value)}
                      />
                    </div>
                    <Checkbox
                      label="Activo"
                      checked={isActive()}
                      onInput={(e) => setIsActive(e.currentTarget.checked)}
                    />
                    <Button
                      type="submit"
                      disabled={isSaving(product.id)}
                      size="sm"
                    >
                      {isSaving(product.id) ? "Guardando..." : "Guardar"}
                    </Button>
                  </div>
                </form>
              );
            }}
          </For>
        </div>
      </SettingsSection>
    </div>
  );
}
