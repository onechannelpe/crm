import {
  query,
  createAsync,
  action,
  redirect,
  useSearchParams,
} from "@solidjs/router";
import { createSignal, Show } from "solid-js";
import {
  getProducts,
  createChargeNote,
  addChargeNoteItem,
  submitChargeNote,
} from "~/lib/server/api";
import ProductSelector from "~/components/sales/product-selector";
import ItemList from "~/components/sales/item-list";
import Button from "~/components/shared/button";
import type { ChargeNoteItem } from "~/lib/shared/types";

const loadProducts = query(async () => {
  "use server";
  return getProducts();
}, "products");

const submitSaleAction = action(async (noteId: number) => {
  "use server";
  await submitChargeNote(noteId);
  throw redirect("/search");
});

export const route = {
  preload: () => loadProducts(),
};

export default function NewSale() {
  const [searchParams] = useSearchParams();
  const products = createAsync(() => loadProducts());
  const [noteId, setNoteId] = createSignal<number | null>(null);
  const [items, setItems] = createSignal<ChargeNoteItem[]>([]);

  const createNote = async () => {
    const contactId = Number(searchParams.contactId);
    const result = await createChargeNote(contactId);
    setNoteId(result.id);
    return result.id;
  };

  const addItem = async (productId: number, quantity: number) => {
    let id = noteId();
    if (!id) {
      id = await createNote();
    }

    await addChargeNoteItem(id, productId, quantity);

    const product = products()?.find((p) => p.id === productId);
    if (product) {
      setItems([
        ...items(),
        {
          id: Date.now(),
          name: product.name,
          quantity,
          price: product.price,
        },
      ]);
    }
  };

  return (
    <div class="max-w-4xl mx-auto space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Nueva venta</h1>
          <p class="text-sm text-gray-500 mt-1">
            Contacto ID: {searchParams.contactId}
          </p>
        </div>
        <Button variant="secondary" onClick={() => window.history.back()}>
          Cancelar
        </Button>
      </div>

      <Show when={products()}>
        <ProductSelector products={products()!} onSelect={addItem} />
      </Show>

      <Show when={items().length > 0}>
        <div class="space-y-4">
          <ItemList items={items()} />
          <div class="flex justify-end">
            <form
              action={submitSaleAction}
              method="post"
              onSubmit={(e) => {
                e.preventDefault();
                if (noteId()) submitSaleAction(noteId()!);
              }}
            >
              <Button type="submit">Enviar a validación</Button>
            </form>
          </div>
        </div>
      </Show>

      <Show when={items().length === 0 && products()}>
        <div class="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <p class="text-gray-500">Agrega productos para crear la venta</p>
        </div>
      </Show>
    </div>
  );
}
