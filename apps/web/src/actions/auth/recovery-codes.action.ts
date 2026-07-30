type Composition = typeof import("~/server/auth/ui/recovery-codes");

export async function getRecoveryCodesStatus(
  ...args: Parameters<Composition["getRecoveryCodesStatus"]>
) {
  "use server";
  const { getRecoveryCodesStatus: execute } =
    await import("~/server/auth/ui/recovery-codes");
  return execute(...args);
}

export async function regenerateRecoveryCodes(
  ...args: Parameters<Composition["regenerateRecoveryCodes"]>
) {
  "use server";
  const { regenerateRecoveryCodes: execute } =
    await import("~/server/auth/ui/recovery-codes");
  return execute(...args);
}

export async function acknowledgeRecoveryCodes(
  ...args: Parameters<Composition["acknowledgeRecoveryCodes"]>
) {
  "use server";
  const { acknowledgeRecoveryCodes: execute } =
    await import("~/server/auth/ui/recovery-codes");
  return execute(...args);
}
