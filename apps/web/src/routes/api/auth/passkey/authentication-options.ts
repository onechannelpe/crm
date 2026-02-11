import { json } from "@solidjs/router";
import { createPasskeyAuthenticationOptions } from "~/server/auth/passkey";
import { requireAuth } from "~/server/auth/session";
import { db } from "~/server/db/client";

export async function POST() {
  try {
    const { userId } = await requireAuth();

    const user = await db
      .selectFrom("users")
      .select(["email"])
      .where("id", "=", userId)
      .executeTakeFirstOrThrow();

    const options = await createPasskeyAuthenticationOptions(user.email);
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
