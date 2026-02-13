import { createResource, For, Show } from "solid-js";
import { getInventoryItems } from "~/actions/inventory";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { EmptyState } from "~/components/feedback/empty-state";

const statusLabels: Record<string, string> = {
    available: "Disponible",
    reserved: "Reservado",
    sold: "Vendido",
};

const statusVariant = (status: string) => {
    switch (status) {
        case "available": return "success" as const;
        case "reserved": return "warning" as const;
        case "sold": return "default" as const;
        default: return "default" as const;
    }
};

export default function InventoryPage() {
    const [items] = createResource(getInventoryItems);

    return (
        <div class="space-y-6">
            <div>
                <h1 class="text-2xl font-bold text-gray-900">Inventario</h1>
                <p class="text-sm text-gray-500 mt-1">
                    {items()?.length ?? 0} items en inventario
                </p>
            </div>

            <Show
                when={items() && items()!.length > 0}
                fallback={
                    <EmptyState
                        title="Sin registros"
                        description="Los productos del inventario aparecerán aquí"
                    />
                }
            >
                <div class="rounded-md border bg-white">
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
                                            <Badge variant="outline">
                                                {item.category}
                                            </Badge>
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
                </div>
            </Show>
        </div>
    );
}
