import { useParams } from "@solidjs/router";
import { Show } from "solid-js";

import { SettingsSection } from "~/components/settings/SettingsSection";
import { getPermissions, isRole } from "~/domain/auth/access/rbac";
import { getRoleLabel } from "~/domain/auth/access/role-display";
import { SettingsPageLayout } from "~/features/settings-shell/page/settings-page-layout";
import { RolePermissions } from "~/features/team-management/role-permissions";

import styles from "~/features/team-management/team-management.module.css";

export default function SettingsRoleDetailPage() {
  const params = useParams<{ roleId: string }>();

  const role = () => (isRole(params.roleId) ? params.roleId : null);

  return (
    <SettingsPageLayout>
      <Show
        when={role()}
        keyed
        fallback={<p class={styles.rosterEmpty}>Rol no encontrado.</p>}
      >
        {(currentRole) => (
          <>
            <header class={styles.detailHeader}>
              <div class={styles.detailHeaderText}>
                <span class={styles.detailName}>
                  {getRoleLabel(currentRole)}
                </span>
              </div>
            </header>

            <div class={styles.tabPane}>
              <SettingsSection
                title="Permisos"
                description="Lo que este rol puede ver y hacer en el sistema."
              >
                <RolePermissions granted={getPermissions(currentRole)} />
              </SettingsSection>
            </div>
          </>
        )}
      </Show>
    </SettingsPageLayout>
  );
}
