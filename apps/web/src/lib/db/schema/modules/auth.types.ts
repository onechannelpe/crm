import type { Generated } from "kysely";

import type {
  AuthLoginFlowId,
  BranchId,
  GeneratedId,
  IdColumn,
  NullableIdColumn,
  UserId,
  UserInviteId,
  WebauthnChallengeId,
} from "~/server/shared/ids";

import type { Role } from "./identity.types";

export type AuthFunnelSourceValue = "client" | "server";
export type AuthFunnelEventNameValue =
  | "screen_viewed"
  | "password_result"
  | "passkey_start_result"
  | "totp_result"
  | "passkey_result";
export type AuthFunnelScreenValue =
  | "login"
  | "login_user"
  | "login_verify"
  | "login_passkey"
  | "reset_password";
export type AuthFunnelMethodValue =
  | "password"
  | "password_totp"
  | "passkey"
  | "google";

export type AuthMethodValue = "password" | "google" | "passkey";

export type AuthFunnelOutcomeValue =
  | "viewed"
  | "failed"
  | "succeeded"
  | "started"
  | "totp_required"
  | "passkey_required";

export interface LoginFlowsTable {
  id: GeneratedId<AuthLoginFlowId>;
  identifier: string;
  primary_auth_method: AuthMethodValue;
  user_id: NullableIdColumn<UserId>;
  challenge_id: NullableIdColumn<WebauthnChallengeId>;
  state: "totp" | "passkey";
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface PasskeysTable {
  id: string;
  user_id: IdColumn<UserId>;
  public_key: string;
  counter: number;
  transports: string | null;
  created_at: Date;
  last_used_at: Date | null;
}

export interface WebauthnChallengesTable {
  id: GeneratedId<WebauthnChallengeId>;
  user_id: NullableIdColumn<UserId>;
  type: string;
  challenge: string;
  expires_at: Date;
  created_at: Date;
}

export interface UserOAuthAccountsTable {
  id: Generated<string>;
  user_id: IdColumn<UserId>;
  provider: string;
  provider_user_id: string;
  email: string;
  created_at: Date;
}

export interface PasswordResetTokensTable {
  id: Generated<string>;
  user_id: IdColumn<UserId>;
  token_hash: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
}

export interface UserSessionsTable {
  id: string;
  user_id: IdColumn<UserId>;
  branch_id: IdColumn<BranchId>;
  role: Role;
  session_class: "pre_auth" | "app";
  primary_auth_method: AuthMethodValue;
  strong_auth_method: "totp" | "passkey" | "federated" | null;
  strong_auth_at: Date | null;
  // Holds the administrator's user id so the UI can surface the impersonation
  // and the admin session can be restored on exit.
  impersonator_user_id: NullableIdColumn<UserId>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
  last_activity: Date;
  expires_at: Date;
}

export interface RequestSessionsTable {
  id: string;
  csrf_token: string;
  created_at: Date;
  last_activity: Date;
  expires_at: Date;
}

export interface UserTotpFactorsTable {
  id: Generated<string>;
  user_id: IdColumn<UserId>;
  secret_encrypted: string;
  is_enabled: boolean;
  created_at: Date;
  updated_at: Date;
  enabled_at: Date | null;
}

export interface UserTotpRecoveryCodesTable {
  id: Generated<string>;
  user_id: IdColumn<UserId>;
  code_hash: string;
  used_at: Date | null;
  created_at: Date;
}

export interface UserInvitesTable {
  id: GeneratedId<UserInviteId>;
  user_id: IdColumn<UserId>;
  branch_id: IdColumn<BranchId>;
  email: string;
  role: Role;
  token_hash: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  expires_at: Date;
  created_by_user_id: IdColumn<UserId>;
  accepted_at: Date | null;
  revoked_at: Date | null;
  created_at: Date;
  sent_at: Date | null;
}

export interface AuthFunnelEventsTable {
  id: Generated<string>;
  trace_id: string;
  request_id: string;
  route_path: string | null;
  source: AuthFunnelSourceValue;
  event_name: AuthFunnelEventNameValue;
  screen: AuthFunnelScreenValue | null;
  method: AuthFunnelMethodValue | null;
  outcome: AuthFunnelOutcomeValue;
  code: string | null;
  created_at: Date;
}
