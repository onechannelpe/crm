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
      <SettingsSection
        title="Product catalog"
        description="Configure pricing and visibility for your workspace products."
      >
        <div class={styles.card}>
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
                  class={styles.cardItem}
                  style={{ "flex-wrap": "wrap", gap: "16px" }}
                >
                  <div class={styles.cardMain}>
                    <span class={styles.cardTitle}>{product.name}</span>
                    <span class={styles.cardDescription}>
                      {product.category}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      "align-items": "flex-end",
                      gap: "16px",
                      "flex-wrap": "wrap",
                    }}
                  >
                    <div style={{ width: "120px" }}>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        label="Price"
                        value={price()}
                        onInput={(event) => setPrice(event.currentTarget.value)}
                      />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        "align-items": "center",
                        gap: "12px",
                        "padding-bottom": "8px",
                      }}
                    >
                      <Checkbox
                        label="Active"
                        checked={isActive()}
                        onInput={(event) =>
                          setIsActive(event.currentTarget.checked)
                        }
                      />
                    </div>
                    <div style={{ "padding-bottom": "4px" }}>
                      <Button
                        type="submit"
                        disabled={isSaving(product.id)}
                        size="sm"
                      >
                        {isSaving(product.id) ? "Saving..." : "Save"}
                      </Button>
                    </div>
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
