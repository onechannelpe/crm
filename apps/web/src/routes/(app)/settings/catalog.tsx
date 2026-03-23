import { For } from "solid-js";

import { SettingsSection } from "~/components/settings/SettingsSection";
import { Button } from "~/components/ui/input/button";
import { Checkbox } from "~/components/ui/input/checkbox";
import { Input } from "~/components/ui/input/input";

import { createCatalogPageController } from "./catalog-controller";

import styles from "./catalog.module.css";
import base from "./settings-page.module.css";

export default function CatalogPage() {
  const {
    currentProducts,
    anySaving,
    dirtyProductIds,
    getDraft,
    setDraft,
    saveAll,
  } = createCatalogPageController();

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
