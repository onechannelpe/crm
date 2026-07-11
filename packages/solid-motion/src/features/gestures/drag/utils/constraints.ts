import type { DragElastic } from "motion-dom";
import { calcLength, mixNumber } from "motion-dom";
import type { Axis, BoundingBox, Box } from "motion-utils";
import { clamp, progress } from "motion-utils";

import type { ResolvedConstraints } from "../types";

export function applyConstraints(
  point: number,
  { min, max }: Partial<Axis>,
  elastic?: Axis,
): number {
  if (min !== undefined && point < min) {
    point = elastic ? mixNumber(min, point, elastic.min) : Math.max(point, min);
  } else if (max !== undefined && point > max) {
    point = elastic ? mixNumber(max, point, elastic.max) : Math.min(point, max);
  }

  return point;
}

export const defaultElastic = 0.35;

export function calcRelativeConstraints(
  layoutBox: Box,
  { top, left, bottom, right }: Partial<BoundingBox>,
): ResolvedConstraints {
  return {
    x: calcRelativeAxisConstraints(layoutBox.x, left, right),
    y: calcRelativeAxisConstraints(layoutBox.y, top, bottom),
  };
}

export function calcRelativeAxisConstraints(
  axis: Axis,
  min?: number,
  max?: number,
): Partial<Axis> {
  return {
    min: min !== undefined ? axis.min + min : undefined,
    max: max !== undefined ? axis.max + max - (axis.max - axis.min) : undefined,
  };
}

export function resolveDragElastic(
  dragElastic: DragElastic = defaultElastic,
): Box {
  if (dragElastic === false) {
    dragElastic = 0;
  } else if (dragElastic === true) {
    dragElastic = defaultElastic;
  }

  return {
    x: resolveAxisElastic(dragElastic, "left", "right"),
    y: resolveAxisElastic(dragElastic, "top", "bottom"),
  };
}

export function resolveAxisElastic(
  dragElastic: DragElastic,
  minLabel: string,
  maxLabel: string,
): Axis {
  return {
    min: resolvePointElastic(dragElastic, minLabel),
    max: resolvePointElastic(dragElastic, maxLabel),
  };
}

export function resolvePointElastic(
  dragElastic: DragElastic,
  label: string,
): number {
  return typeof dragElastic === "number"
    ? dragElastic
    : dragElastic[label as keyof typeof dragElastic] || 0;
}

export function rebaseAxisConstraints(
  layout: Axis,
  constraints: Partial<Axis>,
): Partial<Axis> {
  const relativeConstraints: Partial<Axis> = {};

  if (constraints.min !== undefined) {
    relativeConstraints.min = constraints.min - layout.min;
  }

  if (constraints.max !== undefined) {
    relativeConstraints.max = constraints.max - layout.min;
  }

  return relativeConstraints;
}

export function calcViewportConstraints(layoutBox: Box, constraintsBox: Box) {
  return {
    x: calcViewportAxisConstraints(layoutBox.x, constraintsBox.x),
    y: calcViewportAxisConstraints(layoutBox.y, constraintsBox.y),
  };
}

export function calcViewportAxisConstraints(
  layoutAxis: Axis,
  constraintsAxis: Axis,
) {
  let min = constraintsAxis.min - layoutAxis.min;
  let max = constraintsAxis.max - layoutAxis.max;

  if (
    constraintsAxis.max - constraintsAxis.min <
    layoutAxis.max - layoutAxis.min
  ) {
    [min, max] = [max, min];
  }

  return { min, max };
}

export function calcOrigin(source: Axis, target: Axis): number {
  let origin = 0.5;
  const sourceLength = calcLength(source);
  const targetLength = calcLength(target);

  if (targetLength > sourceLength) {
    origin = progress(target.min, target.max - sourceLength, source.min);
  } else if (sourceLength > targetLength) {
    origin = progress(source.min, source.max - targetLength, target.min);
  }

  return clamp(0, 1, origin);
}
