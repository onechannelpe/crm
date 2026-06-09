import type { DomainErrorKind } from "~/server/shared/domain-error";

/**
 * The single source of truth for user-facing error copy. Each granular code
 * maps to its coarse `kind` and its render-ready Spanish message. The server
 * projects this onto the wire; the client renders `message` verbatim and never
 * owns copy.
 *
 * `as const satisfies` makes two guarantees the compiler enforces:
 *  - every entry declares both a valid `kind` and a `message` (no code ships
 *    without copy);
 *  - `fail(code)` only accepts a key that exists here (typos do not compile).
 *
 * Only displayed codes belong here. Server faults (`internal`) and third-party
 * faults (`external`) always render the generic message, so they carry no
 * catalog entry; their granular code rides along on `logMessage`/telemetry
 * only. The long tail of auto-derived field-validation codes also stays out:
 * the parser falls back to a generic validation line for anything absent here.
 */
export const ERROR_CATALOG = {
  // not_found
  lead_not_found: { kind: "not_found", message: "No se encontró el lead." },
  executive_not_found: {
    kind: "not_found",
    message: "No se encontró el ejecutivo.",
  },
  artifact_not_found: {
    kind: "not_found",
    message: "No se encontró el documento.",
  },
  artifact_file_not_found: {
    kind: "not_found",
    message: "No se encontró el archivo del documento.",
  },
  reservation_not_found: {
    kind: "not_found",
    message: "No se encontró la reserva.",
  },
  user_not_found: { kind: "not_found", message: "No se encontró el usuario." },
  request_not_found: {
    kind: "not_found",
    message: "No se encontró la solicitud.",
  },
  request_target_not_found: {
    kind: "not_found",
    message: "No se encontró el destinatario de la solicitud.",
  },
  team_not_found: { kind: "not_found", message: "No se encontró el equipo." },
  token_not_found: {
    kind: "not_found",
    message: "No se encontró el enlace de descarga.",
  },
  file_asset_not_found: {
    kind: "not_found",
    message: "No se encontró el archivo.",
  },
  venue_not_found: {
    kind: "not_found",
    message: "No se encontró la sede para este cliente.",
  },
  sale_proof_not_found: {
    kind: "not_found",
    message: "No se encontró el comprobante de venta.",
  },
  lead_organization_not_found: {
    kind: "not_found",
    message: "No se encontró la organización del lead.",
  },
  file_storage_missing: {
    kind: "not_found",
    message: "No se encontró el archivo en el almacenamiento.",
  },
  file_not_found: {
    kind: "not_found",
    message: "No se encontró el archivo de negociación.",
  },
  assignment_not_found: {
    kind: "not_found",
    message: "No se encontró el cliente asignado.",
  },
  import_job_not_found: {
    kind: "not_found",
    message: "No se encontró el proceso de importación.",
  },

  // conflict
  request_not_pending: {
    kind: "conflict",
    message: "La solicitud ya no está pendiente.",
  },
  token_already_used: {
    kind: "conflict",
    message: "El enlace de descarga ya fue utilizado.",
  },
  token_expired: {
    kind: "conflict",
    message: "El enlace de descarga expiró.",
  },
  totp_already_enabled: {
    kind: "conflict",
    message: "La verificación en dos pasos ya está activa.",
  },
  search_exhausted: {
    kind: "conflict",
    message: "Se agotó la capacidad de búsqueda.",
  },
  lead_exhausted: {
    kind: "conflict",
    message: "Se agotó la capacidad de leads.",
  },
  ruc_conflict: {
    kind: "conflict",
    message: "Ya existe un lead con este RUC.",
  },
  phone_in_use: {
    kind: "conflict",
    message: "Este número de WhatsApp ya está en uso.",
  },
  negotiation_file_not_submit_ready: {
    kind: "conflict",
    message: "El documento no está listo para enviarse a negociación.",
  },
  lead_not_quoted: {
    kind: "conflict",
    message:
      "Los archivos de negociación solo pueden subirse cuando el lead está en etapa cotizado.",
  },
  lead_not_live: {
    kind: "conflict",
    message:
      "Los comprobantes de venta solo se permiten cuando el lead está activo.",
  },
  download_artifact_requires_generated_payload: {
    kind: "conflict",
    message:
      "El archivo de descarga debe generarlo el servicio correspondiente.",
  },
  concurrency_conflict: {
    kind: "conflict",
    message: "El lead fue modificado por otra persona. Vuelve a intentarlo.",
  },
  assignment_inactive: {
    kind: "conflict",
    message: "El contacto asignado no está disponible.",
  },
  artifact_not_downloadable: {
    kind: "conflict",
    message: "El archivo del documento aún no está listo.",
  },
  accounts_already_added: {
    kind: "conflict",
    message: "Esta sede ya tiene cuentas registradas.",
  },
  same_executive: {
    kind: "conflict",
    message: "El cliente ya está asignado a ese ejecutivo.",
  },
  max_negotiation_rounds_reached: {
    kind: "conflict",
    message: "Se alcanzó el máximo de rondas de negociación.",
  },
  strong_method_required: {
    kind: "conflict",
    message:
      "Tu rol requiere mantener al menos un método de verificación fuerte.",
  },

  // invites
  invite_not_found: {
    kind: "not_found",
    message: "No se encontró la invitación.",
  },
  invite_target_missing: {
    kind: "not_found",
    message: "No se pudo encontrar al usuario de la invitación.",
  },
  invite_target_active: {
    kind: "conflict",
    message: "El usuario invitado ya está activo.",
  },
  invite_not_pending: {
    kind: "conflict",
    message: "Solo se pueden gestionar invitaciones pendientes.",
  },
  active_user_exists: {
    kind: "conflict",
    message: "Ya existe un usuario activo con este correo.",
  },
  invalid_team: {
    kind: "validation",
    message: "El equipo seleccionado no es válido para la sede.",
  },
  invite_invalid_or_expired: {
    kind: "validation",
    message: "La invitación es inválida o expiró.",
  },
  role_not_assignable: {
    kind: "forbidden",
    message: "No puedes asignar el rol seleccionado.",
  },
  cross_branch_forbidden: {
    kind: "forbidden",
    message: "No puedes gestionar invitaciones de otra sede.",
  },
  pending_user_other_branch: {
    kind: "forbidden",
    message: "Ya existe un usuario pendiente con este correo en otra sede.",
  },

  // forbidden
  cannot_manage_executive: {
    kind: "forbidden",
    message: "No puedes gestionar este ejecutivo.",
  },
  extension_session_invalid: {
    kind: "forbidden",
    message: "La sesión de la extensión es inválida o expiró.",
  },
  onboarding_required: {
    kind: "forbidden",
    message: "Debes completar el registro para continuar.",
  },
  strong_auth_required: {
    kind: "forbidden",
    message: "Necesitas verificación adicional para continuar.",
  },
  strong_auth_expired: {
    kind: "forbidden",
    message:
      "Tu verificación adicional expiró. Vuelve a verificar tu identidad.",
  },
  handoff_invalid: {
    kind: "forbidden",
    message: "El enlace de la extensión es inválido o expiró.",
  },
  handoff_origin_not_allowed: {
    kind: "forbidden",
    message: "El origen de la solicitud no está permitido para la extensión.",
  },
  assignment_mismatch: {
    kind: "forbidden",
    message: "La asignación del contacto no está activa o no coincide.",
  },
  invalid_credentials: {
    kind: "forbidden",
    message: "Credenciales inválidas.",
  },
  current_password_incorrect: {
    kind: "forbidden",
    message: "La contraseña actual es incorrecta.",
  },

  // validation
  invalid_passkey_request: {
    kind: "validation",
    message: "La solicitud de acceso no es válida.",
  },
  file_required: { kind: "validation", message: "Selecciona un archivo." },
  file_too_large: {
    kind: "validation",
    message: "El archivo es demasiado grande.",
  },
  profile_picture_required: {
    kind: "validation",
    message: "Selecciona una foto de perfil.",
  },
  totp_code_invalid: {
    kind: "validation",
    message: "El código de verificación no es válido.",
  },
  totp_setup_invalid: {
    kind: "validation",
    message: "La configuración de verificación no es válida.",
  },
  download_payload_invalid: {
    kind: "validation",
    message: "La solicitud de descarga no es válida.",
  },
  unsupported_file_type: {
    kind: "validation",
    message: "Solo se permiten archivos .csv y .xlsx.",
  },
  negotiation_files_required: {
    kind: "validation",
    message: "Se requiere al menos un documento para la negociación.",
  },
  max_negotiation_files_exceeded: {
    kind: "validation",
    message: "Se superó el máximo de archivos permitidos.",
  },
  duplicate_negotiation_file: {
    kind: "validation",
    message: "Los archivos de negociación deben ser únicos.",
  },
  invalid_stage: {
    kind: "validation",
    message: "El lead no está en la etapa requerida.",
  },
  invalid_settlement_account: {
    kind: "validation",
    message: "Debes marcar exactamente una cuenta de abono.",
  },
  invalid_phone: {
    kind: "validation",
    message: "El número debe tener 9 dígitos y empezar con 9.",
  },
  invalid_executive: {
    kind: "validation",
    message: "El ejecutivo seleccionado no existe o no está activo.",
  },
  invalid_digital_policy_stage: {
    kind: "validation",
    message: "La política digital solo puede actualizarse en la etapa de plan.",
  },
  invalid_existing_venue_digital_config: {
    kind: "validation",
    message:
      "Una sede es incompatible con la política de canal digital seleccionada.",
  },
  missing_online_venue_config: {
    kind: "validation",
    message:
      "La URL y la modalidad online de la sede son obligatorias para el alcance por sede.",
  },
  missing_online_shared_config: {
    kind: "validation",
    message:
      "La URL y la modalidad online compartidas son obligatorias para el alcance compartido.",
  },
  missing_link_venue_url: {
    kind: "validation",
    message:
      "La URL del enlace de la sede es obligatoria para el alcance por sede.",
  },
  missing_link_shared_url: {
    kind: "validation",
    message: "La URL del enlace es obligatoria para el alcance compartido.",
  },
  invalid_online_venue_config: {
    kind: "validation",
    message:
      "La configuración online de la sede no corresponde al alcance elegido.",
  },
  invalid_online_policy: {
    kind: "validation",
    message:
      "Los campos online compartidos no corresponden al alcance elegido.",
  },
  invalid_link_venue_config: {
    kind: "validation",
    message:
      "La configuración del enlace de la sede no corresponde al alcance elegido.",
  },
  invalid_link_policy: {
    kind: "validation",
    message: "Los campos del enlace no corresponden al alcance elegido.",
  },
  decision_note_required: {
    kind: "validation",
    message: "La nota de decisión es obligatoria para rechazar.",
  },
  artifact_id_required: {
    kind: "validation",
    message: "Falta el identificador del documento.",
  },
  invalid_ruc: {
    kind: "validation",
    message: "El RUC debe tener 11 dígitos. Intenta nuevamente.",
  },
  ruc_required: { kind: "validation", message: "Ingresa el RUC del cliente." },
  missing_cci_soles: {
    kind: "validation",
    message:
      "El CCI es obligatorio para la cuenta en soles cuando el banco no es BCP.",
  },
  missing_cci_dolares: {
    kind: "validation",
    message:
      "El CCI es obligatorio para la cuenta en dólares cuando el banco no es BCP.",
  },
  invalid_email: { kind: "validation", message: "El correo no es válido." },
  invalid_team_id: {
    kind: "validation",
    message: "El equipo seleccionado no es válido.",
  },
  invalid_executive_category: {
    kind: "validation",
    message: "Selecciona una categoría válida para el ejecutivo.",
  },
  invalid_expires_at: {
    kind: "validation",
    message: "La fecha de expiración es inválida.",
  },
  expires_at_too_soon: {
    kind: "validation",
    message: "La expiración debe ser al menos 7 días en el futuro.",
  },
  invalid_amount: {
    kind: "validation",
    message: "El monto debe ser un entero positivo.",
  },
  amount_exceeds_max: {
    kind: "validation",
    message: "El monto supera el máximo permitido.",
  },
  invalid_search_limit: {
    kind: "validation",
    message: "El límite mensual debe ser mayor que cero.",
  },
  search_limit_exceeds_max: {
    kind: "validation",
    message: "El límite mensual supera el máximo permitido.",
  },
  invalid_buffer_target: {
    kind: "validation",
    message: "El objetivo de buffer debe ser mayor que cero.",
  },
  buffer_target_exceeds_max: {
    kind: "validation",
    message: "El objetivo de buffer supera el máximo permitido.",
  },
  invalid_daily_refill: {
    kind: "validation",
    message: "El límite diario debe ser mayor que cero.",
  },
  daily_refill_exceeds_max: {
    kind: "validation",
    message: "El límite diario supera el máximo permitido.",
  },
} as const satisfies Record<string, { kind: DomainErrorKind; message: string }>;

export type DomainCode = keyof typeof ERROR_CATALOG;
