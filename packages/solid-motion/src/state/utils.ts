import type { AsTag, MotionStateContext, Options, VariantType } from "../types";

export function getFinalTargetValues(
  resolved: Record<string, any>,
): Record<string, any> {
  const target = { ...resolved };
  delete target.transition;
  delete target.transitionEnd;

  return { ...target, ...resolved.transitionEnd };
}

function resolveVariantValue(
  definition?: Options["animate"],
  variants?: Options["variants"],
  custom?: Options["custom"],
): VariantType | undefined {
  if (Array.isArray(definition)) {
    return definition.reduce((acc, item) => {
      const resolvedVariant = resolveVariantValue(item, variants, custom);
      return resolvedVariant ? { ...acc, ...resolvedVariant } : acc;
    }, {});
  } else if (typeof definition === "object") {
    return definition as VariantType;
  } else if (definition && variants) {
    const variant = variants[definition as string];
    return typeof variant === "function" ? variant(custom) : variant;
  }
}

export function resolveVariant(
  definition?: Options["animate"],
  variants?: Options["variants"],
  custom?: Options["custom"],
): VariantType | undefined {
  const resolved = resolveVariantValue(definition, variants, custom);
  if (!resolved) return undefined;
  return getFinalTargetValues(resolved);
}

/** Builds initial inline styles for MotionState and server rendering. */
export function resolveInitialValues(
  options: Options,
  context?: MotionStateContext,
): Record<string, any> {
  const initial =
    options.initial === undefined && options.variants
      ? context?.initial
      : options.initial;
  const sources = initial === false ? ["initial", "animate"] : ["initial"];
  const custom = options.custom ?? (options as any).presenceContext?.custom;
  return sources.reduce<Record<string, any>>((acc, variant) => {
    return {
      ...acc,
      ...resolveVariant(
        options[variant] || context?.[variant],
        options.variants,
        custom,
      ),
    };
  }, {});
}

export function shallowCompare(next: any[], prev: any[]) {
  const prevLength = prev?.length;

  if (prevLength !== next.length) return false;

  for (let i = 0; i < prevLength; i++) {
    if (prev[i] !== next[i]) return false;
  }

  return true;
}

export function isCssVar(name: string) {
  return name?.startsWith("--");
}

export const svgElements = [
  "animate",
  "circle",
  "defs",
  "desc",
  "ellipse",
  "g",
  "image",
  "line",
  "filter",
  "marker",
  "mask",
  "metadata",
  "path",
  "pattern",
  "polygon",
  "polyline",
  "rect",
  "stop",
  "svg",
  "switch",
  "symbol",
  "text",
  "tspan",
  "use",
  "view",
  "clipPath",
  "feBlend",
  "feColorMatrix",
  "feComponentTransfer",
  "feComposite",
  "feConvolveMatrix",
  "feDiffuseLighting",
  "feDisplacementMap",
  "feDistantLight",
  "feDropShadow",
  "feFlood",
  "feFuncA",
  "feFuncB",
  "feFuncG",
  "feFuncR",
  "feGaussianBlur",
  "feImage",
  "feMerge",
  "feMergeNode",
  "feMorphology",
  "feOffset",
  "fePointLight",
  "feSpecularLighting",
  "feSpotLight",
  "feTile",
  "feTurbulence",
  "foreignObject",
  "linearGradient",
  "radialGradient",
  "textPath",
] as const;
type UnionStringArray<T extends Readonly<string[]>> = T[number];
export type SVGElements = UnionStringArray<typeof svgElements>;

const svgElementSet = new Set(svgElements);
export function isSVGElement(as: AsTag): as is SVGElements {
  return svgElementSet.has(as as SVGElements);
}
