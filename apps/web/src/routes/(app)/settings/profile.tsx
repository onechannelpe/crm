import { createSignal } from "solid-js";

import { updateUserProfile } from "~/actions/settings";
import { useToast } from "~/components/feedback/toast-provider";
import { useSession } from "~/components/providers/session-provider";
import { SettingsSection } from "~/components/settings/SettingsSection";
import { Badge } from "~/components/ui/display/badge";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import {
  getRoleBadgeVariant,
  getRoleLabel,
} from "~/lib/auth/access/role-display";
import { getWorkspaceLabel } from "~/lib/auth/access/workspace-label";
import { getErrorMessage } from "~/lib/errors";

import styles from "./settings-page.module.css";

export default function ProfilePage() {
  const { currentUser } = useSession();
  const { showToast } = useToast();
  const user = () => currentUser();

  const [profileName, setProfileName] = createSignal(user().fullName || "");
  const [profilePhone, setProfilePhone] = createSignal(user().phoneE164 || "");
  const [savingProfile, setSavingProfile] = createSignal(false);

  const saveProfile = async (e: Event) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateUserProfile(profileName(), profilePhone());
      showToast("success", "Profile updated");
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "Failed to update profile"));
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div class={styles.content}>
      <SettingsSection
        title="Personal info"
        description="Update your photo and personal details."
      >
        <form
          onSubmit={(e) => {
            void saveProfile(e);
          }}
        >
          <div class={styles.avatarRow}>
            <div class={styles.avatar}>
              {user().fullName?.charAt(0) || user().email.charAt(0)}
            </div>
            <div>
              <p class={styles.avatarName}>{user().fullName || "User"}</p>
              <p class={styles.avatarEmail}>{user().email}</p>
            </div>
          </div>

          <div class={styles.formGrid}>
            <Input
              label="Full name"
              value={profileName()}
              onInput={(e) => setProfileName(e.currentTarget.value)}
              required
            />
            <div class={styles.readOnlyField}>
              <span class={styles.readOnlyLabel}>Email address</span>
              <p class={styles.readOnlyValue}>{user().email}</p>
            </div>
            <Input
              label="Phone number"
              value={profilePhone()}
              onInput={(e) => setProfilePhone(e.currentTarget.value)}
              placeholder="+1 234 567 8900"
            />
          </div>

          <div class={styles.formActions}>
            <Button type="submit" disabled={savingProfile()}>
              {savingProfile() ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      </SettingsSection>

      <SettingsSection
        title="Identity"
        description="Your role and permissions within the workspace."
      >
        <div class={styles.identityMeta}>
          <div class={styles.inline}>
            <span class={styles.label}>Role</span>
            <Badge variant={getRoleBadgeVariant(user().role)}>
              {getRoleLabel(user().role)}
            </Badge>
          </div>
          <div class={styles.inline}>
            <span class={styles.label}>Team</span>
            <span class={styles.avatarName}>{getWorkspaceLabel(user())}</span>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}
