import type { UserId } from "~/domain/ids";
import type { AccessSecurityTx } from "~/server/auth/application/ports";

export async function revokeUserAccess(
  tx: Pick<AccessSecurityTx, "sessions" | "extensionRuntime">,
  userId: UserId,
  revokedAt: Date,
): Promise<void> {
  await tx.sessions.deleteAllForUser(userId);
  await tx.extensionRuntime.revokeInstallationSessionsByUser(userId, revokedAt);
  await tx.extensionRuntime.updateExecutiveSyncHealthByUser({
    user_id: userId,
    sync_health: "reauth_required",
    sync_updated_at: revokedAt,
  });
}
