import { createAsync, type RouteDefinition, useAction } from "@solidjs/router";
import { createSignal, For, Show } from "solid-js";
import { Dynamic } from "solid-js/web";

import type { NotificationPreferencesView } from "~/actions/settings/notifications";
import { useSnackBar } from "~/components/feedback/snack-bar-manager/use-snack-bar";
import BrandWhatsapp from "~/components/icons/brand-whatsapp";
import Mail from "~/components/icons/mail";
import {
  SettingsOptionCard,
  SettingsOptionCardRow,
} from "~/components/settings/settings-option-card";
import { SettingsSection } from "~/components/settings/SettingsSection";
import { Toggle } from "~/components/ui/input/toggle";
import {
  TabStrip,
  type TabIconComponent,
} from "~/features/side-panel/components/tab-strip";
import { setNotificationPreferenceMutation } from "~/lib/mutations/notifications";
import { notificationPreferencesQuery } from "~/lib/queries/notifications";
import { actionErrorMessage } from "~/lib/wire-error";

import styles from "./notifications.module.css";

type Channel = "email" | "whatsapp";

const CHANNELS = [
  { id: "email", label: "Correo", icon: Mail },
  { id: "whatsapp", label: "WhatsApp", icon: BrandWhatsapp },
] as const satisfies ReadonlyArray<{
  id: Channel;
  label: string;
  icon: TabIconComponent;
}>;

const EMPTY_STATE: Record<Channel, { title: string; text: string }> = {
  email: {
    title: "Correo no configurado",
    text: "Verifica tu correo para activar estas notificaciones.",
  },
  whatsapp: {
    title: "WhatsApp no configurado",
    text: "Escribe “/verificar” por WhatsApp desde tu número registrado para activar estas notificaciones.",
  },
};

const isChannelAvailable = (
  data: NotificationPreferencesView,
  channel: Channel,
) => data.channels.find((c) => c.channel === channel)?.available ?? false;

export const route = {
  preload: () => {
    void notificationPreferencesQuery();
  },
} satisfies RouteDefinition;

export default function NotificationsSettingsPage() {
  const preferences = createAsync(() => notificationPreferencesQuery());
  const { enqueueErrorSnackBar } = useSnackBar();
  const savePreference = useAction(setNotificationPreferenceMutation);
  const [activeChannel, setActiveChannel] = createSignal<Channel>("email");

  const onToggle = async (
    category: string,
    channel: Channel,
    enabled: boolean,
  ) => {
    try {
      await savePreference(category, channel, enabled);
    } catch (caught: unknown) {
      enqueueErrorSnackBar(actionErrorMessage(caught));
    }
  };

  const rowsFor = (data: NotificationPreferencesView, channel: Channel) =>
    data.categories.map((category) => {
      const cell = category.channels.find((c) => c.channel === channel);
      return {
        title: category.label,
        description: category.description,
        value: cell?.enabled ?? false,
        disabled: !cell?.controllable || !cell.available,
        onToggle: (value: boolean) =>
          void onToggle(category.category, channel, value),
      };
    });

  const activeIcon = () =>
    CHANNELS.find((c) => c.id === activeChannel())?.icon ?? Mail;

  return (
    <SettingsSection
      title="Notificaciones"
      description="Elige cómo quieres recibir cada tipo de aviso. Las notificaciones dentro de la app siempre están activas."
    >
      <TabStrip
        tabs={CHANNELS.map((channel) => ({
          id: channel.id,
          label: channel.label,
          icon: channel.icon,
        }))}
        activeTab={activeChannel()}
        onTabSelect={setActiveChannel}
      />

      <div class={styles.tabPane}>
        <Show when={preferences()}>
          {(data) => (
            <Show
              when={isChannelAvailable(data(), activeChannel())}
              fallback={
                <div class={styles.emptyState}>
                  <Dynamic
                    component={activeIcon()}
                    size={28}
                    class={styles.emptyIcon}
                  />
                  <p class={styles.emptyTitle}>
                    {EMPTY_STATE[activeChannel()].title}
                  </p>
                  <p class={styles.emptyText}>
                    {EMPTY_STATE[activeChannel()].text}
                  </p>
                </div>
              }
            >
              <SettingsOptionCard>
                <For each={rowsFor(data(), activeChannel())}>
                  {(row) => (
                    <SettingsOptionCardRow
                      interactive={!row.disabled}
                      title={row.title}
                      description={row.description}
                      control={
                        <Toggle
                          value={row.value}
                          disabled={row.disabled}
                          ariaLabel={row.title}
                          onChange={row.onToggle}
                        />
                      }
                    />
                  )}
                </For>
              </SettingsOptionCard>
            </Show>
          )}
        </Show>
      </div>
    </SettingsSection>
  );
}
