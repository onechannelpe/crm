import { persistNumberToCookie, readNumberFromCookie } from "./persistence";

type PanelWidthConstraints = {
  min: number;
  max: number;
  default: number;
};

type PanelWidthPersistenceOptions = {
  cookieName: string;
  maxAgeSeconds: number;
  constraints: PanelWidthConstraints;
};

function clampPanelWidth(width: number, constraints: PanelWidthConstraints) {
  return Math.min(constraints.max, Math.max(constraints.min, width));
}

export function readPanelWidthFromCookie(
  options: PanelWidthPersistenceOptions,
): number {
  return readNumberFromCookie(
    options.cookieName,
    options.constraints.default,
    (width) => clampPanelWidth(width, options.constraints),
  );
}

export function persistPanelWidthToCookie(
  width: number,
  options: PanelWidthPersistenceOptions,
): number {
  return persistNumberToCookie(
    options.cookieName,
    width,
    options.maxAgeSeconds,
    (nextWidth) => clampPanelWidth(nextWidth, options.constraints),
  );
}

export function clampPanelWidthToConstraints(
  width: number,
  constraints: PanelWidthConstraints,
): number {
  return clampPanelWidth(width, constraints);
}
