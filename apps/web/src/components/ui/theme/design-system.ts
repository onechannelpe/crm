export const DS_SPACING_MULTIPLIER = 4 as const;

export const DS_MOTION = {
  instant: 75,
  fast: 150,
  normal: 300,
  slow: 500,
} as const;

export const DS_BREAKPOINTS = {
  mobile: 832,
} as const;

export const DS_Z_INDEX = {
  base: 1,
  sticky: 10,
  navigation: 20,
  overlay: 40,
  dialog: 50,
  toast: 60,
} as const;

export function dsSpacing(...steps: number[]): string {
  return steps.map((step) => `${step * DS_SPACING_MULTIPLIER}px`).join(" ");
}
