import { useSearchParams } from "@solidjs/router";
import { createMemo, Match, Switch } from "solid-js";

import Mail from "~/components/icons/mail";
import ShieldCheck from "~/components/icons/shield-check";
import UserRound from "~/components/icons/user-round";
import { useAuthenticatedSession } from "~/components/providers/authenticated-session-provider";
import { InviteTab } from "~/features/settings-members/invite-tab";
import { RolesTab } from "~/features/settings-members/roles-tab";
import { TeamTab } from "~/features/settings-members/team-tab";
import {
  TabStrip,
  type TabItem,
} from "~/features/side-panel/components/tab-strip";
import { hasPermission } from "~/lib/auth/access/rbac";

import styles from "~/features/settings-members/settings-members.module.css";

type MembersTabId = "team" | "invite" | "roles";

export default function SettingsMembersPage() {
  const { currentUser } = useAuthenticatedSession();
  const [params, setParams] = useSearchParams();

  // Invitations reuse the existing invite actions, which are gated on
  // hr:manage; hide the tab for team:manage roles that lack it (e.g. sales
  // managers) so they never open a tab the server would reject.
  const canInvite = createMemo(() =>
    hasPermission(currentUser().role, "hr:manage"),
  );

  const tabs = createMemo<TabItem<MembersTabId>[]>(() => {
    const list: TabItem<MembersTabId>[] = [
      { id: "team", label: "Equipo", icon: UserRound },
    ];
    if (canInvite()) {
      list.push({ id: "invite", label: "Invitaciones", icon: Mail });
    }
    list.push({ id: "roles", label: "Roles", icon: ShieldCheck });
    return list;
  });

  const activeTab = createMemo<MembersTabId>(() => {
    const requested = params.tab;
    const match = tabs().find((tab) => tab.id === requested);
    return match?.id ?? "team";
  });

  return (
    <>
      <TabStrip
        tabs={tabs()}
        activeTab={activeTab()}
        onTabSelect={(id) => setParams({ tab: id })}
      />
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
    </>
  );
}
