import { createSignal, For } from "solid-js";

import { updateProductPricing } from "~/actions/settings";
import { useToast } from "~/components/feedback/toast-provider";
import { Button } from "~/components/ui/input/button";
import { Checkbox } from "~/components/ui/input/checkbox";
import { Input } from "~/components/ui/input/input";
import { getErrorMessage } from "~/lib/errors";
import { productCatalogQuery } from "~/lib/queries/settings";
import { createOptimisticQuery } from "~/lib/ui/create-optimistic-query";
import { runOptimistic } from "~/lib/ui/run-optimistic";

import styles from "./settings-page.module.css";

export default function SettingsGeneralPage() {
  const { showToast } = useToast();

  const {
    data: currentProducts,
    write: writeProducts,
    revalidate: revalidateProducts,
  } = createOptimisticQuery(() => productCatalogQuery(), {
    initialValue: [],
    key: productCatalogQuery.key,
  });
  const [savingId, setSavingId] = createSignal<number | null>(null);

  const save = async (productId: number, price: string, isActive: boolean) => {
    setSavingId(productId);
    try {
      const numericPrice = Number(price);
      await runOptimistic({
        read: currentProducts,
        write: writeProducts,
        optimistic: (prev) =>
          prev.map((product) =>
            product.id === productId
              ? { ...product, price: numericPrice, is_active: isActive ? 1 : 0 }
              : product,
          ),
        commit: async () => {
          await updateProductPricing(productId, numericPrice, isActive);
        },
        reconcile: revalidateProducts,
      });
      showToast("success", "Product updated");
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "Failed to update product"));
    } finally {
      setSavingId(null);
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
                    <Button type="submit" disabled={savingId() === product.id}>
                      {savingId() === product.id ? "Saving..." : "Save"}
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
