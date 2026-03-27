import { createSignal, For, Show } from "solid-js";

import type { SalesRecordProductOption } from "~/actions/sales-records/types";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { Select } from "~/components/ui/input/select";
import type {
  ProductLine,
  SalesRecordFormState,
} from "~/lib/sales/use-sales-record-form";

import styles from "./product-line-editor.module.css";

interface Props {
  form: SalesRecordFormState;
  products: SalesRecordProductOption[];
  onError: (message: string) => void;
}

export function ProductLineEditor(props: Props) {
  const [selectedProductId, setSelectedProductId] = createSignal("");
  const [selectedProductQty, setSelectedProductQty] = createSignal("1");

  function handleAdd() {
    const productId = Number(selectedProductId());
    const quantity = Number(selectedProductQty());

    if (!productId || Number.isNaN(productId)) {
      props.onError("Selecciona un producto");
      return;
    }
    if (!quantity || Number.isNaN(quantity) || quantity < 1) {
      props.onError("La cantidad debe ser al menos 1");
      return;
    }
    if (
      props.form.productLines().some((line) => line.productId === productId)
    ) {
      props.onError("Este producto ya está en la lista");
      return;
    }

    props.form.setProductLines((prev) => [...prev, { productId, quantity }]);
    setSelectedProductId("");
    setSelectedProductQty("1");
  }

  function handleRemove(productId: number) {
    props.form.setProductLines((prev) =>
      prev.filter((line: ProductLine) => line.productId !== productId),
    );
  }

  return (
    <div class={styles.root}>
      <div class={styles.picker}>
        <Select
          value={selectedProductId()}
          onInput={(e) => setSelectedProductId(e.currentTarget.value)}
        >
          <option value="">Selecciona un producto</option>
          <For each={props.products}>
            {(product) => (
              <option value={product.id}>
                {product.name} - {product.category}
              </option>
            )}
          </For>
        </Select>
        <Input
          type="number"
          label="Cantidad"
          value={selectedProductQty()}
          min="1"
          onInput={(e) => setSelectedProductQty(e.currentTarget.value)}
        />
        <Button
          type="button"
          onClick={handleAdd}
          disabled={!selectedProductId()}
        >
          Agregar producto
        </Button>
      </div>

      <Show when={props.form.productLines().length > 0}>
        <ul class={styles.list}>
          <For each={props.form.productLines()}>
            {(line) => {
              const product = () =>
                props.products.find((it) => it.id === line.productId);
              return (
                <li class={styles.item}>
                  <span>
                    {product()?.name ?? `Producto #${line.productId}`} &times;{" "}
                    {line.quantity}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemove(line.productId)}
                  >
                    Quitar
                  </Button>
                </li>
              );
            }}
          </For>
        </ul>
      </Show>
    </div>
  );
}
