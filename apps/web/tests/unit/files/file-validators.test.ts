import { describe, expect, it } from "vitest";

import { validateUploadFile } from "~/server/files/validators";

const CSV_BYTES = new TextEncoder().encode(
  "ruc,nombre\n12345678901,Empresa SA",
);
const XLSX_MAGIC = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);

describe("validateUploadFile - extension checks", () => {
  it("accepts csv for integration_import", () => {
    const result = validateUploadFile(
      "integration_import",
      "data.csv",
      CSV_BYTES,
    );
    expect(result).toMatchObject({ ok: true });
  });

  it("accepts xlsx for integration_import", () => {
    const result = validateUploadFile(
      "integration_import",
      "data.xlsx",
      XLSX_MAGIC,
    );
    expect(result).toMatchObject({ ok: true });
  });

  it("accepts csv for records_export", () => {
    const result = validateUploadFile(
      "records_export",
      "export.csv",
      CSV_BYTES,
    );
    expect(result).toMatchObject({ ok: true });
  });

  it("rejects file without extension", () => {
    const result = validateUploadFile("integration_import", "noext", CSV_BYTES);
    expect(result).toMatchObject({ ok: false, reason: "missing_extension" });
  });
});

describe("validateUploadFile - filename sanitization", () => {
  it("rejects filenames with path segments", () => {
    const result = validateUploadFile(
      "integration_import",
      "../evil.csv",
      CSV_BYTES,
    );
    expect(result).toMatchObject({ ok: false, reason: "filename_invalid" });
  });

  it("rejects filenames exceeding 120 chars", () => {
    const longName = "a".repeat(121) + ".csv";
    const result = validateUploadFile(
      "integration_import",
      longName,
      CSV_BYTES,
    );
    expect(result).toMatchObject({ ok: false, reason: "filename_invalid" });
  });

  it("sanitizes special chars in filename to underscores", () => {
    const result = validateUploadFile(
      "integration_import",
      "mi archivo@datos.csv",
      CSV_BYTES,
    );
    if ("reason" in result) throw new Error("Expected success");
    expect(result.safeDisplayFilename).toBe("mi archivo_datos.csv");
  });
});

describe("validateUploadFile - signature checks", () => {
  it("accepts csv bytes and sets signatureKind to csv", () => {
    const result = validateUploadFile(
      "integration_import",
      "import.csv",
      CSV_BYTES,
    );
    if ("reason" in result) throw new Error("Expected success");
    expect(result.signatureKind).toBe("csv");
  });
});

describe("validateUploadFile - size limits", () => {
  it("rejects files exceeding 20 MB default limit", () => {
    const bigBytes = new Uint8Array(21 * 1024 * 1024);
    const result = validateUploadFile(
      "integration_import",
      "big.csv",
      bigBytes,
    );
    expect(result).toMatchObject({ ok: false, reason: "file_too_large" });
  });

  it("accepts files within the default limit", () => {
    const result = validateUploadFile(
      "integration_import",
      "ok.csv",
      CSV_BYTES,
    );
    expect(result).toMatchObject({ ok: true });
  });
});

describe("validateUploadFile - double extension", () => {
  it("rejects double extension filenames", () => {
    const result = validateUploadFile(
      "integration_import",
      "file.php.csv",
      CSV_BYTES,
    );
    expect(result).toMatchObject({
      ok: false,
      reason: "double_extension_blocked",
    });
  });
});

describe("validateUploadFile - MIME output", () => {
  it("returns correct MIME for csv", () => {
    const result = validateUploadFile(
      "integration_import",
      "data.csv",
      CSV_BYTES,
    );
    if ("reason" in result) throw new Error("Expected success");
    expect(result.detectedMime).toBe("text/csv; charset=utf-8");
  });
});
