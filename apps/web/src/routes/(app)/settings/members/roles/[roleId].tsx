import { useParams } from "@solidjs/router";
import { Show } from "solid-js";

import { SettingsSection } from "~/components/settings/SettingsSection";
import { Badge } from "~/components/ui/display/badge";
import { RolePermissions } from "~/features/settings-members/role-permissions";
import { getPermissions, isRole } from "~/lib/auth/access/rbac";
import {
  getRoleBadgeVariant,
  getRoleLabel,
} from "~/lib/auth/access/role-display";

import styles from "~/features/settings-members/settings-members.module.css";

export default function SettingsRoleDetailPage() {
  const params = useParams();
  const role = () => {
    const roleId = params.roleId;
    return roleId && isRole(roleId) ? roleId : null;
  };

  return (
    <Show
      when={role()}
      keyed
      fallback={<p class={styles.rosterEmpty}>Rol no encontrado.</p>}
    >
      {(activeRole) => (
        <>
          <header class={styles.detailHeader}>
            <div class={styles.detailHeaderText}>
              <span class={styles.detailName}>{getRoleLabel(activeRole)}</span>
              <div class={styles.headerBadges}>
                <Badge variant={getRoleBadgeVariant(activeRole)}>
                  {getRoleLabel(activeRole)}
                </Badge>
              </div>
            </div>
          </header>

          <div class={styles.tabPane}>
            <SettingsSection
              title="Permisos"
              description="Lo que este rol puede ver y hacer en el sistema."
            >
              <RolePermissions granted={getPermissions(activeRole)} />
            </SettingsSection>
          </div>
        </>
      )}
    </Show>
  );
}
