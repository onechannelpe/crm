export interface ExtensionHandoffClaims {
  iss: "crm-web";
  aud: "crm-extension";
  sub: `user:${number}`;
  authSessionId: string;
  branchId: number;
  assignmentId: number;
  contactId: number;
  phone: string;
  clientName: string | null;
  organizationLabel: string | null;
  action: "start_call";
  syncToken: string;
  origin: string;
  jti: string;
  iat: number;
  exp: number;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isExtensionHandoffClaims(
  value: unknown,
): value is ExtensionHandoffClaims {
  return (
    isObject(value) &&
    value.iss === "crm-web" &&
    value.aud === "crm-extension" &&
    typeof value.sub === "string" &&
    typeof value.authSessionId === "string" &&
    typeof value.branchId === "number" &&
    typeof value.assignmentId === "number" &&
    typeof value.contactId === "number" &&
    typeof value.phone === "string" &&
    (value.clientName === null || typeof value.clientName === "string") &&
    (value.organizationLabel === null ||
      typeof value.organizationLabel === "string") &&
    value.action === "start_call" &&
    typeof value.syncToken === "string" &&
    typeof value.origin === "string" &&
    typeof value.jti === "string" &&
    typeof value.iat === "number" &&
    typeof value.exp === "number"
  );
}
