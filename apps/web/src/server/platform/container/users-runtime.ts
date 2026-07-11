import type { Phone } from "~/lib/phone/pe-mobile";
import { createUserChannelAddressRepo } from "~/server/notifications/repos/user-channel-address";
import type { UserId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";
import { createUsersRepo } from "~/server/users/repos-users";

import type { ServerInfra } from "./infra";

export function createUsersRuntime(infra: ServerInfra) {
  const usersRepo = createUsersRepo(infra.db);
  const userChannelAddressesRepo = createUserChannelAddressRepo(infra.db);

  async function updatePhone(
    userId: UserId,
    phone: Phone,
  ): Promise<Result<void, { kind: "address_already_claimed" }>> {
    const claimResult = await userChannelAddressesRepo.claimWhatsAppAddress({
      userId,
      address: phone,
      now: new Date(),
    });

    if (claimResult.kind === "already_claimed") {
      return Err({
        kind: "address_already_claimed",
      });
    }

    return Ok(undefined);
  }

  return {
    users: usersRepo,
    updatePhone,
  };
}
