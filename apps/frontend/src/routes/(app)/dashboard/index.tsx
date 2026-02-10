import { createAsync, query } from "@solidjs/router";
import {
  Briefcase,
  ChevronRight,
  FileText,
  MessageSquare,
  Users,
} from "lucide-solid";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { getMe } from "~/lib/server/api";

const loadUser = query(async () => {
  "use server";
  return getMe();
}, "user");

export const route = {
  preload: () => loadUser(),
};

export default function DashboardPage() {
  const user = createAsync(() => loadUser());

  return (
    <div class="space-y-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">
          Hola, {user()?.name || "Usuario"} 👋
        </h1>
        <p class="text-gray-500 mt-1">Aquí tienes un resumen de hoy.</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div class="lg:col-span-2 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Prospectos recientes</CardTitle>
            </CardHeader>
            <CardContent class="p-0">
              <div class="divide-y divide-gray-100">
                {[
                  {
                    icon: Users,
                    iconColor: "text-blue-500 bg-blue-100",
                    title: "Nuevo prospecto asignado: Juan Pérez",
                    desc: "Interesado en plan empresarial.",
                    time: "Hace 10m",
                  },
                  {
                    icon: MessageSquare,
                    iconColor: "text-green-500 bg-green-100",
                    title: "Interacción registrada: Corporación Acme",
                    desc: "Demostración programada para el próximo martes.",
                    time: "Hace 1h",
                  },
                  {
                    icon: FileText,
                    iconColor: "text-purple-500 bg-purple-100",
                    title: "Cotización enviada: TechStart Inc",
                    desc: "Propuesta #1023 enviada para revisión.",
                    time: "Hace 2h",
                  },
                ].map((item) => (
                  <div class="flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                    <div
                      class={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${item.iconColor}`}
                    >
                      <item.icon class="w-5 h-5" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <h4 class="text-sm font-semibold text-gray-900">
                        {item.title}
                      </h4>
                      <p class="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                    </div>
                    <span class="text-xs text-gray-400 whitespace-nowrap">
                      {item.time}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div class="flex items-center justify-between w-full">
                <CardTitle>Rendimiento de ventas</CardTitle>
                <button class="text-sm text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1">
                  Ver reporte <ChevronRight class="w-4 h-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent class="p-6">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-500">Ventas totales (mes)</p>
                  <p class="text-2xl font-bold text-gray-900">$12,450</p>
                </div>
                <div>
                  <p class="text-sm text-gray-500">Pendiente</p>
                  <p class="text-2xl font-bold text-gray-900">$4,200</p>
                </div>
                <div>
                  <p class="text-sm text-gray-500">Tasa de conversión</p>
                  <p class="text-2xl font-bold text-gray-900 text-green-600">
                    68%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div class="space-y-6">
          <Card>
            <CardHeader class="pb-2">
              <div class="flex items-center justify-between w-full">
                <CardTitle>
                  Prospectos activos{" "}
                  <span class="text-gray-400 font-normal text-sm ml-1">
                    (5)
                  </span>
                </CardTitle>
                <button class="text-sm text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1">
                  Ver todo <ChevronRight class="w-4 h-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div class="p-4 bg-blue-50 rounded-lg flex items-center gap-4">
                <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                  <Briefcase class="w-5 h-5" />
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-lg font-bold text-gray-900">5</span>
                    <span class="text-sm font-medium text-gray-900">
                      Asignados
                    </span>
                  </div>
                  <p class="text-xs text-gray-500 font-medium">+2 hoy</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader class="pb-2">
              <div class="flex items-center justify-between w-full">
                <CardTitle>Acciones pendientes</CardTitle>
              </div>
            </CardHeader>
            <CardContent class="p-0">
              <div class="flex items-center justify-between p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer">
                <div class="flex items-center gap-3">
                  <span class="text-lg">⚠️</span>
                  <span class="text-sm font-medium text-gray-900">
                    Seguimiento con Industrias Stark
                  </span>
                </div>
              </div>
              <div class="flex items-center justify-between p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer">
                <div class="flex items-center gap-3">
                  <span class="text-lg">💰</span>
                  <span class="text-sm font-medium text-gray-900">
                    Aprobar cotización #99
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
