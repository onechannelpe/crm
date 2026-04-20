import type { ArtifactType } from "./types";

const MAX_SIZE_BYTES_DEFAULT = 20 * 1024 * 1024;
const MAX_FILENAME_LENGTH = 120;
const SAFE_FILENAME_RE = /^[a-zA-Z0-9 \-_.]+$/;
const DOUBLE_EXT_RE = /\.[a-zA-Z0-9]+\.[a-zA-Z0-9]+$/;
const PATH_SEGMENT_RE = /[/\\]/;

const ALLOWED_EXTENSIONS: Readonly<Record<ArtifactType, readonly string[]>> = {
  leads_export: ["csv"],
  integration_import: ["csv"],
  sales_export: ["csv", "xlsx"],
};

const MAX_SIZE_OVERRIDES: Partial<Record<ArtifactType, number>> = {};

const MIME_BY_EXTENSION: Record<string, string> = {
  csv: "text/csv; charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

const XLSX_MAGIC = [0x50, 0x4b, 0x03, 0x04];

export interface ValidationResult {
  ok: true;
  extension: string;
  detectedMime: string;
  signatureKind: string | null;
  safeDisplayFilename: string;
}

export interface ValidationFailure {
  ok: false;
  reason: string;
}

export function validateUploadFile(
  artifactType: ArtifactType,
  originalFilename: string,
  bytes: Uint8Array,
): ValidationResult | ValidationFailure {
  const maxBytes = MAX_SIZE_OVERRIDES[artifactType] ?? MAX_SIZE_BYTES_DEFAULT;

  if (bytes.length > maxBytes) {
    return { ok: false, reason: "file_too_large" };
  }

  const sanitized = sanitizeFilename(originalFilename);
  if (!sanitized) {
    return { ok: false, reason: "filename_invalid" };
  }

  const ext = extractExtension(sanitized);
  if (!ext) {
    return { ok: false, reason: "missing_extension" };
  }

  const allowed = ALLOWED_EXTENSIONS[artifactType];
  if (!allowed.includes(ext)) {
    return { ok: false, reason: "extension_not_allowed" };
  }

  if (DOUBLE_EXT_RE.test(sanitized)) {
    return { ok: false, reason: "double_extension_blocked" };
  }

  const signatureKind = detectSignature(bytes, ext);
  if (signatureKind === "mismatch") {
    return { ok: false, reason: "signature_mismatch" };
  }

  const detectedMime = MIME_BY_EXTENSION[ext] ?? "application/octet-stream";

  return {
    ok: true,
    extension: ext,
    detectedMime,
    signatureKind: signatureKind === "unknown" ? null : signatureKind,
    safeDisplayFilename: sanitized,
  };
}

function sanitizeFilename(filename: string): string | null {
  if (PATH_SEGMENT_RE.test(filename)) return null;

  const base = filename.trim();
  if (!base || base.length > MAX_FILENAME_LENGTH) return null;

  const safe = base.replace(/[^a-zA-Z0-9 \-_.]/g, "_");
  if (!SAFE_FILENAME_RE.test(safe)) return null;

  return safe;
}

function extractExtension(filename: string): string | null {
  const dot = filename.lastIndexOf(".");
  if (dot === -1) return null;
  return filename.slice(dot + 1).toLowerCase() || null;
}

function detectSignature(
  bytes: Uint8Array,
  ext: string,
): "xlsx" | "csv" | "unknown" | "mismatch" {
  if (ext === "xlsx") {
    const isXlsx = XLSX_MAGIC.every((b, i) => bytes[i] === b);
    return isXlsx ? "xlsx" : "mismatch";
  }

  if (ext === "csv") {
    if (bytes.length === 0) return "csv";
    const first = XLSX_MAGIC.every((b, i) => bytes[i] === b);
    if (first) return "mismatch";
    return "csv";
  }

  return "unknown";
}
