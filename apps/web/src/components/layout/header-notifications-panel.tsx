import { createResource, createSignal, For, Show } from "solid-js";

import {
  getHeaderNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "~/actions/app-notifications";
import Bell from "~/components/icons/bell";
import { useDismissibleLayer } from "~/components/ui/utilities/use-dismissible-layer";
import { cn } from "~/lib/utils";

import styles from "./header-notifications-panel.module.css";

function formatTimestamp(value: number): string {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HeaderNotificationsPanel() {
  const [open, setOpen] = createSignal(false);
  const [feed, { mutate, refetch }] = createResource(
    () => true,
    () => getHeaderNotifications(),
    {
      initialValue: { unreadCount: 0, notifications: [] },
      ssrLoadFrom: "initial",
    },
  );

  let containerRef: HTMLDivElement | undefined;
  useDismissibleLayer({
    enabled: open,
    onDismiss: () => setOpen(false),
    getContainer: () => containerRef,
  });

  const handleMarkRead = async (notificationId: number) => {
    const previous = feed.latest ?? feed();
    const now = Date.now();
    mutate((current) => ({
      unreadCount: Math.max(
        0,
        current.unreadCount -
          (current.notifications.some(
            (item) => item.id === notificationId && item.readAt === null,
          )
            ? 1
            : 0),
      ),
      notifications: current.notifications.map((item) =>
        item.id === notificationId ? { ...item, readAt: now } : item,
      ),
    }));
    try {
      await markNotificationRead(notificationId);
    } catch {
      mutate(() => previous);
    }
  };

  const handleMarkAllRead = async () => {
    const previous = feed.latest ?? feed();
    const now = Date.now();
    mutate((current) => ({
      unreadCount: 0,
      notifications: current.notifications.map((item) => ({
        ...item,
        readAt: item.readAt ?? now,
      })),
    }));
    try {
      await markAllNotificationsRead();
      await refetch();
    } catch {
      mutate(() => previous);
    }
  };

  return (
    <div
      ref={(element) => {
        containerRef = element;
      }}
      class={styles.root}
    >
      <button
        type="button"
        class={styles.trigger}
        aria-label="Notifications"
        onClick={() => setOpen((value) => !value)}
      >
        <Bell size={16} />
        <Show when={feed().unreadCount > 0}>
          <span class={styles.badge}>{Math.min(feed().unreadCount, 99)}</span>
        </Show>
      </button>

      <Show when={open()}>
        <div class={styles.panel}>
          <div class={styles.panelHeader}>
            <p class={styles.panelTitle}>Notifications</p>
            <button
              type="button"
              class={styles.markAll}
              onClick={() => void handleMarkAllRead()}
              disabled={feed().unreadCount === 0}
            >
              Mark all as read
            </button>
          </div>

          <Show
            when={feed().notifications.length > 0}
            fallback={<p class={styles.empty}>No notifications yet.</p>}
          >
            <div class={styles.list}>
              <For each={feed().notifications}>
                {(item) => (
                  <article
                    class={cn(
                      styles.item,
                      item.readAt === null && styles.itemUnread,
                    )}
                  >
                    <p class={styles.title}>{item.title}</p>
                    <p class={styles.body}>{item.bodyText}</p>
                    <div class={styles.meta}>
                      <span class={styles.time}>
                        {formatTimestamp(item.createdAt)}
                      </span>
                      <Show when={item.readAt === null}>
                        <button
                          type="button"
                          class={styles.readBtn}
                          onClick={() => void handleMarkRead(item.id)}
                        >
                          Mark read
                        </button>
                      </Show>
                    </div>
                  </article>
                )}
              </For>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
}
