import { createAsync, query } from "@solidjs/router";
import { ChevronRight, Ellipsis, Funnel, Plus, Search } from "lucide-solid";
import { For, Show } from "solid-js";
import EmptyState from "~/components/shared/empty-state";
import { Button } from "~/components/ui/button";
import { getTeamUsers } from "~/lib/server/api";

const loadTeamUsers = query(async () => {
  "use server";
  return getTeamUsers();
}, "team-users");

export const route = {
  preload: () => loadTeamUsers(),
};

export default function TeamPage() {
  const users = createAsync(() => loadTeamUsers());

  return (
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div class="flex gap-6 border-b border-gray-200">
          <button
            type="button"
            class="pb-2 border-b-2 border-blue-600 text-blue-600 font-medium text-sm"
          >
            Activos <span class="text-xs ml-1 text-gray-500">(1)</span>
          </button>
          <button
            type="button"
            class="pb-2 text-gray-500 font-medium text-sm hover:text-gray-700"
          >
            Empleados <span class="text-xs ml-1 text-gray-400">(0)</span>
          </button>
          <button
            type="button"
            class="pb-2 text-gray-500 font-medium text-sm hover:text-gray-700"
          >
            Contratistas <span class="text-xs ml-1 text-gray-400">(1)</span>
          </button>
          <button
            type="button"
            class="pb-2 text-gray-500 font-medium text-sm hover:text-gray-700"
          >
            Empleados directos{" "}
            <span class="text-xs ml-1 text-gray-400">(0)</span>
          </button>
          <button
            type="button"
            class="pb-2 text-gray-500 font-medium text-sm hover:text-gray-700"
          >
            Inactivos <span class="text-xs ml-1 text-gray-400">(0)</span>
          </button>
        </div>
        <div class="flex items-center gap-3">
          <Button
            type="button"
            variant="primary"
            class="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4 py-2 text-sm"
          >
            <Plus class="w-4 h-4" /> Agregar
          </Button>
          <button
            type="button"
            class="p-2 text-gray-500 hover:text-gray-700"
            title="Buscar"
          >
            <Search class="w-5 h-5" />
          </button>
          <button
            type="button"
            class="p-2 text-gray-500 hover:text-gray-700"
            title="Filtrar"
          >
            <Funnel class="w-5 h-5" />
          </button>
        </div>
      </div>

      <div class="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-200">
        <div class="relative flex-1 max-w-sm">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar"
            class="w-full pl-9 pr-4 py-2 text-sm border-gray-100 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <Button
          variant="outline"
          class="gap-2 text-gray-600 border-gray-200 bg-white"
        >
          <Funnel class="w-4 h-4" /> Filtrar
        </Button>
        <button
          type="button"
          class="ml-auto p-2 text-gray-400 hover:text-gray-600"
        >
          <Ellipsis class="w-5 h-5" />
        </button>
      </div>

      <Show
        when={users()?.length}
        fallback={
          <EmptyState
            title="No hay usuarios"
            description="Los usuarios del sistema aparecerán aquí"
          />
        }
      >
        <div class="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <table class="w-full">
            <thead class="bg-gray-50 border-b border-gray-200">
              <tr>
                <th class="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Nombre
                </th>
                <th class="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  ID de empleado
                </th>
                <th class="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Departamento
                </th>
                <th class="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Salario anual
                </th>
                <th class="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Tipo de contrato
                </th>
                <th class="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th class="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Gerente
                </th>
                <th class="w-10"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 bg-white">
              <For each={users()}>
                {(user) => (
                  <tr class="hover:bg-gray-50 group cursor-pointer transition-colors">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                          {user.full_name?.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div class="text-sm font-medium text-gray-900">
                            {user.full_name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                      {String(user.id).padStart(6, "0")}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      —
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      —
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      Contratista
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="text-sm text-gray-900">{user.role}</span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      —
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right">
                      <ChevronRight class="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
          <div class="px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <span class="text-xs text-gray-500">1 registro</span>
            <div class="flex gap-2">{/* Pagination placeholder */}</div>
          </div>
        </div>
      </Show>
    </div>
  );
}
