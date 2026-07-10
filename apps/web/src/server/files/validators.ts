import type { FilePurpose } from "./types";

const MAX_SIZE_BYTES_DEFAULT = 20 * 1024 * 1024;
const MAX_FILENAME_LENGTH = 120;
const SAFE_FILENAME_RE = /^[a-zA-Z0-9 \-_.]+$/;
const DOUBLE_EXT_RE = /\.[a-zA-Z0-9]+\.[a-zA-Z0-9]+$/;
const PATH_SEGMENT_RE = /[/\\]/;

const ALLOWED_EXTENSIONS: Readonly<Record<FilePurpose, readonly string[]>> = {
  records_export: ["csv"],
  integration_import: ["csv", "xlsx"],
  sale_proof: ["pdf", "png", "jpg", "jpeg"],
  rate_revision_file: ["xlsx", "xls", "png", "jpg", "jpeg"],
  transactions_report: ["pdf", "csv", "xlsx", "xls", "png", "jpg", "jpeg"],
  addendum_unsigned: ["pdf"],
  addendum_signed_photo: ["pdf", "png", "jpg", "jpeg"],
  addendum_signed_pdf: ["pdf"],
  payment_proof: ["pdf", "png", "jpg", "jpeg"],
};

const MAX_SIZE_OVERRIDES: Partial<Record<FilePurpose, number>> = {};

const MIME_BY_EXTENSION: Record<string, string> = {
  csv: "text/csv; charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
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

export interface UploadMetadata {
  extension: string;
  detectedMime: string;
  signatureKind: string | null;
  safeDisplayFilename: string;
  sizeBytes: number;
}

export interface UploadStaticValidationResult {
  ok: true;
  extension: string;
  safeDisplayFilename: string;
}

export interface UploadStreamInspector {
  pushChunk(chunk: Uint8Array): ValidationFailure | null;
  finalize():
    | ValidationFailure
    | { ok: true; sizeBytes: number; signatureKind: string | null };
}

export function validateUploadMetadata(
  purpose: FilePurpose,
  originalFilename: string,
): UploadStaticValidationResult | ValidationFailure {
  const sanitized = sanitizeFilename(originalFilename);
  if (!sanitized) {
    return { ok: false, reason: "filename_invalid" };
  }

  const ext = extractExtension(sanitized);
  if (!ext) {
    return { ok: false, reason: "missing_extension" };
  }

  const allowed = ALLOWED_EXTENSIONS[purpose];
  if (!allowed.includes(ext)) {
    return { ok: false, reason: "extension_not_allowed" };
  }

  if (DOUBLE_EXT_RE.test(sanitized)) {
    return { ok: false, reason: "double_extension_blocked" };
  }

  return {
    ok: true,
    extension: ext,
    safeDisplayFilename: sanitized,
  };
}

export function createUploadStreamInspector(
  purpose: FilePurpose,
  extension: string,
): UploadStreamInspector {
  const maxBytes = maxUploadBytesForFilePurpose(purpose);
  const magicPrefix = new Uint8Array(XLSX_MAGIC.length);
  let prefixLen = 0;
  let sizeBytes = 0;

  return {
    pushChunk(chunk) {
      sizeBytes += chunk.byteLength;
      if (sizeBytes > maxBytes) {
        return { ok: false, reason: "file_too_large" };
      }

      if (prefixLen < magicPrefix.length) {
        const remaining = magicPrefix.length - prefixLen;
        const toCopy = Math.min(remaining, chunk.byteLength);
        magicPrefix.set(chunk.subarray(0, toCopy), prefixLen);
        prefixLen += toCopy;
      }

      return null;
    },

    finalize() {
      const signatureKind = detectSignatureFromPrefix(
        magicPrefix.subarray(0, prefixLen),
        extension,
        sizeBytes,
      );
      if (signatureKind === "mismatch") {
        return { ok: false, reason: "signature_mismatch" };
      }

      return {
        ok: true,
        sizeBytes,
        signatureKind: signatureKind === "unknown" ? null : signatureKind,
      };
    },
  };
}

export function buildUploadMetadata(
  safeDisplayFilename: string,
  extension: string,
  streamResult: { sizeBytes: number; signatureKind: string | null },
): UploadMetadata {
  return {
    extension,
    detectedMime: MIME_BY_EXTENSION[extension] ?? "application/octet-stream",
    signatureKind: streamResult.signatureKind,
    safeDisplayFilename,
    sizeBytes: streamResult.sizeBytes,
  };
}

export function validateUploadFile(
  purpose: FilePurpose,
  originalFilename: string,
  bytes: Uint8Array,
): ValidationResult | ValidationFailure {
  const staticValidation = validateUploadMetadata(purpose, originalFilename);
  if (!staticValidation.ok) return staticValidation;

  const inspector = createUploadStreamInspector(
    purpose,
    staticValidation.extension,
  );
  const streamError = inspector.pushChunk(bytes);
  if (streamError) return streamError;

  const streamValidation = inspector.finalize();
  if (!streamValidation.ok) return streamValidation;

  const metadata = buildUploadMetadata(
    staticValidation.safeDisplayFilename,
    staticValidation.extension,
    streamValidation,
  );

  return {
    ok: true,
    extension: metadata.extension,
    detectedMime: metadata.detectedMime,
    signatureKind: metadata.signatureKind,
    safeDisplayFilename: metadata.safeDisplayFilename,
  };
}

export function maxUploadBytesForFilePurpose(purpose: FilePurpose): number {
  return MAX_SIZE_OVERRIDES[purpose] ?? MAX_SIZE_BYTES_DEFAULT;
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

function detectSignatureFromPrefix(
  prefix: Uint8Array,
  ext: string,
  sizeBytes: number,
): "xlsx" | "csv" | "unknown" | "mismatch" {
  if (ext === "xlsx") {
    const isXlsx = XLSX_MAGIC.every((b, i) => prefix[i] === b);
    return isXlsx ? "xlsx" : "mismatch";
  }

  if (ext === "csv") {
    if (sizeBytes === 0) return "csv";
    const first = XLSX_MAGIC.every((b, i) => prefix[i] === b);
    if (first) return "mismatch";
    return "csv";
  }

  return "unknown";
}
