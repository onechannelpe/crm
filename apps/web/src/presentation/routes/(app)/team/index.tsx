import { createAsync } from "@solidjs/router";
import { For, Show } from "solid-js";
import { Card } from "~/presentation/ui/primitives/card";
import { EmptyState } from "~/presentation/ui/feedback/empty-state";
import { getTeamUsers } from "~/presentation/actions/quota";

export default function TeamPage() {
  const users = createAsync(() => getTeamUsers());

  return (
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Mi Equipo</h1>
        <p class="text-sm text-gray-500 mt-1">
          {users()?.length || 0} miembros
        </p>
      </div>

      <Show
        when={users()?.length}
        fallback={
          <EmptyState
            title="No hay usuarios"
            description="Los usuarios del equipo aparecerán aquí"
          />
        }
      >
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <For each={users()}>
            {(user) => (
              <Card>
                <div class="p-4">
                  <h3 class="font-semibold text-gray-900">{user.full_name}</h3>
                  <p class="text-sm text-gray-500">{user.role}</p>
                  <p class="text-xs text-gray-400 mt-1">{user.email}</p>
                </div>
              </Card>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
