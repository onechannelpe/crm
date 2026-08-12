export function resolveInstallationPassword(): string {
  const envPassword = process.env.INSTALLATION_PASSWORD?.trim();
  if (envPassword && envPassword.length >= 8) {
    return envPassword;
  }
  throw new Error("missing_or_weak_installation_password");
}
