import { createAsync } from "@solidjs/router";
import { Card } from "~/presentation/ui/primitives/card";
import { getUserData } from "~/presentation/actions/auth";

export default function DashboardPage() {
  const user = createAsync(() => getUserData());

  return (
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">
          Hola, {user()?.full_name || "Usuario"} 👋
        </h1>
        <p class="text-gray-500 mt-1">Aquí tienes un resumen de hoy.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div class="p-6">
            <p class="text-sm text-gray-500">Leads Activos</p>
            <p class="text-3xl font-bold text-gray-900 mt-2">0</p>
          </div>
        </Card>

        <Card>
          <div class="p-6">
            <p class="text-sm text-gray-500">Ventas Pendientes</p>
            <p class="text-3xl font-bold text-gray-900 mt-2">0</p>
          </div>
        </Card>

        <Card>
          <div class="p-6">
            <p class="text-sm text-gray-500">Cuota Restante</p>
            <p class="text-3xl font-bold text-gray-900 mt-2">10</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
