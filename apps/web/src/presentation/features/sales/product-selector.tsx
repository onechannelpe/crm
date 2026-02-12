import { type Component, For, createSignal } from "solid-js";
import { Button } from "~/presentation/ui/primitives/button";
import { Select } from "~/presentation/ui/primitives/select";
import { Input } from "~/presentation/ui/primitives/input";
import type { Product } from "~/infrastructure/db/schema";

interface ProductSelectorProps {
  products: Product[];
  onSelect: (productId: number, quantity: number) => Promise<void>;
  disabled?: boolean;
}

export const ProductSelector: Component<ProductSelectorProps> = (props) => {
  const [selectedId, setSelectedId] = createSignal<number | null>(null);
  const [quantity, setQuantity] = createSignal(1);
  const [loading, setLoading] = createSignal(false);

  const selectedProduct = () =>
    props.products.find((p) => p.id === selectedId());

  const handleAdd = async () => {
    const id = selectedId();
    if (!id) return;

    setLoading(true);
    try {
      await props.onSelect(id, quantity());
      setSelectedId(null);
      setQuantity(1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="bg-white border border-gray-200 rounded-lg p-4">
      <h3 class="font-semibold mb-3">Agregar Producto</h3>
      <div class="space-y-3">
        <Select
          value={selectedId()?.toString() ?? ""}
          onChange={(value) => setSelectedId(Number(value))}
          disabled={props.disabled}
        >
          <option value="">Seleccionar producto</option>
          <For each={props.products}>
            {(product) => (
              <option value={product.id}>
                {product.name} - S/. {product.price.toFixed(2)}
              </option>
            )}
          </For>
        </Select>

        <div class="grid grid-cols-2 gap-3">
          <Input
            type="number"
            label="Cantidad"
            value={quantity().toString()}
            onInput={(value) => setQuantity(Math.max(1, Number(value)))}
            disabled={props.disabled}
          />
          <div class="flex items-end">
            <p class="text-sm font-medium">
              Total: S/. {((selectedProduct()?.price ?? 0) * quantity()).toFixed(2)}
            </p>
          </div>
        </div>

        <Button
          onClick={handleAdd}
          disabled={!selectedId() || loading() || props.disabled}
          class="w-full"
        >
          {loading() ? "Agregando..." : "Agregar al Pedido"}
        </Button>
      </div>
    </div>
  );
};
