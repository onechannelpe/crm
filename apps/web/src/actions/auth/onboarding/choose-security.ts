"use server";

export async function chooseSecurity(input: {
  method: "passkey-step" | "totp-step";
  phone?: string;
}): Promise<{ redirectTo: string }> {
  const phoneQuery =
    typeof input.phone === "string" && input.phone.length > 0
      ? `&phone=${encodeURIComponent(input.phone)}`
      : "";

  return {
    redirectTo: `/onboarding?step=${input.method}${phoneQuery}`,
  };
}
