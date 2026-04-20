import type { Role } from "~/lib/auth/access/rbac";
import {
  isExecutiveCategoryValue,
  type ExecutiveCategoryValue,
} from "~/lib/db/types";
import type { InviteService } from "~/server/invites/application/types";
import { type BranchId, type InviteId, type UserId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";

type ProvisioningInterface = Pick<
  InviteService,
  "createInvite" | "markInviteDelivered"
>;

export interface BulkImportRow {
  firstSurname: string;
  secondSurname: string;
  names: string;
  email: string;
  expiresAt: number | null;
  executiveCategory: ExecutiveCategoryValue | null;
}

export type BulkImportError = {
  reason: "parse_error";
  message: string;
};

export type BulkRowError = {
  row: number;
  message: string;
};

export interface BulkParseResult {
  valid: BulkImportRow[];
  errors: BulkRowError[];
}

export interface BulkApplyResult {
  created: number;
  skipped: number;
  rowErrors: string[];
}

const MIN_EXPIRY_OFFSET_MS = 7 * 24 * 60 * 60 * 1000;

export async function applyImport(
  rows: BulkImportRow[],
  actor: { userId: UserId; role: Role; branchId: BranchId },
  safeRole: Role,
  provisioning: ProvisioningInterface,
  onInviteCreated: (params: {
    row: BulkImportRow;
    inviteId: InviteId;
    token: string;
    expiresAt: number;
  }) => Promise<void>,
): Promise<BulkApplyResult> {
  let created = 0;
  let skipped = 0;
  const rowErrors: string[] = [];

  for (const row of rows) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const result = await provisioning.createInvite({
        actorUserId: actor.userId,
        actorRole: actor.role,
        branchId: actor.branchId,
        names: row.names,
        firstSurname: row.firstSurname,
        secondSurname: row.secondSurname,
        email: row.email,
        role: safeRole,
        executiveCategory: row.executiveCategory,
        teamId: null,
        expiresAt: row.expiresAt,
      });

      if (!result.ok) {
        if (
          result.error.code === "active_user_exists" ||
          result.error.code === "pending_user_other_branch"
        ) {
          skipped++;
        } else {
          rowErrors.push(`${row.email}: ${result.error.message}`);
        }
        continue;
      }

      // eslint-disable-next-line no-await-in-loop
      await onInviteCreated({
        row,
        inviteId: result.value.inviteId,
        token: result.value.token,
        expiresAt: result.value.expiresAt,
      });
      created++;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      rowErrors.push(`${row.email}: ${message}`);
    }
  }

  return { created, skipped, rowErrors };
}

const CSV_COLUMNS = [
  "FIRST_SURNAME",
  "SECOND_SURNAME",
  "NAMES",
  "EMAIL",
  "DATE_EXPIRY",
  "EXECUTIVE_CATEGORY",
] as const;

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseAndValidateCsvRows(
  csv: string,
  role: Role,
): Result<BulkParseResult, BulkImportError> {
  const isExecutive = role === "executive";

  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return Err({ reason: "parse_error", message: "El archivo CSV está vacío" });
  }

  const header = parseCsvLine(lines[0]).map((h) =>
    h.toUpperCase().replace(/^"(.+)"$/, "$1"),
  );
  const requiredColumns = isExecutive
    ? CSV_COLUMNS.slice(0, 4).join(",") + ",DATE_EXPIRY,EXECUTIVE_CATEGORY"
    : CSV_COLUMNS.slice(0, 4).join(",");
  if (!header.slice(0, 4).every((col, i) => col === CSV_COLUMNS[i])) {
    return Err({
      reason: "parse_error",
      message: `Encabezado inválido. Se esperaba: ${requiredColumns}`,
    });
  }
  if (isExecutive && header[5] !== "EXECUTIVE_CATEGORY") {
    return Err({
      reason: "parse_error",
      message: `Para el rol ejecutivo se requiere la columna EXECUTIVE_CATEGORY. Se esperaba: ${requiredColumns}`,
    });
  }

  const valid: BulkImportRow[] = [];
  const errors: BulkRowError[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const rowNum = i + 1;

    const firstSurname = cols[0]?.trim() ?? "";
    const secondSurname = cols[1]?.trim() ?? "";
    const names = cols[2]?.trim() ?? "";
    const rawEmail = cols[3]?.trim() ?? "";
    const rawDate = cols[4]?.trim() ?? "";
    const rawCategory = cols[5]?.trim().toLowerCase() ?? "";

    if (!firstSurname) {
      errors.push({ row: rowNum, message: "Primer apellido requerido" });
      continue;
    }
    if (!secondSurname) {
      errors.push({ row: rowNum, message: "Segundo apellido requerido" });
      continue;
    }
    if (!names) {
      errors.push({ row: rowNum, message: "Nombres requeridos" });
      continue;
    }
    if (!rawEmail) {
      errors.push({ row: rowNum, message: "Correo requerido" });
      continue;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      errors.push({ row: rowNum, message: `Correo inválido: ${rawEmail}` });
      continue;
    }

    let expiresAt: number | null = null;
    if (rawDate) {
      const parsed = Date.parse(rawDate);
      if (isNaN(parsed)) {
        errors.push({ row: rowNum, message: `Fecha inválida: ${rawDate}` });
        continue;
      }
      if (parsed <= Date.now() + MIN_EXPIRY_OFFSET_MS) {
        errors.push({
          row: rowNum,
          message: `La fecha de vencimiento debe ser al menos 7 días en el futuro: ${rawDate}`,
        });
        continue;
      }
      expiresAt = parsed;
    }

    let executiveCategory: ExecutiveCategoryValue | null = null;
    if (isExecutive) {
      if (!isExecutiveCategoryValue(rawCategory)) {
        errors.push({
          row: rowNum,
          message: `Categoría de ejecutivo inválida: "${rawCategory}". Valores permitidos: elite, corporativa`,
        });
        continue;
      }
      executiveCategory = rawCategory;
    }

    valid.push({
      firstSurname,
      secondSurname,
      names,
      email: rawEmail.trim().toLowerCase(),
      expiresAt,
      executiveCategory,
    });
  }

  return Ok({ valid, errors });
}
