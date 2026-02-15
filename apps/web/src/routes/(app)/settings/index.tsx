import { createResource, createSignal, For } from "solid-js";
import { getProductCatalog, updateProductPricing } from "~/actions/settings";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useToast } from "~/components/feedback/toast-provider";
import { getErrorMessage } from "~/lib/errors";

export default function SettingsPage() {
    const [products, { refetch }] = createResource(getProductCatalog);
    const [savingId, setSavingId] = createSignal<number | null>(null);
    const { showToast } = useToast();

    const save = async (productId: number, price: string, isActive: boolean) => {
        setSavingId(productId);
        try {
            await updateProductPricing(productId, Number(price), isActive);
            showToast("success", "Producto actualizado");
            refetch();
        } catch (err: unknown) {
            showToast("error", getErrorMessage(err, "No se pudo actualizar el producto"));
        } finally {
            setSavingId(null);
        }
    };

    return (
        <div class="space-y-6">
            <div>
                <h1 class="text-2xl font-bold text-gray-900">Configuración</h1>
                <p class="mt-1 text-sm text-gray-500">
                    Ajustes operativos y parámetros administrables del CRM.
                </p>
            </div>

            <Card class="p-6 space-y-4">
                <h2 class="text-base font-semibold text-foreground">Catálogo de productos</h2>
                <p class="text-sm text-muted-foreground">
                    Cambios de precio y activación se aplican inmediatamente.
                </p>
                <div class="space-y-3">
                    <For each={products() ?? []}>
                        {(product) => {
                            const [price, setPrice] = createSignal(String(product.price));
                            const [isActive, setIsActive] = createSignal(product.is_active === 1);
                            return (
                                <form
                                    class="grid grid-cols-1 md:grid-cols-[1fr_140px_140px_150px] gap-3 items-end border rounded p-3"
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        save(product.id, price(), isActive());
                                    }}
                                >
                                    <div>
                                        <p class="font-medium text-foreground">{product.name}</p>
                                        <p class="text-xs text-muted-foreground">{product.category}</p>
                                    </div>
                                    <Input
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        label="Precio"
                                        value={price()}
                                        onInput={(e) => setPrice((e.target as HTMLInputElement).value)}
                                    />
                                    <label class="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={isActive()}
                                            onInput={(e) => setIsActive((e.target as HTMLInputElement).checked)}
                                        />
                                        Activo
                                    </label>
                                    <Button type="submit" disabled={savingId() === product.id}>
                                        {savingId() === product.id ? "Guardando..." : "Guardar"}
                                    </Button>
                                </form>
                            );
                        }}
                    </For>
                </div>
            </Card>
        </div>
    );
}
