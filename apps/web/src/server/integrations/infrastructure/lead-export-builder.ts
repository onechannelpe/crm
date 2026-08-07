export function buildRecordExportCsv(
  headers: readonly string[],
  rows: readonly (readonly unknown[])[],
): string {
  const headerLine = headers.map(cell).join(",");
  const lines = rows.map((row) => row.map(cell).join(","));
  return [headerLine, ...lines].join("\n");
}

function cell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string" || typeof value === "number") {
    return escapeCsv(String(value));
  }
  return escapeCsv(JSON.stringify(value));
}

function escapeCsv(value: string): string {
  if (value.includes('"') || value.includes(",") || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}
