import type {
  AnimationDefinition,
  TargetAndTransition,
  VisualElement,
  VisualElementAnimationOptions,
} from "motion-dom";
import {
  animateVisualElement,
  calcChildStagger,
  isAnimationControls,
  isVariantLabel,
  resolveVariant,
} from "motion-dom";

import { shallowCompare } from "./utils";
import { getVariantContext } from "./utils/get-variant-context";

const variantPriorityOrder = [
  "animate",
  "whileInView",
  "whileFocus",
  "whileHover",
  "whilePress",
  "whileDrag",
  "exit",
] as const;

export type AnimationType = (typeof variantPriorityOrder)[number];

const reversePriorityOrder = [...variantPriorityOrder].reverse();
const numAnimationTypes = variantPriorityOrder.length;

export interface AnimationTypeState {
  isActive: boolean;
  protectedKeys: Record<string, true>;
  needsAnimating: Record<string, boolean>;
  prevResolvedValues: Record<string, any>;
  prevProp?: any;
}

function createTypeState(isActive = false): AnimationTypeState {
  return {
    isActive,
    protectedKeys: {},
    needsAnimating: {},
    prevResolvedValues: {},
  };
}

function createState(): Record<string, AnimationTypeState> {
  return {
    animate: createTypeState(true),
    whileInView: createTypeState(),
    whileHover: createTypeState(),
    whilePress: createTypeState(),
    whileDrag: createTypeState(),
    whileFocus: createTypeState(),
    exit: createTypeState(),
  };
}

function checkVariantsDidChange(prev: any, next: any): boolean {
  if (typeof next === "string") {
    return next !== prev;
  } else if (Array.isArray(next)) {
    return !shallowCompare(next, prev);
  }
  return false;
}

function isKeyframesTarget(v: any): v is any[] {
  return Array.isArray(v);
}

export interface AnimationStateAPI {
  animateChanges: (changedActiveType?: AnimationType) => Promise<any>;
  setActive: (type: AnimationType, isActive: boolean) => Promise<any>;
  setAnimateFunction: (
    fn: (
      visualElement: VisualElement<Element>,
    ) => (animations: any[]) => Promise<any>,
  ) => void;
  getState: () => Record<string, AnimationTypeState>;
  reset: () => void;
}

interface DefinitionAndOptions {
  animation: AnimationDefinition;
  options?: VisualElementAnimationOptions;
}

export type AnimateFunction = (
  animations: DefinitionAndOptions[],
) => Promise<any>;

function createAnimateFunction(
  visualElement: VisualElement<Element>,
): AnimateFunction {
  return (animations: DefinitionAndOptions[]) => {
    return Promise.all(
      animations.map(({ animation, options }) =>
        animateVisualElement(visualElement, animation, options),
      ),
    );
  };
}

