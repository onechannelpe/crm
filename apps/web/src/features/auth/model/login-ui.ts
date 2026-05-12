export type PasswordLoginUiErrorCode =
  | "invalid_credentials"
  | "strong_auth_required";

export type PasskeyStartUiErrorCode = "invalid_credentials";

export type TotpLoginUiErrorCode = "invalid_totp";

export type PasskeyFinishUiErrorCode = "flow_expired" | "invalid_credentials";

export function passwordLoginUiMessage(code: PasswordLoginUiErrorCode): string {
  switch (code) {
    case "invalid_credentials":
      return "Credenciales invalidas";
    case "strong_auth_required":
      return "Tu cuenta requiere autenticacion reforzada para iniciar sesion.";
    default:
      code satisfies never;
      return "Credenciales invalidas";
  }
}

export function passkeyStartUiMessage(code: PasskeyStartUiErrorCode): string {
  switch (code) {
    case "invalid_credentials":
      return "No se pudo iniciar la clave de acceso";
    default:
      code satisfies never;
      return "No se pudo iniciar la clave de acceso";
  }
}

export function totpLoginUiMessage(code: TotpLoginUiErrorCode): string {
  switch (code) {
    case "invalid_totp":
      return "No se pudo verificar el codigo";
    default:
      code satisfies never;
      return "No se pudo verificar el codigo";
  }
}

export function passkeyFinishUiMessage(code: PasskeyFinishUiErrorCode): string {
  switch (code) {
    case "flow_expired":
      return "La sesión de clave de acceso expiró. Intenta de nuevo.";
    case "invalid_credentials":
      return "No se pudo iniciar sesión con la clave de acceso";
    default:
      code satisfies never;
      return "No se pudo iniciar sesión con la clave de acceso";
  }
}
