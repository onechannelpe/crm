import { createAsync, useParams, useSearchParams } from "@solidjs/router";
import { createMemo, Match, Show, Switch } from "solid-js";

import Activity from "~/components/icons/activity";
import Info from "~/components/icons/info";
import ShieldCheck from "~/components/icons/shield-check";
import { getUserInitials } from "~/components/layout/account-menu-utils";
import { useAuthenticatedSession } from "~/components/providers/authenticated-session-provider";
import { Avatar } from "~/components/ui/display/avatar";
import { Badge } from "~/components/ui/display/badge";
import { MemberAdminActions } from "~/features/settings-members/member-admin-actions";
import { MemberCapacityTab } from "~/features/settings-members/member-capacity-tab";
import { MemberInfoTab } from "~/features/settings-members/member-info-tab";
import { MemberPermissionsTab } from "~/features/settings-members/member-permissions-tab";
import { SettingsPageLayout } from "~/features/settings-shell/page/settings-page-layout";
import {
  TabStrip,
  type TabItem,
} from "~/features/side-panel/components/tab-strip";
import { hasPermission } from "~/lib/auth/access/rbac";
import {
  getRoleBadgeVariant,
  getRoleLabel,
} from "~/lib/auth/access/role-display";
import { memberDetailQuery } from "~/lib/queries/members";
import { shortName } from "~/lib/users/display-name";

import styles from "~/features/settings-members/settings-members.module.css";

type MemberTabId = "info" | "permissions" | "capacity";

export default function SettingsMemberDetailPage() {
  const params = useParams();
  const [search, setSearch] = useSearchParams();
  const { currentUser } = useAuthenticatedSession();
  const detail = createAsync(() => memberDetailQuery(params.userId));

  // Match the server permission check and hide capacity for non-executives.
  const canSeeCapacity = () =>
    hasPermission(currentUser().role, "capacity:read:team");

  const tabs = createMemo<TabItem<MemberTabId>[]>(() => {
    const record = detail();
    const list: TabItem<MemberTabId>[] = [
      { id: "info", label: "Información", icon: Info },
      { id: "permissions", label: "Permisos", icon: ShieldCheck },
    ];

    if (record?.role === "executive" && canSeeCapacity()) {
      list.push({
        id: "capacity",
        label: "Capacidad",
        icon: Activity,
      });
    }

    return list;
  });

  const activeTab = createMemo<MemberTabId>(() => {
    const requested = search.tab;
    const match = tabs().find((tab) => tab.id === requested);

    return match?.id ?? "info";
  });

  return (
    <SettingsPageLayout>
      <Show when={detail()}>
        {(record) => (
          // Remount tabs when the member changes, but not on revalidation.
          <Show when={record().id} keyed>
            {(memberId) => (
              <>
                <header class={styles.detailHeader}>
                  <Avatar
                    class={styles.detailAvatar}
                    imageUrl={record().avatarUrl}
                    fallback={getUserInitials(shortName(record()))}
                  />

                  <div class={styles.detailHeaderText}>
                    <span class={styles.detailName}>{shortName(record())}</span>
                    <span class={styles.detailEmail}>{record().email}</span>

                    <div class={styles.headerBadges}>
                      <Badge variant={getRoleBadgeVariant(record().role)}>
                        {getRoleLabel(record().role)}
                      </Badge>

                      <Show
                        when={record().isActive}
                        fallback={<Badge variant="secondary">Inactivo</Badge>}
                      >
                        <Badge variant="success">Activo</Badge>
                      </Show>
                    </div>
                  </div>
                </header>

                <TabStrip
                  tabs={tabs()}
                  activeTab={activeTab()}
                  onTabSelect={(id) => setSearch({ tab: id })}
                />

                <div class={styles.tabPane}>
                  <Switch>
                    <Match when={activeTab() === "info"}>
                      <MemberInfoTab detail={record()} />
                      <MemberAdminActions detail={record()} />
                    </Match>

                    <Match when={activeTab() === "permissions"}>
                      <MemberPermissionsTab detail={record()} />
                    </Match>

                    <Match when={activeTab() === "capacity"}>
                      <MemberCapacityTab userId={memberId} />
                    </Match>
                  </Switch>
                </div>
              </>
            )}
          </Show>
        )}
      </Show>
    </SettingsPageLayout>
  );
}
