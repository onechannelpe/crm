import { toAppError, type AppErrorCode } from "./app-errors";

/**
 * Spanish UI copy keyed by the granular domain code. The server emits stable,
 * language-neutral codes (see `validationFail` and the workflow domain errors);
 * wording lives here, on the client, so locale never couples to the server and
 * `publicMessage` (which may be English or auto-derived) is never shown.
 *
 * A code without an entry falls back to a generic message for its coarse class,
 * then to the caller's operation-specific fallback. Add entries here as new
 * user-facing domain codes appear; the long tail of field-level validation
 * codes is intentionally left to the generic class message.
 */
const DOMAIN_MESSAGES_ES: Record<string, string> = {
  invalid_ruc: "El RUC debe tener 11 dígitos. Intenta nuevamente.",
  ruc_required: "Ingresa el RUC del cliente.",
  invalid_settlement_account: "Debes marcar exactamente una cuenta de abono.",
  missing_cci_soles:
    "El CCI es obligatorio para la cuenta en soles cuando el banco no es BCP.",
  missing_cci_dolares:
    "El CCI es obligatorio para la cuenta en dólares cuando el banco no es BCP.",
  accounts_already_added: "Esta sede ya tiene cuentas registradas.",
  venue_not_found: "No se encontró la sede para este cliente.",
  same_executive: "El cliente ya está asignado a ese ejecutivo.",
  max_negotiation_rounds_reached:
    "Se alcanzó el máximo de rondas de negociación.",
  max_negotiation_files_exceeded: "Se superó el máximo de archivos permitidos.",
};

// Generic copy per coarse class. Null means the class has no good generic line,
// so the caller's operation-specific fallback wins (conflicts and internal
// faults read better as "could not save X" than a vague class message).
const CLASS_MESSAGES_ES: Record<AppErrorCode, string | null> = {
  validation: "Revisa los datos ingresados.",
  forbidden: "No tienes permiso para realizar esta acción.",
  not_found: "No se encontró el recurso solicitado.",
  conflict: null,
  rate_limit: "Demasiados intentos. Inténtalo de nuevo en unos momentos.",
  internal: null,
};

/**
 * Resolves an action error to Spanish UI copy: curated message for the domain
 * code, then a generic message for the coarse class, then the caller's
 * operation-specific fallback. Accepts a raw thrown value or an AppError.
 */
export function actionErrorMessage(err: unknown, fallback: string): string {
  const appError = toAppError(err, fallback);
  if (appError.domainCode) {
    const mapped = DOMAIN_MESSAGES_ES[appError.domainCode];
    if (mapped) return mapped;
  }
  return CLASS_MESSAGES_ES[appError.code] ?? fallback;
}
