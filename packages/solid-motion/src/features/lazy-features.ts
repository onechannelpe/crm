import type { Feature } from "./feature";

export const lazyFeatures: Array<typeof Feature> = [];

export function updateLazyFeatures(features: Array<typeof Feature>) {
  for (const feature of features) {
    if (feature && !lazyFeatures.includes(feature)) {
      lazyFeatures.push(feature);
    }
  }
}
