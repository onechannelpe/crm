import { useNavigate } from "@solidjs/router";
import { createResource, createSignal, For, Show } from "solid-js";

import {
  getHeaderNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "~/actions/app-notifications";
import Bell from "~/components/icons/bell";
import { Button } from "~/components/ui/button";

function priorityClass(priority: "high" | "normal" | "low"): string {
  if (priority === "high") return "border-l-red-500";
  if (priority === "low") return "border-l-slate-300";
  return "border-l-blue-500";
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HeaderNotificationsPanel() {
  const navigate = useNavigate();
  const [open, setOpen] = createSignal(false);
  const [feed, { refetch }] = createResource(getHeaderNotifications);

  const handleMarkAll = async () => {
    await markAllNotificationsRead();
    await refetch();
  };

  const handleOpenItem = async (id: number, actionUrl: string | null) => {
    await markNotificationRead(id);
    await refetch();
    if (actionUrl) navigate(actionUrl);
  };

  return (
    <div class="relative">
      <Button
        variant="ghost"
        size="icon"
        class="text-muted-foreground relative"
        onClick={() => {
          setOpen((prev) => !prev);
          void refetch();
        }}
      >
        <Bell class="w-4 h-4" />
        <Show when={(feed()?.unreadCount ?? 0) > 0}>
          <span class="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-destructive text-white text-[10px] leading-4 text-center">
            {Math.min(feed()?.unreadCount ?? 0, 99)}
          </span>
        </Show>
      </Button>
      <Show when={open()}>
        <div class="absolute right-0 mt-2 w-96 rounded-md border bg-white shadow-md z-20">
          <div class="p-3 border-b flex items-center justify-between">
            <p class="text-sm font-semibold">Notificaciones</p>
            <Button
              variant="ghost"
              class="h-8 px-2 text-xs"
              disabled={(feed()?.unreadCount ?? 0) === 0}
              onClick={() => {
                void handleMarkAll();
              }}
            >
              Marcar todas leidas
            </Button>
          </div>
          <div class="max-h-96 overflow-auto p-2 space-y-2">
            <Show
              when={(feed()?.notifications.length ?? 0) > 0}
              fallback={
                <p class="text-sm text-muted-foreground px-2 py-4">
                  Sin notificaciones por ahora.
                </p>
              }
            >
              <For each={feed()?.notifications ?? []}>
                {(item) => (
                  <button
                    type="button"
                    class={`w-full text-left border rounded p-2 border-l-4 hover:bg-muted/40 ${priorityClass(item.priority)} ${item.readAt ? "opacity-70" : ""}`}
                    onClick={() => {
                      void handleOpenItem(item.id, item.actionUrl);
                    }}
                  >
                    <p class="text-sm font-medium">{item.title}</p>
                    <p class="text-xs text-muted-foreground mt-1">
                      {item.bodyText}
                    </p>
                    <p class="text-[11px] text-muted-foreground mt-2">
                      {formatTime(item.createdAt)}
                    </p>
                  </button>
                )}
              </For>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  );
}
