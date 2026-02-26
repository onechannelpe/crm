import { createAsync } from "@solidjs/router";
import { For, Show } from "solid-js";

import { inventoryItemsQuery } from "~/lib/queries/inventory";
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

import styles from "./inventory-page.module.css";

const statusLabels: Record<string, string> = {
  available: "Available",
  reserved: "Reserved",
  sold: "Sold",
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
  const itemCount = () => items()?.length ?? 0;

  return (
    <AppPage>
      <Show
        when={itemCount() > 0}
        fallback={
          <EmptyState
            title="No inventory records"
            description="Items will appear here when available."
          />
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Serial number</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
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
