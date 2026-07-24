import {
  defineUiPreferenceCookie,
  type UiPreferenceCookieCodec,
} from "~/lib/http/ui-preference-cookie";

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

function panelWidthCookie(options: PanelWidthPersistenceOptions) {
  const codec: UiPreferenceCookieCodec<number> = {
    decode(value) {
      const parsed = Number.parseInt(value, 10);
      return Number.isNaN(parsed)
        ? null
        : clampPanelWidth(parsed, options.constraints);
    },
    encode: String,
  };

  return defineUiPreferenceCookie({
    name: options.cookieName,
    maxAgeSeconds: options.maxAgeSeconds,
    codec,
  });
}

export function readPanelWidthFromCookie(
  options: PanelWidthPersistenceOptions,
): number {
  return panelWidthCookie(options).read() ?? options.constraints.default;
}

export function persistPanelWidthToCookie(
  width: number,
  options: PanelWidthPersistenceOptions,
): number {
  const clampedWidth = clampPanelWidth(width, options.constraints);
  panelWidthCookie(options).write(clampedWidth);

  return clampedWidth;
}

export function clampPanelWidthToConstraints(
  width: number,
  constraints: PanelWidthConstraints,
): number {
  return clampPanelWidth(width, constraints);
}
