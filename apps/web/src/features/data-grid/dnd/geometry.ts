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
