import { Card } from "~/components/ui/card";
import { EmptyState } from "~/components/feedback/empty-state";

export default function InventoryPage() {
    return (
        <div class="space-y-6">
            <div>
                <h1 class="text-2xl font-bold text-gray-900">Inventario</h1>
                <p class="text-sm text-gray-500 mt-1">
                    Control de stock y números de serie
                </p>
            </div>

            <Card>
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                                    Producto
                                </th>
                                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                                    Serial
                                </th>
                                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                                    Estado
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td colspan="3" class="px-4 py-8">
                                    <EmptyState
                                        title="Sin registros"
                                        description="Los productos del inventario aparecerán aquí"
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
