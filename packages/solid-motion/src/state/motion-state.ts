import { invariant } from "hey-listen";
import type {
  AnimationType,
  DOMKeyframesDefinition,
  VisualElement,
  VisualElementOptions,
} from "motion-dom";
import { frame, isVariantLabel } from "motion-dom";

import type { PresenceContext } from "../components/animate-presence/presence";
import { motionGlobalConfig } from "../config";
import type { Feature, FeatureKey, StateType } from "../features";
import { lazyFeatures } from "../features/lazy-features";
import type { MotionStateContext, Options } from "../types";
import { isSVGElement, resolveInitialValues } from "./utils";

export const mountedStates = new WeakMap<Element, MotionState>();

export class MotionState {
  public type: "html" | "svg";
  public element: HTMLElement | SVGElement | null = null;
  public parent?: MotionState;

  public isExiting = false;
  public presenceContainer: HTMLElement | null = null;
  public options: Options & {
    presenceContext?: PresenceContext;
    features?: Array<typeof Feature>;
  };

  private children?: Set<MotionState> = new Set();

  public latestValues: DOMKeyframesDefinition;

  private features = new Map<FeatureKey, Feature>();

  public visualElement: VisualElement<Element>;

  constructor(options: Options, parent?: MotionState) {
    this.options = options;
    this.parent = parent;
    parent?.children?.add(this);

    this.latestValues = resolveInitialValues(options, this.context);
    this.type = isSVGElement(this.options.as as any) ? "svg" : "html";
  }

  private contextProxy: MotionStateContext | null = null;

  get context() {
    if (!this.contextProxy) {
      const handler = {
        get: (target: MotionStateContext, prop: keyof MotionStateContext) => {
          const value = this.options[prop];
          if (
            isVariantLabel(value) ||
            (prop === "initial" && value === false)
          ) {
            return value;
          }
          return this.parent?.context[prop];
        },
      };

      this.contextProxy = new Proxy({} as MotionStateContext, handler);
    }
    return this.contextProxy;
  }

  updateFeatures() {
    if (!this.visualElement) return;
    for (const FeatureCtor of lazyFeatures) {
      if (!this.features.has(FeatureCtor.key)) {
        this.features.set(FeatureCtor.key, new FeatureCtor(this));
      }
      const feature = this.features.get(FeatureCtor.key);
      if (this.isMounted()) {
        if (!feature.isMount) {
          feature.mount();
          feature.isMount = true;
        } else {
          feature.update();
        }
      }
    }
  }

  updateOptions(options: Options) {
    this.options = options;
    this.visualElement?.update(
      {
        ...(this.options as any),
        whileTap: this.options.whilePress,
      },
      // @ts-expect-error PresenceContext omits the React-specific presence fields.
      this.options.presenceContext ?? null,
    );
  }

  mount(element: HTMLElement | SVGElement) {
    invariant(
      Boolean(element),
      "Animation state must be mounted with valid Element",
    );
    mountedStates.set(element, this);
    this.element = element;
    const presenceId = this.options.presenceContext?.presenceId;
    if (presenceId !== undefined) {
      element.setAttribute(motionGlobalConfig.motionAttribute, presenceId);
    }
    this.visualElement?.mount(element);
    this.updateFeatures();
  }

  beforeUnmount() {
    this.getSnapshot(this.options, false);
  }

  unmount() {
    this.parent?.children?.delete(this);
    mountedStates.delete(this.element);
    this.features.forEach((f) => f.unmount?.());
    this.visualElement?.unmount();
  }

  beforeUpdate() {
    this.getSnapshot(this.options, undefined);
  }

  update() {
    this.updateFeatures();
    this.didUpdate();
  }

  tryExitComplete() {
    if (this.isExiting) return;
    if (
      this.options?.layoutId &&
      this.visualElement.projection?.currentAnimation?.state === "running"
    ) {
      return;
    }
    this.options.presenceContext?.onMotionExitComplete?.(
      this.presenceContainer,
      this,
    );
  }

  setActive(name: StateType, isActive: boolean) {
    if (name === "exit" && isActive) {
      this.isExiting = true;
    }
    this.visualElement?.animationState
      ?.setActive(name as AnimationType, isActive)
      .then(() => this.completeExitAnimation(name, isActive));
  }

  private completeExitAnimation(name: StateType, isActive: boolean) {
    if (name !== "exit" || !isActive) return;

    this.isExiting = false;
    if (this.options.layoutId) {
      frame.postRender(() => this.tryExitComplete());
      return;
    }

    this.tryExitComplete();
  }

  isMounted() {
    return Boolean(this.element);
  }

  initVisualElement(
    renderer: (
      tag: string,
      options: VisualElementOptions<any, any>,
    ) => VisualElement<Element>,
  ) {
    if (this.visualElement) return;
    this.visualElement = renderer(this.options.as as string, {
      // @ts-expect-error motion-dom expects React's PresenceContext shape.
      presenceContext: this.options.presenceContext ?? null,
      parent: this.parent?.visualElement,
      props: { ...this.options, whileTap: this.options.whilePress } as any,
      visualState: {
        renderState: {
          transform: {},
          transformOrigin: {},
          style: {},
          vars: {},
          attrs: {},
        },
        latestValues: { ...this.latestValues } as any,
      },
      reducedMotionConfig: this.options.motionConfig?.reducedMotion,
    });
    this.visualElement.parent?.addChild(this.visualElement);
    if (this.isMounted()) {
      this.visualElement.mount(this.element);
    }
  }

  getSnapshot(..._args: [options: Options, isPresent?: boolean]) {}
  didUpdate() {}
}
