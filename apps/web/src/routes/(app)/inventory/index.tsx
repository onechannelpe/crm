import { createAsync } from "@solidjs/router";
import { For, Show } from "solid-js";

import { EmptyState } from "~/components/feedback/empty-state";
import { AppPage } from "~/components/layout/page";
import { Badge } from "~/components/ui/display/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/layout/table";
import { inventoryItemsQuery } from "~/lib/queries/inventory";

import styles from "./inventory-page.module.css";

const statusLabels: Record<string, string> = {
  available: "Disponible",
  reserved: "Reservado",
  sold: "Vendido",
};

const statusVariant = (status: string) => {
  switch (status) {
    case "available":
      return "success" as const;
    case "reserved":
      return "warning" as const;
    case "sold":
      return "default" as const;
    default:
      return "default" as const;
  }
};

export default function InventoryPage() {
  const items = createAsync(() => inventoryItemsQuery(), { initialValue: [] });

  return (
    <AppPage>
      <Show
        when={items().length > 0}
        fallback={
          <EmptyState
            title="Sin registros de inventario"
            description="Los artículos aparecerán aquí cuando estén disponibles."
          />
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Número de serie</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <For each={items()}>
              {(item) => (
                <TableRow>
                  <TableCell class={styles.product}>
                    {item.productName}
                  </TableCell>
                  <TableCell class={styles.serial}>
                    {item.serial_number}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(item.status)}>
                      {statusLabels[item.status] ?? item.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              )}
            </For>
          </TableBody>
        </Table>
      </Show>
    </AppPage>
  );
}
