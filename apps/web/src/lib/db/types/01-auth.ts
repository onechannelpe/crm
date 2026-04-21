import type { Generated } from "kysely";
import type { UserRoleValue } from "./02-crm";

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
  id: Generated<number>;
  identifier: string;
  primary_auth_method: AuthMethodValue;
  user_id: number | null;
  challenge_id: number | null;
  state: "totp" | "passkey";
  expires_at: number;
  created_at: number;
  updated_at: number;
}

export interface PasskeysTable {
  id: string;
  user_id: number;
  public_key: string;
  counter: number;
  transports: string | null;
  created_at: number;
  last_used_at: number | null;
}

export interface WebauthnChallengesTable {
  id: Generated<number>;
  user_id: number | null;
  type: string;
  challenge: string;
  expires_at: number;
  created_at: number;
}

export interface UserOAuthAccountsTable {
  id: Generated<number>;
  user_id: number;
  provider: string;
  provider_user_id: string;
  email: string;
  created_at: number;
}

export interface PasswordResetTokensTable {
  id: Generated<number>;
  user_id: number;
  token_hash: string;
  expires_at: number;
  used_at: number | null;
  created_at: number;
}

export interface UserSessionsTable {
  id: string;
  user_id: number;
  branch_id: number;
  role: UserRoleValue;
  session_class: "pre_auth" | "app";
  primary_auth_method: AuthMethodValue;
  strong_auth_method: "totp" | "passkey" | "federated" | null;
  strong_auth_at: number | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: number;
  last_activity: number;
  expires_at: number;
}

export interface RequestSessionsTable {
  id: string;
  csrf_token: string;
  created_at: number;
  last_activity: number;
  expires_at: number;
}

export interface UserTotpFactorsTable {
  id: Generated<number>;
  user_id: number;
  secret_encrypted: string;
  is_enabled: number;
  created_at: number;
  updated_at: number;
  enabled_at: number | null;
}

export interface UserTotpRecoveryCodesTable {
  id: Generated<number>;
  user_id: number;
  code_hash: string;
  used_at: number | null;
  created_at: number;
}

export interface UserInvitesTable {
  id: Generated<number>;
  user_id: number;
  branch_id: number;
  email: string;
  role: UserRoleValue;
  token_hash: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  expires_at: number;
  created_by_user_id: number;
  accepted_at: number | null;
  revoked_at: number | null;
  created_at: number;
  sent_at: number | null;
}

export interface AuthFunnelEventsTable {
  id: Generated<number>;
  trace_id: string;
  request_id: string;
  route_path: string | null;
  source: AuthFunnelSourceValue;
  event_name: AuthFunnelEventNameValue;
  screen: AuthFunnelScreenValue | null;
  method: AuthFunnelMethodValue | null;
  outcome: AuthFunnelOutcomeValue;
  code: string | null;
  created_at: number;
}

export type Db = {
  login_flows: LoginFlowsTable;
  passkeys: PasskeysTable;
  webauthn_challenges: WebauthnChallengesTable;
  user_oauth_accounts: UserOAuthAccountsTable;
  password_reset_tokens: PasswordResetTokensTable;
  user_sessions: UserSessionsTable;
  request_sessions: RequestSessionsTable;
  user_totp_factors: UserTotpFactorsTable;
  user_totp_recovery_codes: UserTotpRecoveryCodesTable;
  user_invites: UserInvitesTable;
  auth_funnel_events: AuthFunnelEventsTable;
};
