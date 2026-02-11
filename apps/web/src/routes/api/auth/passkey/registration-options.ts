import { json } from "@solidjs/router";
import { createPasskeyRegistrationOptions } from "~/server/auth/passkey";

export async function POST() {
  try {
    const options = await createPasskeyRegistrationOptions();
    return json(options);
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create options",
      },
      { status: 500 },
    );
  }
}
