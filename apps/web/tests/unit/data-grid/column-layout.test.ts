import { describe, expect, it } from "vitest";

import { buildDataGridTemplateColumns } from "~/features/data-grid/model/column-layout";
import type { DataGridColumn } from "~/features/data-grid/model/types";

type Row = { id: string };

const columns = [
  {
    key: "name",
    label: "Name",
    minWidth: 180,
    grow: true,
    renderCell: (row: Row) => row.id,
  },
] satisfies ReadonlyArray<DataGridColumn<Row>>;

describe("buildDataGridTemplateColumns", () => {
  it("places capability tracks around the data columns", () => {
    expect(
      buildDataGridTemplateColumns(columns, {
        leadingTracks: [12, 28],
        trailingTracks: [32],
      }),
    ).toBe("12px 28px minmax(180px, 1fr) 32px");
  });

  it("uses the live resize width for a column", () => {
    expect(
      buildDataGridTemplateColumns(columns, {
        columnWidths: { name: 240 },
      }),
    ).toBe("240px");
  });
});
