import type { LeadImportType } from "~/features/leads-imports/contracts";
import type { ImportRowInput } from "~/server/integrations/application/import/types";

import {
  MAX_LEAD_IMPORT_ROWS,
  type LeadImportStreamFactory,
  type ResolvedLayout,
} from "./contracts";
import {
  resolveLayoutForImportType,
  inspectLeadImportCsv,
} from "./header-match";
import {
  assertSupportedLeadCsvLine,
  consumeCsvLinesFromStream,
  isLineEmpty,
} from "./line-reader";
import {
  mapLeadImportRow,
  splitLeadCsvLine,
  type LeadImportInvalidRow,
} from "./row-mapper";

export {
  MAX_LEAD_IMPORT_ROWS,
  PRIORITY_IMPORT_HEADERS,
  STATUS_IMPORT_HEADERS,
  type LeadImportCsvInspectionResult,
  type LeadImportTypeDetectionErrorCode,
} from "./contracts";
export { inspectLeadImportCsv };

export async function parseLeadImportRowsFromStream(input: {
  streamFactory: LeadImportStreamFactory;
  importType: LeadImportType;
}): Promise<{
  validRows: ImportRowInput[];
  invalidRows: LeadImportInvalidRow[];
}> {
  const validRows: ImportRowInput[] = [];
  const invalidRows: LeadImportInvalidRow[] = [];
  let layout: ResolvedLayout | null = null;
  let processedRows = 0;

  await consumeCsvLinesFromStream(input.streamFactory(), (line, rowNumber) => {
    if (isLineEmpty(line)) {
      return;
    }

    assertSupportedLeadCsvLine(line);

    if (!layout) {
      const resolution = resolveLayoutForImportType(line, input.importType);
      if (!resolution.ok) {
        throw new Error(resolution.message);
      }
      layout = resolution.layout;
      return;
    }

    const cells = splitLeadCsvLine(line, layout.delimiter);
    if (cells.length !== layout.headers.length) {
      invalidRows.push({
        row: rowNumber,
        reason: `Invalid column count: expected ${layout.headers.length}, got ${cells.length}`,
        type: input.importType,
      });
      return;
    }

    processedRows++;
    if (processedRows > MAX_LEAD_IMPORT_ROWS) {
      throw new Error(
        `Import exceeds maximum supported rows (${MAX_LEAD_IMPORT_ROWS})`,
      );
    }

    const mapped = mapLeadImportRow({
      rowNumber,
      importType: input.importType,
      headers: layout.headers,
      cells,
    });

    if (!mapped.ok) {
      invalidRows.push(mapped.row);
      return;
    }

    validRows.push(mapped.row);
  });

  if (!layout) {
    throw new Error("CSV header row is required");
  }

  return { validRows, invalidRows };
}
