import { For, Show } from "solid-js";

import { getInventoryItems } from "~/actions/inventory";
import { EmptyState } from "~/components/feedback/empty-state";
import {
  AppPage,
  AppPageHeader,
  AppPageSection,
} from "~/components/layout/page";
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
  const [items] = createAppQuery(getInventoryItems, []);
  const itemCount = () => items()?.length ?? 0;

  return (
    <AppPage>
      <AppPageHeader
        eyebrow="Operación"
        title="Inventario"
        description={`${itemCount()} items registrados.`}
      />

      <Show
        when={itemCount() > 0}
        fallback={
          <EmptyState
            title="Sin registros"
            description="Los productos del inventario aparecerán aquí"
          />
        }
      >
        <AppPageSection class="p-2 md:p-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Número de Serie</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Estado</TableHead>
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
        </AppPageSection>
      </Show>
    </AppPage>
  );
}
