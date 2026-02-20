import { useNavigate } from "@solidjs/router";
import { createResource, createSignal, For, Show, onMount } from "solid-js";

import {
  type HeaderNotificationFeed,
  getHeaderNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "~/actions/app-notifications";
import Bell from "~/components/icons/bell";
import { Button } from "~/components/ui/button";
import { DS_Z_INDEX } from "~/components/ui/theme/design-system";
import { useDismissibleLayer } from "~/components/ui/utilities/use-dismissible-layer";
import { runOptimistic } from "~/lib/ui/run-optimistic";

const EMPTY_FEED: HeaderNotificationFeed = {
  unreadCount: 0,
  notifications: [],
};

function priorityClass(priority: "high" | "normal" | "low"): string {
  if (priority === "high") return "border-l-destructive";
  if (priority === "low") return "border-l-border";
  return "border-l-primary";
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
  let containerRef: HTMLDivElement | undefined;

  useDismissibleLayer({
    enabled: open,
    onDismiss: () => setOpen(false),
    getContainer: () => containerRef,
  });
  const [feed, { mutate, refetch }] = createResource(
    () => true,
    async () => getHeaderNotifications(),
    { initialValue: EMPTY_FEED, ssrLoadFrom: "initial" },
  );
  const currentFeed = () => feed.latest ?? EMPTY_FEED;

  onMount(() => {
    void refetch();
  });

  const handleMarkAll = async () => {
    try {
      await runOptimistic({
        read: currentFeed,
        write: (next) => mutate(() => next),
        optimistic: (prev) => {
          const now = Date.now();
          return {
            unreadCount: 0,
            notifications: prev.notifications.map((item) => ({
              ...item,
              readAt: item.readAt ?? now,
            })),
          };
        },
        commit: async () => {
          await markAllNotificationsRead();
        },
        reconcile: () => {
          void refetch();
        },
      });
    } catch {
      void refetch();
    }
  };

  const handleOpenItem = async (id: number, actionUrl: string | null) => {
    try {
      await runOptimistic({
        read: currentFeed,
        write: (next) => mutate(() => next),
        optimistic: (prev) => {
          let changed = false;
          const notifications = prev.notifications.map((item) => {
            if (item.id !== id || item.readAt) return item;
            changed = true;
            return { ...item, readAt: Date.now() };
          });
          return {
            unreadCount: changed
              ? Math.max(0, prev.unreadCount - 1)
              : prev.unreadCount,
            notifications,
          };
        },
        commit: async () => {
          await markNotificationRead(id);
        },
        reconcile: () => {
          void refetch();
        },
      });
    } catch {
      void refetch();
    }
    if (actionUrl) navigate(actionUrl);
  };

  return (
    <div
      class="relative"
      ref={(element) => {
        containerRef = element;
      }}
    >
      <Button
        variant="ghost"
        size="icon"
        class="relative rounded-full text-muted-foreground"
        onClick={() => {
          setOpen((prev) => !prev);
        }}
      >
        <Bell class="w-4 h-4" />
        <Show when={currentFeed().unreadCount > 0}>
          <span class="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-destructive text-white text-[10px] leading-4 text-center">
            {Math.min(currentFeed().unreadCount, 99)}
          </span>
        </Show>
      </Button>
      <Show when={open()}>
        <div
          class="crm-overlay-panel absolute right-0 mt-2 w-96 rounded-2xl"
          style={{ "z-index": DS_Z_INDEX.overlay }}
        >
          <div class="flex items-center justify-between border-b p-3">
            <p class="text-sm font-semibold">Notificaciones</p>
            <Button
              variant="ghost"
              class="h-8 px-2 text-xs"
              disabled={currentFeed().unreadCount === 0}
              onClick={() => {
                void handleMarkAll();
              }}
            >
              Marcar todas leidas
            </Button>
          </div>
          <div class="max-h-96 space-y-2 overflow-auto p-2">
            <Show
              when={currentFeed().notifications.length > 0}
              fallback={
                <p class="text-sm text-muted-foreground px-2 py-4">
                  Sin notificaciones por ahora.
                </p>
              }
            >
              <For each={currentFeed().notifications}>
                {(item) => (
                  <Button
                    type="button"
                    variant="ghost"
                    class={`h-auto w-full justify-start rounded-xl border border-l-4 p-2.5 text-left hover:bg-muted/40 ${priorityClass(item.priority)} ${item.readAt ? "opacity-70" : ""}`}
                    onClick={() => {
                      void handleOpenItem(item.id, item.actionUrl);
                      setOpen(false);
                    }}
                  >
                    <p class="text-sm font-medium">{item.title}</p>
                    <p class="text-xs text-muted-foreground mt-1">
                      {item.bodyText}
                    </p>
                    <p class="text-[11px] text-muted-foreground mt-2">
                      {formatTime(item.createdAt)}
                    </p>
                  </Button>
                )}
              </For>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  );
}
