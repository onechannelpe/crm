import { createSignal } from "solid-js";

import { updateUserProfile } from "~/actions/settings";
import { useToast } from "~/components/feedback/toast-provider";
import { useSession } from "~/components/providers/session-provider";
import { SettingsSection } from "~/components/settings/SettingsSection";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
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
      <SettingsSection title="Picture">
        <div class={styles.pictureRow}>
          <div class={styles.pictureAvatar}>
            {user().fullName?.charAt(0) || user().email.charAt(0)}
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Name"
        description="Your name as it will be displayed"
      >
        <form
          onSubmit={(e) => {
            void saveProfile(e);
          }}
        >
          <div class={styles.formGrid}>
            <Input
              label="Full name"
              value={profileName()}
              onInput={(e) => setProfileName(e.currentTarget.value)}
              required
            />
            <Input
              label="Phone"
              value={profilePhone()}
              onInput={(e) => setProfilePhone(e.currentTarget.value)}
              placeholder="+1 234 567 8900"
            />
          </div>

          <div class={styles.formActions}>
            <Button type="submit" disabled={savingProfile()}>
              {savingProfile() ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </SettingsSection>

      <SettingsSection
        title="Email"
        description="The email associated to your account"
      >
        <Input value={user().email} disabled />
      </SettingsSection>
    </div>
  );
}
