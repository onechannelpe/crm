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
import { SettingsPageLayout } from "~/features/settings-shell/page/settings-page-layout";
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

function isChannelAvailable(
  data: NotificationPreferencesView,
  channel: Channel,
) {
  return (
    data.channels.find((entry) => entry.channel === channel)?.available ?? false
  );
}

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

  async function handleToggle(
    category: string,
    channel: Channel,
    enabled: boolean,
  ) {
    try {
      await savePreference(category, channel, enabled);
    } catch (caught: unknown) {
      enqueueErrorSnackBar(actionErrorMessage(caught));
    }
  }

  function getRows(data: NotificationPreferencesView, channel: Channel) {
    return data.categories.map((category) => {
      const categoryChannel = category.channels.find(
        (entry) => entry.channel === channel,
      );

      return {
        title: category.label,
        description: category.description,
        value: categoryChannel?.enabled ?? false,
        disabled: !categoryChannel?.controllable || !categoryChannel.available,
        onToggle: (value: boolean) =>
          void handleToggle(category.category, channel, value),
      };
    });
  }

  const activeChannelIcon = () =>
    CHANNELS.find((channel) => channel.id === activeChannel())?.icon ?? Mail;

  return (
    <SettingsPageLayout>
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
                      component={activeChannelIcon()}
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
                  <For each={getRows(data(), activeChannel())}>
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
    </SettingsPageLayout>
  );
}
