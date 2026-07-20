import { LoginRetriesCard } from "~/components/settings/login-retries-card";
import { SettingsSection } from "~/components/settings/SettingsSection";
import { SettingsPageLayout } from "~/features/settings-shell/page/settings-page-layout";

export default function LoginProtectionPage() {
  return (
    <SettingsPageLayout>
      <SettingsSection title="Intentos de inicio de sesión">
        <LoginRetriesCard />
      </SettingsSection>
    </SettingsPageLayout>
  );
}
