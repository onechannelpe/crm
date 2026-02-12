import { createAsync, useSearchParams, useNavigate } from "@solidjs/router";
import { createSignal, Show } from "solid-js";
import { ProductSelector } from "~/presentation/features/sales/product-selector";
import { ItemList } from "~/presentation/features/sales/item-list";
import { Button } from "~/presentation/ui/primitives/button";
import { getProducts, createSale, addSaleItem, submitSale } from "~/presentation/actions/sales";

export default function NewSalePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const products = createAsync(() => getProducts());
  
  const [saleId, setSaleId] = createSignal<number | null>(null);
  const [items, setItems] = createSignal<any[]>([]);

  const handleAddItem = async (productId: number, quantity: number) => {
    let id = saleId();
    if (!id) {
      id = await createSale(Number(searchParams.contactId));
      setSaleId(id);
    }

    await addSaleItem(id, productId, quantity);
    
    const product = products()?.find(p => p.id === productId);
    if (product) {
      setItems([...items(), {
        id: Date.now(),
        name: product.name,
        quantity,
        price: product.price,
      }]);
    }
  };

  const handleSubmit = async () => {
    if (saleId()) {
      await submitSale(saleId()!);
      navigate("/leads");
    }
  };

  return (
    <div class="max-w-4xl mx-auto space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Nueva Venta</h1>
        <Button variant="secondary" onClick={() => navigate("/leads")}>
          Cancelar
        </Button>
      </div>

      <Show when={products()}>
        <ProductSelector
          products={products()!}
          onSelect={handleAddItem}
        />
      </Show>

      <Show when={items().length > 0}>
        <div class="space-y-4">
          <ItemList items={items()} />
          <div class="flex justify-end">
            <Button onClick={handleSubmit}>
              Enviar a Validación
            </Button>
          </div>
        </div>
      </Show>
    </div>
  );
}
