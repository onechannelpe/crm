import { type Component, For } from "solid-js";

interface SaleItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
}

interface ItemListProps {
  items: SaleItem[];
}

export const ItemList: Component<ItemListProps> = (props) => {
  const total = () =>
    props.items.reduce((sum, item) => sum + item.quantity * item.price, 0);

  return (
    <div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <table class="w-full">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
              Producto
            </th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
              Cantidad
            </th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
              Precio unit.
            </th>
            <th class="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
              Subtotal
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <For each={props.items}>
            {(item) => (
              <tr>
                <td class="px-4 py-3 text-sm font-medium">{item.name}</td>
                <td class="px-4 py-3 text-sm">{item.quantity}</td>
                <td class="px-4 py-3 text-sm">S/. {item.price.toFixed(2)}</td>
                <td class="px-4 py-3 text-sm text-right font-medium">
                  S/. {(item.quantity * item.price).toFixed(2)}
                </td>
              </tr>
            )}
          </For>
        </tbody>
        <tfoot class="bg-gray-50">
          <tr>
            <td colspan="3" class="px-4 py-3 text-sm font-semibold text-right">
              Total:
            </td>
            <td class="px-4 py-3 text-sm font-bold text-right">
              S/. {total().toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};
