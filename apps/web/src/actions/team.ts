"use server";

import { createNotificationService } from "@crm/notifications";
import { getRequestEvent } from "solid-js/web";

import { isRole, type Role } from "~/lib/auth/access/rbac";
import { requirePermission } from "~/lib/auth/access/session";
import { isValidInviteTokenFormat } from "~/lib/auth/invite/tokens";
import { getClientIp } from "~/lib/auth/password/client-ip";
import { hashPassword } from "~/lib/auth/password/password";
import { setSessionCookie } from "~/lib/auth/session/cookies";
import { createSession } from "~/lib/auth/session/session-manager";
import {
  assertNonEmptyString,
  assertPositiveInt,
} from "~/lib/contracts/guards";
import { env } from "~/lib/env";
import { repos } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";
import { createUserProvisioningService } from "~/server/users/service-user-provisioning";

const provisioning = createUserProvisioningService(repos);
const notificationSender = createNotificationService({
  resendApiKey: env.resendApiKey || undefined,
  fromEmail: env.emailFrom || undefined,
  whatsappAccessToken: env.whatsappAccessToken || undefined,
  whatsappPhoneNumberId: env.whatsappPhoneNumberId || undefined,
  whatsappApiVersion: env.whatsappApiVersion || undefined,
});

export interface TeamMember {
  id: number;
  fullName: string;
  email: string;
  role: Role;
  teamId: number | null;
  isActive: boolean;
}

export interface TeamInvite {
  inviteId: number;
  userId: number;
  fullName: string;
  email: string;
  role: Role;
  teamId: number | null;
  expiresAt: number;
  createdAt: number;
  sentAt: number | null;
}

export interface TeamDirectory {
  members: TeamMember[];
  pendingInvites: TeamInvite[];
  canManageInvites: boolean;
}

export interface TeamOption {
  id: number;
  name: string;
}

function assertEmail(value: string): string {
  const safe = assertNonEmptyString(value, "email").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safe)) {
    throw new Error("email must be valid");
  }
  return safe;
}

function assertRole(value: string): Role {
  if (!isRole(value)) {
    throw new Error("role is invalid");
  }
  return value;
}

function assertOptionalTeamId(value: number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  return assertPositiveInt(value, "teamId");
}

function assertStrongPassword(value: string): string {
  const safe = assertNonEmptyString(value, "password");
  if (safe.length < 12) {
    throw new Error("password must contain at least 12 characters");
  }
  if (!/[A-Z]/.test(safe)) {
    throw new Error("password must include an uppercase letter");
  }
  if (!/[a-z]/.test(safe)) {
    throw new Error("password must include a lowercase letter");
  }
  if (!/[0-9]/.test(safe)) {
    throw new Error("password must include a number");
  }
  return safe;
}

function getInviteUrl(token: string): string {
  const event = getRequestEvent();
  const requestUrl = event?.request.url;
  if (!requestUrl) {
    return `/auth/invite/${token}`;
  }
  const origin = new URL(requestUrl).origin;
  return `${origin}/auth/invite/${token}`;
}

async function sendInviteEmail(params: {
  email: string;
  fullName: string;
  role: Role;
  inviteUrl: string;
  expiresAt: number;
}): Promise<void> {
  await notificationSender.send({
    channel: "email",
    to: params.email,
    subject: "Activacion de cuenta CRM",
    text: [
      `Hola ${params.fullName},`,
      "",
      `Se creo tu cuenta con rol ${params.role}.`,
      `Activa tu acceso aqui: ${params.inviteUrl}`,
      `Este enlace vence: ${new Date(params.expiresAt).toISOString()}`,
    ].join("\n"),
    html: [
      `<p>Hola ${params.fullName},</p>`,
      `<p>Se creo tu cuenta con rol <strong>${params.role}</strong>.</p>`,
      `<p><a href="${params.inviteUrl}">Activar cuenta</a></p>`,
      `<p>Este enlace vence: ${new Date(params.expiresAt).toISOString()}</p>`,
    ].join(""),
  });
}

