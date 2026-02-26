import { useAction, useSubmissions } from "@solidjs/router";
import { createSignal, For } from "solid-js";

import { useToast } from "~/components/feedback/toast-provider";
import { Button } from "~/components/ui/input/button";
import { Checkbox } from "~/components/ui/input/checkbox";
import { Input } from "~/components/ui/input/input";
import { getErrorMessage } from "~/lib/errors";
import { updateProductPricingMutation } from "~/lib/mutations/settings";
import { productCatalogQuery } from "~/lib/queries/settings";
import { createOptimisticQuery } from "~/lib/ui/create-optimistic-query";

import styles from "./settings-page.module.css";

export default function SettingsGeneralPage() {
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
      showToast("success", "Product updated");
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "Failed to update product"));
    }
  };

  return (
    <div class={styles.content}>
      <section class={styles.block}>
        <h2 class={styles.title}>Product catalog</h2>
        <p class={styles.description}>
          Update product price and activation state.
        </p>
        <div class={styles.products}>
          <For each={currentProducts()}>
            {(product) => {
              const [price, setPrice] = createSignal(String(product.price));
              const [isActive, setIsActive] = createSignal(
                product.is_active === 1,
              );
              return (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void save(product.id, price(), isActive());
                  }}
                >
                  <div class={styles.productRow}>
                    <div>
                      <p class={styles.productName}>{product.name}</p>
                      <p class={styles.productCategory}>{product.category}</p>
                    </div>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      label="Price"
                      value={price()}
                      onInput={(event) => setPrice(event.currentTarget.value)}
                    />
                    <Checkbox
                      label="Active"
                      checked={isActive()}
                      onInput={(event) =>
                        setIsActive(event.currentTarget.checked)
                      }
                    />
                    <Button type="submit" disabled={isSaving(product.id)}>
                      {isSaving(product.id) ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </form>
              );
            }}
          </For>
        </div>
      </section>
    </div>
  );
}
