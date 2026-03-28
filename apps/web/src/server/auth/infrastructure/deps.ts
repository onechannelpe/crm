import {
  notificationSender,
  privilegedLoginAlertSender,
  repos,
  runInRepositoryTransaction,
} from "~/server/shared/context";

export function createAuthDeps() {
  return {
    repos,
    notificationSender,
    privilegedLoginAlertSender,
    runInRepositoryTransaction,
  };
}

export type AuthDeps = ReturnType<typeof createAuthDeps>;