export async function getTeamDirectory(): Promise<TeamDirectory> {
  const session = await requirePermission("team:read");
  const [users, pendingInvites] = await Promise.all([
    repos.users.findByBranch(session.branchId),
    provisioning.listPendingInvites(session.branchId),
  ]);

  return {
    members: users.map((u) => ({
      id: u.id,
      fullName: u.full_name,
      email: u.email,
      role: u.role,
      teamId: u.team_id,
      isActive: !!u.is_active,
    })),
    pendingInvites,
    canManageInvites:
      session.role === "hr" ||
      session.role === "admin" ||
      session.role === "superuser",
  };
}

export async function getBranchTeamsForInvite(): Promise<TeamOption[]> {
  const session = await requirePermission("hr:manage");
  const teams = await repos.teams.findByBranch(session.branchId);
  return teams.map((team) => ({ id: team.id, name: team.name }));
}

export async function createTeamInvite(input: {
  fullName: string;
  email: string;
  role: string;
  teamId?: number | null;
}): Promise<{ inviteId: number }> {
  const safeInput = {
    fullName: assertNonEmptyString(input.fullName, "fullName"),
    email: assertEmail(input.email),
    role: assertRole(input.role),
    teamId: assertOptionalTeamId(input.teamId),
  };

  const session = await requirePermission("hr:manage");
  const result = await provisioning.createInvite({
    actorUserId: session.userId,
    actorRole: session.role,
    branchId: session.branchId,
    fullName: safeInput.fullName,
    email: safeInput.email,
    role: safeInput.role,
    teamId: safeInput.teamId,
  });
  if (isErr(result)) {
    throw new Error(result.error);
  }

  await sendInviteEmail({
    email: safeInput.email,
    fullName: safeInput.fullName,
    role: safeInput.role,
    inviteUrl: getInviteUrl(result.value.token),
    expiresAt: result.value.expiresAt,
  });
  await provisioning.markInviteDelivered(result.value.inviteId);

  return { inviteId: result.value.inviteId };
}

export async function resendTeamInvite(inviteId: number): Promise<void> {
  const safeInviteId = assertPositiveInt(inviteId, "inviteId");
  const session = await requirePermission("hr:manage");

  const result = await provisioning.resendInvite({
    actorUserId: session.userId,
    actorRole: session.role,
    branchId: session.branchId,
    inviteId: safeInviteId,
  });
  if (isErr(result)) {
    throw new Error(result.error);
  }

  const invite = await repos.userInvites.findById(result.value.inviteId);
  const user = invite ? await repos.users.findById(invite.user_id) : null;
  if (!user) {
    throw new Error("Invite target user was not found");
  }

  await sendInviteEmail({
    email: user.email,
    fullName: user.full_name,
    role: user.role,
    inviteUrl: getInviteUrl(result.value.token),
    expiresAt: result.value.expiresAt,
  });
  await provisioning.markInviteDelivered(result.value.inviteId);
}

export async function revokeTeamInvite(inviteId: number): Promise<void> {
  const safeInviteId = assertPositiveInt(inviteId, "inviteId");
  const session = await requirePermission("hr:manage");
  const result = await provisioning.revokeInvite({
    actorUserId: session.userId,
    actorRole: session.role,
    branchId: session.branchId,
    inviteId: safeInviteId,
  });
  if (isErr(result)) {
    throw new Error(result.error);
  }
}

export async function acceptTeamInvite(input: {
  token: string;
  fullName: string;
  password: string;
}): Promise<void> {
  const safeToken = assertNonEmptyString(input.token, "token");
  if (!isValidInviteTokenFormat(safeToken)) {
    throw new Error("token is invalid");
  }
  const safeFullName = assertNonEmptyString(input.fullName, "fullName");
  const safePassword = assertStrongPassword(input.password);

  const result = await provisioning.acceptInvite({
    token: safeToken,
    fullName: safeFullName,
    passwordHash: await hashPassword(safePassword),
  });
  if (isErr(result)) {
    throw new Error(result.error);
  }

  const event = getRequestEvent();
  const ipAddress = getClientIp(event?.request.headers ?? new Headers());
  const userAgent = event?.request.headers.get("user-agent") ?? null;
  const token = await createSession(
    result.value.userId,
    result.value.branchId,
    result.value.role,
    ipAddress,
    userAgent,
    "password",
    null,
  );
  setSessionCookie(token);
}
