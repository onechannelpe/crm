import { createResource, createSignal, For } from "solid-js";

import { getProductCatalog, updateProductPricing } from "~/actions/settings";
import { useToast } from "~/components/feedback/toast-provider";
import {
  AppInsetPanel,
  AppPage,
  AppPageHeader,
  AppPageSection,
  AppPageSectionTitle,
} from "~/components/layout/page";
import { LoginRetriesCard } from "~/components/settings/login-retries-card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { getErrorMessage } from "~/lib/errors";
import { runOptimistic } from "~/lib/ui/run-optimistic";

export default function SettingsPage() {
  const [products, { mutate, refetch }] = createResource(
    () => true,
    async () => getProductCatalog(),
    { initialValue: [], ssrLoadFrom: "initial" },
  );
  const currentProducts = () => products.latest ?? [];
  const [savingId, setSavingId] = createSignal<number | null>(null);
  const { showToast } = useToast();

  const save = async (productId: number, price: string, isActive: boolean) => {
    setSavingId(productId);
    try {
      const numericPrice = Number(price);
      await runOptimistic({
        read: currentProducts,
        write: (next) => mutate(() => next),
        optimistic: (prev) =>
          prev.map((product) =>
            product.id === productId
              ? {
                  ...product,
                  price: numericPrice,
                  is_active: isActive ? 1 : 0,
                }
              : product,
          ),
        commit: async () => {
          await updateProductPricing(productId, numericPrice, isActive);
        },
        reconcile: () => {
          void refetch();
        },
      });
      showToast("success", "Producto actualizado");
    } catch (err: unknown) {
      showToast(
        "error",
        getErrorMessage(err, "No se pudo actualizar el producto"),
      );
    } finally {
      setSavingId(null);
    }
  };

  return (
    <AppPage>
      <AppPageHeader
        eyebrow="Configuración"
        title="Parámetros operativos"
        description="Ajustes administrables del CRM."
      />

      <AppPageSection class="p-6">
        <AppPageSectionTitle
          title="Catálogo de productos"
          description="Cambios de precio y activación se aplican inmediatamente."
        />
        <div class="space-y-3">
          <For each={currentProducts()}>
            {(product) => {
              const [price, setPrice] = createSignal(String(product.price));
              const [isActive, setIsActive] = createSignal(
                product.is_active === 1,
              );
              return (
                <form
                  class="space-y-0"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void save(product.id, price(), isActive());
                  }}
                >
                  <AppInsetPanel class="grid grid-cols-1 items-end gap-3 md:grid-cols-[1fr_140px_140px_150px]">
                    <div>
                      <p class="font-medium text-foreground">{product.name}</p>
                      <p class="text-xs text-muted-foreground">
                        {product.category}
                      </p>
                    </div>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      label="Precio"
                      value={price()}
                      onInput={(e) => setPrice(e.currentTarget.value)}
                    />
                    <label class="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={isActive()}
                        onInput={(e) => setIsActive(e.currentTarget.checked)}
                      />
                      Activo
                    </label>
                    <Button type="submit" disabled={savingId() === product.id}>
                      {savingId() === product.id ? "Guardando..." : "Guardar"}
                    </Button>
                  </AppInsetPanel>
                </form>
              );
            }}
          </For>
        </div>
      </AppPageSection>

      <LoginRetriesCard />
    </AppPage>
  );
}