export function createAnimationState(
  visualElement: VisualElement<any>,
): AnimationStateAPI {
  let animate = createAnimateFunction(visualElement);
  let state = createState();
  let isInitialRender = true;

  const buildResolvedTypeValues =
    (type: AnimationType) =>
    (
      acc: { [key: string]: any },
      definition: string | TargetAndTransition | undefined,
    ) => {
      const resolved = resolveVariant(
        visualElement,
        definition,
        type === "exit" ? visualElement.presenceContext?.custom : undefined,
      );

      if (resolved) {
        const { transition, transitionEnd, ...target } = resolved;
        acc = { ...acc, ...target, ...transitionEnd };
      }

      return acc;
    };

  function setAnimateFunction(
    makeAnimator: (
      visualElement: VisualElement<Element>,
    ) => (animations: any[]) => Promise<any>,
  ) {
    animate = makeAnimator(visualElement);
  }

  function animateChanges(changedActiveType?: AnimationType) {
    const { props } = visualElement;
    const context = getVariantContext(visualElement.parent) || {};
    const animations: Array<DefinitionAndOptions> = [];

    const removedKeys = new Set<string>();

    let encounteredKeys: Record<string, true> = {};

    let removedVariantIndex = Infinity;

    for (let i = 0; i < numAnimationTypes; i++) {
      const type = reversePriorityOrder[i];
      const typeState = state[type];
      const prop = props[type] !== undefined ? props[type] : context[type];
      const propIsVariant = isVariantLabel(prop);

      const activeDelta =
        type === changedActiveType ? typeState.isActive : null;
      if (activeDelta === false) removedVariantIndex = i;

      let isInherited =
        prop === context[type] && prop !== props[type] && propIsVariant;

      if (
        isInherited &&
        isInitialRender &&
        visualElement.manuallyAnimateOnMount
      ) {
        isInherited = false;
      }

      typeState.protectedKeys = { ...encounteredKeys };

      if (
        (!typeState.isActive && activeDelta === null) ||
        (!prop && !typeState.prevProp) ||
        isAnimationControls(prop) ||
        typeof prop === "boolean"
      ) {
        continue;
      }

      const variantDidChange = checkVariantsDidChange(typeState.prevProp, prop);
      let shouldAnimateType =
        variantDidChange ||
        (type === changedActiveType &&
          typeState.isActive &&
          !isInherited &&
          propIsVariant) ||
        (i > removedVariantIndex && propIsVariant);

      let handledRemovedValues = false;

      const definitionList = Array.isArray(prop) ? prop : [prop];

      let resolvedValues = definitionList.reduce(
        buildResolvedTypeValues(type),
        {},
      );
      if (activeDelta === false) resolvedValues = {};

      const { prevResolvedValues = {} } = typeState;
      const allKeys = {
        ...prevResolvedValues,
        ...resolvedValues,
      };

      const markToAnimate = (key: string) => {
        shouldAnimateType = true;
        if (removedKeys.has(key)) {
          handledRemovedValues = true;
          removedKeys.delete(key);
        }
        typeState.needsAnimating[key] = true;

        const motionValue = visualElement.getValue(key);
        if (motionValue) motionValue.liveStyle = false;
      };

      for (const key in allKeys) {
        const next = resolvedValues[key];
        const prev = prevResolvedValues[key];

        if (Object.hasOwnProperty.call(encounteredKeys, key)) continue;

        let valueHasChanged = false;
        if (isKeyframesTarget(next) && isKeyframesTarget(prev)) {
          valueHasChanged = !shallowCompare(next, prev);
        } else {
          valueHasChanged = next !== prev;
        }

        if (valueHasChanged) {
          if (next !== undefined && next !== null) {
            markToAnimate(key);
          } else {
            removedKeys.add(key);
          }
        } else if (next !== undefined && removedKeys.has(key)) {
          markToAnimate(key);
        } else {
          typeState.protectedKeys[key] = true;
        }
      }

      typeState.prevProp = prop;
      typeState.prevResolvedValues = resolvedValues;

      if (typeState.isActive) {
        encounteredKeys = { ...encounteredKeys, ...resolvedValues };
      }

      if (isInitialRender && visualElement.blockInitialAnimation) {
        shouldAnimateType = false;
      }

      const willAnimateViaParent = isInherited && variantDidChange;
      const needsAnimating = !willAnimateViaParent || handledRemovedValues;

      if (shouldAnimateType && needsAnimating) {
        animations.push(
          ...definitionList.map((animation) => {
            const options: VisualElementAnimationOptions = { type } as any;

            if (
              typeof animation === "string" &&
              isInitialRender &&
              !willAnimateViaParent &&
              visualElement.manuallyAnimateOnMount &&
              visualElement.parent
            ) {
              const { parent } = visualElement;
              const parentVariant = resolveVariant(parent, animation);

              if (parent.enteringChildren && parentVariant) {
                const { delayChildren } = parentVariant.transition || {};
                options.delay = calcChildStagger(
                  parent.enteringChildren,
                  visualElement,
                  delayChildren,
                );
              }
            }

            return {
              animation: animation as AnimationDefinition,
              options,
            };
          }),
        );
      }
    }

    if (removedKeys.size) {
      const fallbackAnimation: TargetAndTransition = {};

      if (typeof props.initial !== "boolean") {
        const initialTransition = resolveVariant(
          visualElement,
          Array.isArray(props.initial) ? props.initial[0] : props.initial,
        );

        if (initialTransition && initialTransition.transition) {
          fallbackAnimation.transition = initialTransition.transition;
        }
      }

      removedKeys.forEach((key) => {
        const fallbackTarget = visualElement.getBaseTarget(key);

        const motionValue = visualElement.getValue(key);
        if (motionValue) motionValue.liveStyle = true;

        fallbackAnimation[key] = fallbackTarget ?? null;
      });

      animations.push({ animation: fallbackAnimation });
    }

    let shouldAnimate = Boolean(animations.length);

    if (
      isInitialRender &&
      (props.initial === false || props.initial === props.animate) &&
      !visualElement.manuallyAnimateOnMount
    ) {
      shouldAnimate = false;
    }

    isInitialRender = false;

    return shouldAnimate ? animate(animations) : Promise.resolve();
  }

  function setActive(type: AnimationType, isActive: boolean) {
    if (state[type].isActive === isActive) return Promise.resolve();

    visualElement.variantChildren?.forEach((child) => {
      child.animationState?.setActive(type as any, isActive);
    });

    state[type].isActive = isActive;
    const animations = animateChanges(type);

    for (const key in state) {
      state[key].protectedKeys = {};
    }

    return animations;
  }

  return {
    animateChanges,
    setActive,
    setAnimateFunction,
    getState: () => state,
    reset: () => {
      state = createState();
      isInitialRender = true;
    },
  };
}

export { checkVariantsDidChange };
