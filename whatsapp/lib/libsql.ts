// Cliente mínimo para el servidor libsql/sqld del CRM, hablando su protocolo
// HTTP "Hrana" (pipeline) con fetch nativo. Sin dependencias externas.
//
// Doc del protocolo: cada request es { type: "execute", stmt: { sql, args } }.
// Las celdas de respuesta vienen tipadas: { type: "integer"|"text"|..., value }.

export type SqlValue = string | number | bigint | null | undefined;
export type Row = Record<string, string | number | null>;

interface HranaArg {
  type: "null" | "integer" | "float" | "text";
  value?: string | number;
}

interface HranaCell {
  type: string;
  value?: string | number;
}

interface HranaResult {
  cols: Array<{ name: string }>;
  rows: HranaCell[][];
}

interface HranaResponse {
  results?: Array<
    | { type: "ok"; response: { result: HranaResult } }
    | { type: "error"; error?: { message?: string } }
  >;
}

export interface Libsql {
  query<T extends Row = Row>(sql: string, args?: SqlValue[]): Promise<T[]>;
}

function toArg(value: SqlValue): HranaArg {
  if (value === null || value === undefined) return { type: "null" };
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { type: "integer", value: String(value) }
      : { type: "float", value };
  }
  if (typeof value === "bigint") return { type: "integer", value: String(value) };
  return { type: "text", value: String(value) };
}

function fromCell(cell: HranaCell): string | number | null {
  switch (cell.type) {
    case "null":
      return null;
    case "integer":
      return Number(cell.value);
    case "float":
      return typeof cell.value === "number" ? cell.value : Number(cell.value);
    default:
      return cell.value as string; // text / blob (base64) se devuelven tal cual
  }
}

export function createLibsql(opts: {
  url: string;
  authToken?: string;
}): Libsql {
  const base = opts.url.replace(/\/+$/, "");
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (opts.authToken) headers.authorization = `Bearer ${opts.authToken}`;

  // sqld 0.24 soporta v3; v2 como respaldo por compatibilidad.
  const endpoints = [`${base}/v3/pipeline`, `${base}/v2/pipeline`];

  async function pipeline(requests: unknown[]): Promise<HranaResponse> {
    let lastErr: unknown;
    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({ requests }),
        });
        if (res.status === 404) {
          lastErr = new Error(`libsql endpoint no encontrado (${endpoint})`);
          continue; // probar el siguiente endpoint
        }
        if (!res.ok) {
          throw new Error(`libsql HTTP ${res.status}: ${await res.text()}`);
        }
        return (await res.json()) as HranaResponse;
      } catch (err) {
        lastErr = err;
        // si fue error de red, no tiene sentido probar el otro path
        if (err instanceof TypeError) break;
      }
    }
    throw lastErr ?? new Error("libsql: sin respuesta");
  }

  async function query<T extends Row = Row>(
    sql: string,
    args: SqlValue[] = [],
  ): Promise<T[]> {
    const json = await pipeline([
      { type: "execute", stmt: { sql, args: args.map(toArg) } },
      { type: "close" },
    ]);
    const first = json.results?.[0];
    if (!first) throw new Error("libsql: respuesta vacía");
    if (first.type === "error") {
      throw new Error(`libsql SQL error: ${first.error?.message ?? "desconocido"}`);
    }
    const result = first.response.result;
    const cols = result.cols.map((c) => c.name);
    return result.rows.map((row) => {
      const obj: Row = {};
      row.forEach((cell, i) => {
        obj[cols[i]] = fromCell(cell);
      });
      return obj as T;
    });
  }

  return { query };
}
