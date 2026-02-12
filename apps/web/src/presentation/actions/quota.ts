"use server";

import { revalidate } from "@solidjs/router";
import { allocateQuota as allocateQuotaCommand } from "~/application/quota/allocate-quota";
import { UsersRepository } from "~/infrastructure/db/repositories/users";
import { getAuthSession } from "~/infrastructure/auth/session";

export async function getTeamExecutives() {
  const session = await getAuthSession();
  const teamId = session.data.teamId;

  if (!teamId) {
    return [];
  }

  return await UsersRepository.findByTeam(teamId, "executive");
}

export async function getTeamUsers() {
  const session = await getAuthSession();
  const branchId = session.data.branchId;

  if (!branchId) {
    return [];
  }

  return await UsersRepository.findByBranch(branchId);
}

export async function allocateQuota(userId: number, amount: number) {
  const session = await getAuthSession();
  const supervisorId = session.data.userId;

  if (!supervisorId) {
    throw new Error("Usuario no autenticado");
  }

  const result = await allocateQuotaCommand({ userId, supervisorId, amount });

  if (!result.ok) {
    throw result.error;
  }

  revalidate(getTeamExecutives.key);
}
