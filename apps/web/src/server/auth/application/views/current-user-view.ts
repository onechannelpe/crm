import type { Role } from "~/lib/auth/access/rbac";
import type { WorkspaceScopeType } from "~/lib/auth/access/workspace-scope";
import type {
  PrimaryAuthMethod,
  SessionClass,
  StrongAuthMethod,
} from "~/lib/auth/core/session-contract";

export interface CurrentUserView {
  id: number;
  email: string;
  names: string;
  firstSurname: string;
  secondSurname: string;
  phoneE164: string | null;
  avatarUrl: string | null;
  avatarVersion: number;
  onboardingCompletedAt: number | null;
  role: Role;
  strongAuthRequired: boolean;
  strongAuthConfigured: boolean;
  totpEnabled: boolean;
  hasPasskey: boolean;
  passkeyCount: number;
  sessionClass: SessionClass;
  primaryAuthMethod: PrimaryAuthMethod;
  strongAuthMethod: StrongAuthMethod | null;
  branchId: number;
  scopeType: WorkspaceScopeType;
  team: unknown;
  supervisor: unknown;
  branch: unknown;
}
