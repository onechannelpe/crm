import { LoginRetriesCard } from "~/components/settings/login-retries-card";
import { SettingsSection } from "~/components/settings/SettingsSection";

export default function LoginProtectionPage() {
  return (
    <>
      <SettingsSection title="Intentos de inicio de sesión">
        <LoginRetriesCard />
      </SettingsSection>
    </>
  );
}
