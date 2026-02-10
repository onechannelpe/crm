import { createAsync, query } from "@solidjs/router";
import { For, Show } from "solid-js";
import EmptyState from "~/components/shared/empty-state";
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
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Equipo</h1>
        <p class="text-sm text-gray-500 mt-1">
          {users()?.length || 0} usuarios
        </p>
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
        <div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table class="w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Nombre
                </th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Email
                </th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Rol
                </th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <For each={users()}>
                {(user) => (
                  <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="font-medium text-gray-900">
                        {user.full_name}
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.email}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                        {user.role}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span
                        class={`px-2 py-1 text-xs font-medium rounded ${
                          user.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {user.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Show>
    </div>
  );
}
