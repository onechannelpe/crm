import { For, Show } from "solid-js";

import { getInventoryItems } from "~/actions/inventory";
import { EmptyState } from "~/components/feedback/empty-state";
import { AppPage, AppPageHeader } from "~/components/layout/page";
import { Badge } from "~/components/ui/display/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/layout/table";
import { createAppQuery } from "~/lib/ui/create-app-query";

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
  const [items] = createAppQuery(getInventoryItems, []);
  const itemCount = () => items()?.length ?? 0;

  return (
    <AppPage>
      <AppPageHeader
        eyebrow="Operations"
        title="Inventory"
        description={`${itemCount()} serialized items tracked.`}
      />

      <Show
        when={itemCount() > 0}
        fallback={
          <EmptyState
            title="No inventory records"
            description="Items will appear here when available."
          />
        }
      >
        <section class="tw-record-index-panel">
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
                    <TableCell class="font-medium">
                      {item.productName}
                    </TableCell>
                    <TableCell class="font-mono text-sm text-muted-foreground">
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
        </section>
      </Show>
    </AppPage>
  );
}
