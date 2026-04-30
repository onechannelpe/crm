export function resolveSeedPassword(): string {
  const envPassword = process.env.SEED_PASSWORD?.trim();
  if (envPassword && envPassword.length > 0) {
    return envPassword;
  }
  throw new Error("missing_seed_password");
}
