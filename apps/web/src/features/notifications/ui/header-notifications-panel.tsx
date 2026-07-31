import { useAction } from "@solidjs/router";
import { clsx } from "clsx";
import { createSignal, For, Show } from "solid-js";

import { createOptimisticQuery } from "~/browser/ui/create-optimistic-query";
import Bell from "~/components/icons/bell";
import { TopBarActionButton } from "~/components/layout/top-bar-action-button";
import { TopBarTooltip } from "~/components/layout/top-bar-tooltip";
import { useDismissibleLayer } from "~/components/ui/utilities/use-dismissible-layer";
import { formatAppDateTime } from "~/domain/time/app-time";
import {
  markAllNotificationsReadMutation,
  markNotificationReadMutation,
} from "~/features/notifications/data/mutations";
import { headerNotificationsQuery } from "~/rpc/notifications/header-notifications";

import styles from "./header-notifications-panel.module.css";

export function HeaderNotificationsPanel() {
  const [open, setOpen] = createSignal(false);
  const { data: feed, update: updateFeed } = createOptimisticQuery(
    headerNotificationsQuery,
    { initialValue: { unreadCount: 0, notifications: [] } },
  );
  const markRead = useAction(markNotificationReadMutation);
  const markAllRead = useAction(markAllNotificationsReadMutation);

  let containerRef: HTMLDivElement | undefined;
  useDismissibleLayer({
    enabled: open,
    onDismiss: () => setOpen(false),
    getContainer: () => containerRef,
  });

  const handleMarkRead = async (notificationId: string) => {
    try {
      await updateFeed({
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
            item.id === notificationId ? { ...item, readAt: Date.now() } : item,
          ),
        }),
        commit: async () => {
          await markRead(notificationId);
        },
      });
    } catch {
      // update() rolls back the optimistic value on failure.
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await updateFeed({
        optimistic: (prev) => ({
          unreadCount: 0,
          notifications: prev.notifications.map((item) => ({
            ...item,
            readAt: item.readAt ?? Date.now(),
          })),
        }),
        commit: async () => {
          await markAllRead();
        },
      });
    } catch {}
  };

  return (
    <div
      ref={(element) => {
        containerRef = element;
      }}
      class={styles.root}
    >
      <TopBarTooltip content="Notificaciones">
        <TopBarActionButton
          ariaLabel="Notificaciones"
          iconOnly
          onClick={() => setOpen((value) => !value)}
          class={styles.triggerRoot}
          buttonClass={styles.trigger}
        >
          <>
            <span class={styles.icon}>
              <Bell size={14} />
            </span>
            <Show when={feed().unreadCount > 0}>
              <span class={styles.badge}>
                {Math.min(feed().unreadCount, 99)}
              </span>
            </Show>
          </>
        </TopBarActionButton>
      </TopBarTooltip>

      <Show when={open()}>
        <div class={styles.panel}>
          <div class={styles.panelHeader}>
            <p class={styles.panelTitle}>Notificaciones</p>
            <button
              type="button"
              class={styles.markAll}
              onClick={() => void handleMarkAllRead()}
              disabled={feed().unreadCount === 0}
            >
              Marcar todas como leídas
            </button>
          </div>

          <Show
            when={feed().notifications.length > 0}
            fallback={<p class={styles.empty}>Sin notificaciones aún.</p>}
          >
            <div class={styles.list}>
              <For each={feed().notifications}>
                {(item) => (
                  <article
                    class={clsx(
                      styles.item,
                      item.readAt === null && styles.itemUnread,
                    )}
                  >
                    <p class={styles.title}>{item.title}</p>
                    <p class={styles.body}>{item.bodyText}</p>
                    <div class={styles.meta}>
                      <span class={styles.time}>
                        {formatAppDateTime(item.createdAt)}
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
