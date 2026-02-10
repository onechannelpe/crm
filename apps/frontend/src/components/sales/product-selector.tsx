import { createSignal, For } from "solid-js";
import type { Product } from "~/lib/shared/types";
import Button from "../shared/button";

interface ProductSelectorProps {
  products: Product[];
  onSelect: (productId: number, quantity: number) => Promise<void>;
  disabled?: boolean;
}

export default function ProductSelector(props: ProductSelectorProps) {
  const [selected, setSelected] = createSignal<number | null>(null);
  const [quantity, setQuantity] = createSignal(1);
  const [loading, setLoading] = createSignal(false);

  const handleAdd = async () => {
    if (!selected()) return;

    setLoading(true);
    try {
      await props.onSelect(selected()!, quantity());
      setSelected(null);
      setQuantity(1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectedProduct = () => props.products.find((p) => p.id === selected());

  return (
    <div class="border border-gray-200 rounded-lg p-4 bg-white">
      <h3 class="font-semibold mb-3">Agregar Producto</h3>
      <div class="space-y-3">
        <select
          value={selected() || ""}
          onChange={(e) => setSelected(Number(e.currentTarget.value))}
          disabled={props.disabled}
          class="w-full px-3 py-2 border border-gray-300 rounded disabled:bg-gray-100"
        >
          <option value="">Seleccionar producto</option>
          <For each={props.products}>
            {(product) => (
              <option value={product.id}>
                {product.name} - {product.category}
                {product.subtype ? ` (${product.subtype})` : ""} - S/.{" "}
                {product.price.toFixed(2)}
              </option>
            )}
          </For>
        </select>

        <div class="flex gap-2 items-center">
          <div class="flex-1">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Cantidad
            </label>
            <input
              type="number"
              min="1"
              value={quantity()}
              onInput={(e) =>
                setQuantity(Math.max(1, Number(e.currentTarget.value)))
              }
              disabled={props.disabled}
              class="w-full px-3 py-2 border border-gray-300 rounded disabled:bg-gray-100"
            />
          </div>
          {selectedProduct() && (
            <div class="flex-1 pt-6">
              <p class="text-sm font-medium">
                Total: S/. {(selectedProduct()!.price * quantity()).toFixed(2)}
              </p>
            </div>
          )}
        </div>

        <Button
          onClick={handleAdd}
          disabled={!selected() || loading() || props.disabled}
        >
          {loading() ? "Agregando..." : "Agregar al Pedido"}
        </Button>
      </div>
    </div>
  );
}
