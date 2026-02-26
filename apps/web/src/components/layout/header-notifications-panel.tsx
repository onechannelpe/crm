import { createSignal, For, Show } from "solid-js";

import {
  markAllNotificationsRead,
  markNotificationRead,
} from "~/actions/app-notifications";
import Bell from "~/components/icons/bell";
import { useDismissibleLayer } from "~/components/ui/utilities/use-dismissible-layer";
import { headerNotificationsQuery } from "~/lib/queries/notifications";
import { createOptimisticQuery } from "~/lib/ui/create-optimistic-query";
import { runOptimistic } from "~/lib/ui/run-optimistic";
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
  const {
    data: feed,
    write: writeFeed,
    revalidate: revalidateFeed,
  } = createOptimisticQuery(() => headerNotificationsQuery(), {
    initialValue: { unreadCount: 0, notifications: [] },
    key: headerNotificationsQuery.key,
  });

  let containerRef: HTMLDivElement | undefined;
  useDismissibleLayer({
    enabled: open,
    onDismiss: () => setOpen(false),
    getContainer: () => containerRef,
  });

  const handleMarkRead = async (notificationId: number) => {
    try {
      await runOptimistic({
        read: feed,
        write: writeFeed,
        optimistic: (prev) => ({
          unreadCount: Math.max(
            0,
            prev.unreadCount -
              (prev.notifications.some(
                (item) => item.id === notificationId && item.readAt === null,
              )
                ? 1
                : 0),
          ),
          notifications: prev.notifications.map((item) =>
            item.id === notificationId
              ? { ...item, readAt: Date.now() }
              : item,
          ),
        }),
        commit: async () => {
          await markNotificationRead(notificationId);
        },
      });
    } catch {
      // Rollback handled by runOptimistic
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await runOptimistic({
        read: feed,
        write: writeFeed,
        optimistic: (prev) => ({
          unreadCount: 0,
          notifications: prev.notifications.map((item) => ({
            ...item,
            readAt: item.readAt ?? Date.now(),
          })),
        }),
        commit: async () => {
          await markAllNotificationsRead();
        },
        reconcile: revalidateFeed,
      });
    } catch {
      // Rollback handled by runOptimistic
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
