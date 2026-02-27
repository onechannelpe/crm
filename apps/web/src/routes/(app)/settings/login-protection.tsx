import { LoginRetriesCard } from "~/components/settings/login-retries-card";
import { SettingsSection } from "~/components/settings/SettingsSection";

import styles from "./settings-page.module.css";

export default function LoginProtectionPage() {
  return (
    <div class={styles.content}>
      <SettingsSection title="Login security">
        <LoginRetriesCard />
      </SettingsSection>
    </div>
  );
}
