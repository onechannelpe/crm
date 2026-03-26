export function buildLeadExportCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";

  const headers = Object.keys(rows[0]);
  const lines = rows.map((row) =>
    headers.map((key) => cell(row[key])).join(","),
  );
  return [headers.join(","), ...lines].join("\n");
}

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
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
