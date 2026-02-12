import { json } from "@solidjs/router";
import { createPasskeyAuthenticationOptions } from "~/infrastructure/auth/passkey";

export async function POST() {
  try {
    const options = await createPasskeyAuthenticationOptions();
    return json(options);
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Failed to create options" },
      { status: 500 }
    );
  }
}
