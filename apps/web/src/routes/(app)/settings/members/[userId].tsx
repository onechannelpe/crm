import { createAsync, useParams, useSearchParams } from "@solidjs/router";
import { createMemo, Match, Show, Switch } from "solid-js";

import Activity from "~/components/icons/activity";
import Info from "~/components/icons/info";
import ShieldCheck from "~/components/icons/shield-check";
import { getUserInitials } from "~/components/layout/account-menu-utils";
import { useAuthenticatedSession } from "~/components/providers/authenticated-session-provider";
import { Avatar } from "~/components/ui/display/avatar";
import { Badge } from "~/components/ui/display/badge";
import { hasPermission } from "~/domain/auth/access/rbac";
import {
  getRoleBadgeVariant,
  getRoleLabel,
} from "~/domain/auth/access/role-display";
import { shortName } from "~/domain/identity/display-name";
import { SettingsPageLayout } from "~/features/settings-shell/page/settings-page-layout";
import {
  TabStrip,
  type TabItem,
} from "~/features/side-panel/components/tab-strip";
import { memberDetailQuery } from "~/features/team-management/data/queries";
import { MemberAdminActions } from "~/features/team-management/member-admin-actions";
import { MemberCapacityTab } from "~/features/team-management/member-capacity-tab";
import { MemberInfoTab } from "~/features/team-management/member-info-tab";
import { MemberPermissionsTab } from "~/features/team-management/member-permissions-tab";

import styles from "~/features/team-management/team-management.module.css";

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
