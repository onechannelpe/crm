"use server";

export async function chooseSecurity(input: {
  method: "passkey-step" | "totp-step";
}): Promise<{ redirectTo: string }> {
  return {
    redirectTo: `/onboarding?step=${input.method}`,
  };
}
