import { useParams } from "@solidjs/router";
import { Show } from "solid-js";

import { SettingsSection } from "~/components/settings/SettingsSection";
import { Badge } from "~/components/ui/display/badge";
import { RolePermissions } from "~/features/settings-members/role-permissions";
import { SettingsPageLayout } from "~/features/settings-shell/page/settings-page-layout";
import { getPermissions, isRole } from "~/lib/auth/access/rbac";
import {
  getRoleBadgeVariant,
  getRoleLabel,
} from "~/lib/auth/access/role-display";

import styles from "~/features/settings-members/settings-members.module.css";

export default function SettingsRoleDetailPage() {
  const params = useParams<{ roleId: string }>();

  const activeRole = () => (isRole(params.roleId) ? params.roleId : null);

  return (
    <SettingsPageLayout>
      <Show
        when={activeRole()}
        keyed
        fallback={<p class={styles.rosterEmpty}>Rol no encontrado.</p>}
      >
        {(role) => (
          <>
            <header class={styles.detailHeader}>
              <div class={styles.detailHeaderText}>
                <span class={styles.detailName}>{getRoleLabel(role)}</span>

                <div class={styles.headerBadges}>
                  <Badge variant={getRoleBadgeVariant(role)}>
                    {getRoleLabel(role)}
                  </Badge>
                </div>
              </div>
            </header>

            <div class={styles.tabPane}>
              <SettingsSection
                title="Permisos"
                description="Lo que este rol puede ver y hacer en el sistema."
              >
                <RolePermissions granted={getPermissions(role)} />
              </SettingsSection>
            </div>
          </>
        )}
      </Show>
    </SettingsPageLayout>
  );
}
