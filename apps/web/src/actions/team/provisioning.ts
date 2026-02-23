import { repos, runInRepositoryTransaction } from "~/server/shared/context";
import { createUserProvisioningService } from "~/server/users/service-user-provisioning";

export const provisioning = createUserProvisioningService(repos, {
  runInTransaction: runInRepositoryTransaction,
});
