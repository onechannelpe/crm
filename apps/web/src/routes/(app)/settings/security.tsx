import { createSignal } from "solid-js";

import { changePassword } from "~/actions/settings";
import { useToast } from "~/components/feedback/toast-provider";
import { LoginRetriesCard } from "~/components/settings/login-retries-card";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { getErrorMessage } from "~/lib/errors";

import styles from "./settings-page.module.css";

export default function SettingsSecurityPage() {
  const { showToast } = useToast();
  const [currentPassword, setCurrentPassword] = createSignal("");
  const [newPassword, setNewPassword] = createSignal("");
  const [confirmPassword, setConfirmPassword] = createSignal("");
  const [changingPassword, setChangingPassword] = createSignal(false);

  const handleChangePassword = async (e: Event) => {
    e.preventDefault();
    if (newPassword() !== confirmPassword()) {
      showToast("error", "Passwords do not match");
      return;
    }
    if (newPassword().length < 8) {
      showToast("error", "Password must be at least 8 characters");
      return;
    }
    setChangingPassword(true);
    try {
      await changePassword(currentPassword(), newPassword());
      showToast("success", "Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "Failed to change password"));
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div class={styles.content}>
      <form
        onSubmit={(e) => {
          void handleChangePassword(e);
        }}
      >
        <section class={styles.block}>
          <h2 class={styles.title}>Change password</h2>
          <p class={styles.description}>
            Update your password to keep your account secure.
          </p>
          <div class={styles.formGrid}>
            <Input
              type="password"
              label="Current password"
              value={currentPassword()}
              onInput={(e) => setCurrentPassword(e.currentTarget.value)}
              required
            />
            <Input
              type="password"
              label="New password"
              value={newPassword()}
              onInput={(e) => setNewPassword(e.currentTarget.value)}
              required
            />
            <Input
              type="password"
              label="Confirm new password"
              value={confirmPassword()}
              onInput={(e) => setConfirmPassword(e.currentTarget.value)}
              required
            />
          </div>
          <div class={styles.formActions}>
            <Button type="submit" disabled={changingPassword()}>
              {changingPassword() ? "Changing..." : "Change password"}
            </Button>
          </div>
        </section>
      </form>

      <section class={styles.block}>
        <LoginRetriesCard />
      </section>
    </div>
  );
}
