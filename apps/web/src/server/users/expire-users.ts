import { auditEntityId } from "~/domain/audit/entity";
import type { AccessSecurityDeps } from "~/server/auth/application/ports";
import { revokeUserAccess } from "~/server/auth/session/revoke-user-access";
import { Ok } from "~/shared/result";

interface ExpireUsersDeps {
  accessSecurity: AccessSecurityDeps;
}

export async function expireUsersAndInvalidateSessions(
  expiredBefore: Date,
  deps: ExpireUsersDeps,
): Promise<number> {
  const candidates = await deps.accessSecurity.uow.run(async (tx) =>
    Ok(await tx.users.findActiveIdsExpiringBefore(expiredBefore)),
  );
  if (!candidates.ok) {
    return 0;
  }

  let expiredCount = 0;

  for (const { id: userId } of candidates.value) {
    // eslint-disable-next-line no-await-in-loop
    const expired = await deps.accessSecurity.uow.run(async (tx) => {
      if (!(await tx.users.deactivateIfExpired(userId, expiredBefore))) {
        return Ok(false);
      }

      await revokeUserAccess(tx, userId, expiredBefore);
      await tx.events.append({
        type: "account_expired",
        entityType: "user",
        entityId: auditEntityId("user", userId),
        subjectUserId: userId,
        occurredAt: expiredBefore,
      });
      return Ok(true);
    });
    if (expired.ok && expired.value) {
      expiredCount += 1;
    }
  }

  return expiredCount;
}
