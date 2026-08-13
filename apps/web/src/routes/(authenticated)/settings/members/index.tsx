import { useSearchParams } from "@solidjs/router";
import { createMemo, Match, Switch } from "solid-js";

import Mail from "~/components/icons/mail";
import ShieldCheck from "~/components/icons/shield-check";
import UserRound from "~/components/icons/user-round";
import { useAuthenticatedSession } from "~/components/providers/authenticated-session-provider";
import { hasPermission } from "~/domain/auth/access/rbac";
import { SettingsPageLayout } from "~/features/settings-shell/page/settings-page-layout";
import {
  TabStrip,
  type TabItem,
} from "~/features/side-panel/components/tab-strip";
import { InviteTab } from "~/features/team-management/invite-tab";
import { RolesTab } from "~/features/team-management/roles-tab";
import { TeamTab } from "~/features/team-management/team-tab";

import styles from "~/features/team-management/team-management.module.css";

type MembersTabId = "team" | "invite" | "roles";

export default function SettingsMembersPage() {
  const { currentUser } = useAuthenticatedSession();
  const [params, setParams] = useSearchParams();

  // Invites require `team:invite`, not `team:manage`.
  const canInvite = createMemo(() =>
    hasPermission(currentUser().role, "team:invite"),
  );

  const tabs = createMemo<TabItem<MembersTabId>[]>(() => {
    const items: TabItem<MembersTabId>[] = [
      { id: "team", label: "Equipo", icon: UserRound },
    ];

    if (canInvite()) {
      items.push({ id: "invite", label: "Invitaciones", icon: Mail });
    }

    items.push({ id: "roles", label: "Roles", icon: ShieldCheck });

    return items;
  });

  const activeTab = createMemo<MembersTabId>(() => {
    const requestedTab = params.tab;
    const matchingTab = tabs().find((tab) => tab.id === requestedTab);

    return matchingTab?.id ?? "team";
  });

  return (
    <SettingsPageLayout>
      <div class={styles.tabStrip}>
        <TabStrip
          tabs={tabs()}
          activeTab={activeTab()}
          onTabSelect={(id) => setParams({ tab: id })}
        />
      </div>

      <div class={styles.tabPane}>
        <Switch>
          <Match when={activeTab() === "team"}>
            <TeamTab />
          </Match>

          <Match when={activeTab() === "invite"}>
            <InviteTab />
          </Match>

          <Match when={activeTab() === "roles"}>
            <RolesTab />
          </Match>
        </Switch>
      </div>
    </SettingsPageLayout>
  );
}
