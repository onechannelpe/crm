import type { DataGridPoint, DataGridSelectionBox } from "./types";

const AUTO_SCROLL_EDGE_THRESHOLD = 48;
const AUTO_SCROLL_STEP = 18;

export function getRowIndexFromPointer(
  container: HTMLElement,
  clientY: number,
): number | undefined {
  const rowElements = Array.from(
    container.querySelectorAll<HTMLElement>("[data-grid-row-index]"),
  );

  if (rowElements.length === 0) {
    return undefined;
  }

  for (const rowElement of rowElements) {
    const rowIndex = Number(rowElement.dataset.gridRowIndex);
    if (Number.isNaN(rowIndex)) {
      continue;
    }

    const rect = rowElement.getBoundingClientRect();
    if (clientY <= rect.top + rect.height / 2) {
      return rowIndex;
    }
  }

  const lastRowIndex = Number(rowElements.at(-1)?.dataset.gridRowIndex);

  return Number.isNaN(lastRowIndex) ? undefined : lastRowIndex;
}

export function autoScrollContainer(
  scrollWrapper: HTMLElement | undefined,
  clientY: number,
) {
  if (!scrollWrapper) {
    return;
  }

  const rect = scrollWrapper.getBoundingClientRect();

  if (clientY < rect.top + AUTO_SCROLL_EDGE_THRESHOLD) {
    scrollWrapper.scrollTop -= AUTO_SCROLL_STEP;
    return;
  }

  if (clientY > rect.bottom - AUTO_SCROLL_EDGE_THRESHOLD) {
    scrollWrapper.scrollTop += AUTO_SCROLL_STEP;
  }
}

export function getPointRelativeToContainer(
  container: HTMLElement,
  clientX: number,
  clientY: number,
): DataGridPoint {
  const rect = container.getBoundingClientRect();

  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

export function createSelectionBox(
  startPoint: DataGridPoint,
  endPoint: DataGridPoint,
): DataGridSelectionBox {
  return {
    top: Math.min(startPoint.y, endPoint.y),
    left: Math.min(startPoint.x, endPoint.x),
    width: Math.abs(endPoint.x - startPoint.x),
    height: Math.abs(endPoint.y - startPoint.y),
  };
}

export function getSelectableRowIdsInBox(
  container: HTMLElement,
  selectionBox: DataGridSelectionBox,
): Array<string | number> {
  const containerRect = container.getBoundingClientRect();
  const selectedRowIds: Array<string | number> = [];

  for (const rowElement of container.querySelectorAll<HTMLElement>(
    "[data-selectable-id]",
  )) {
    const rawId = rowElement.dataset.selectableId;
    if (!rawId) {
      continue;
    }
    const rowId = parseSelectableId(rawId);

    const rect = rowElement.getBoundingClientRect();
    const rowBox = {
      top: rect.top - containerRect.top,
      left: rect.left - containerRect.left,
      width: rect.width,
      height: rect.height,
    };

    if (boxesIntersect(selectionBox, rowBox)) {
      selectedRowIds.push(rowId);
    }
  }

  return selectedRowIds;
}

function parseSelectableId(value: string): string | number {
  if (/^-?\d+$/.test(value)) {
    return Number(value);
  }

  return value;
}

function boxesIntersect(
  boxA: DataGridSelectionBox,
  boxB: DataGridSelectionBox,
) {
  return (
    boxA.left <= boxB.left + boxB.width &&
    boxA.left + boxA.width >= boxB.left &&
    boxA.top <= boxB.top + boxB.height &&
    boxA.top + boxA.height >= boxB.top
  );
}
