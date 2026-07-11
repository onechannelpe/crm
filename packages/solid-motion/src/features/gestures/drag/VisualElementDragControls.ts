import { invariant } from "hey-listen";
import type {
  AnimationGeneratorType,
  LayoutUpdateData,
  Transition,
  VisualElement,
} from "motion-dom";
import {
  addValueToWillChange,
  animateMotionValue,
  calcLength,
  convertBoundingBoxToBox,
  convertBoxToBoundingBox,
  createBox,
  eachAxis,
  frame,
  measurePageBox,
  mixNumber,
  percent,
} from "motion-dom";
import type { Axis, BoundingBox, Point } from "motion-utils";

import type { MotionProps } from "../../../components";
import {
  addDomEvent,
  addPointerEvent,
  extractEventInfo,
} from "../../../events";
import type { MotionState } from "../../../state";
import type { Options } from "../../../types";
import { getContextWindow } from "../../../utils";
import type { PanInfo } from "../pan/PanSession";
import { PanSession } from "../pan/PanSession";
import type { Lock } from "./lock";
import { getGlobalLock } from "./lock";
import type { ResolvedConstraints } from "./types";
import {
  applyConstraints,
  calcOrigin,
  calcRelativeConstraints,
  calcViewportConstraints,
  defaultElastic,
  rebaseAxisConstraints,
  resolveDragElastic,
} from "./utils/constraints";
import { isHTMLElement } from "./utils/is";

export const elementDragControls = new WeakMap<
  VisualElement,
  VisualElementDragControls
>();

export interface DragControlOptions {
  snapToCursor?: boolean;
  cursorProgress?: Point;
}

type DragDirection = "x" | "y";

export class VisualElementDragControls {
  private state: MotionState;

  private panSession?: PanSession;

  private openGlobalLock: Lock | null = null;

  isDragging = false;
  private currentDirection: DragDirection | null = null;

  private originPoint: Point = { x: 0, y: 0 };

  private constraints: ResolvedConstraints | false = false;

  private hasMutatedConstraints = false;

  private elastic = createBox();

  constructor(state: MotionState) {
    this.state = state;
  }

  get visualElement() {
    return this.state.visualElement;
  }

  start(
    originEvent: PointerEvent,
    { snapToCursor = false }: DragControlOptions = {},
  ) {
    const onSessionStart = (event: PointerEvent) => {
      if (snapToCursor) {
        this.stopAnimation();
      } else {
        this.pauseAnimation();
      }

      if (snapToCursor) {
        this.snapToCursor(extractEventInfo(event, "page").point);
      }
    };

    const onStart = (event: PointerEvent, info: PanInfo) => {
      this.stopAnimation();

      const { drag, dragPropagation, onDragStart } = this.getProps();

      if (drag && !dragPropagation) {
        if (this.openGlobalLock) this.openGlobalLock();

        this.openGlobalLock = getGlobalLock(drag);

        if (!this.openGlobalLock) return;
      }

      this.isDragging = true;

      this.currentDirection = null;

      this.resolveConstraints();

      if (this.visualElement.projection) {
        this.visualElement.projection.isAnimationBlocked = true;
        this.visualElement.projection.target = undefined;
      }

      eachAxis((axis) => {
        let current = this.getAxisMotionValue(axis).get() || 0;

        if (percent.test(current)) {
          const { projection } = this.visualElement;

          if (projection && projection.layout) {
            const measuredAxis = projection.layout.layoutBox[axis];

            if (measuredAxis) {
              const length = calcLength(measuredAxis);
              current = length * (parseFloat(current) / 100);
            }
          }
        }

        this.originPoint[axis] = current;
      });

      if (onDragStart) {
        frame.postRender(() => onDragStart(event, info));
      }

      addValueToWillChange(this.visualElement, "transform");

      this.state.setActive("whileDrag", true);
    };

    const onMove = (event: PointerEvent, info: PanInfo) => {
      const { dragPropagation, dragDirectionLock, onDirectionLock, onDrag } =
        this.getProps();
      if (!dragPropagation && !this.openGlobalLock) return;

      const { offset } = info;
      if (dragDirectionLock && this.currentDirection === null) {
        this.currentDirection = getCurrentDirection(offset);

        if (this.currentDirection !== null) {
          onDirectionLock?.(this.currentDirection);
        }

        return;
      }
      this.updateAxis("x", info.point, offset);
      this.updateAxis("y", info.point, offset);

      this.visualElement.render();

      // Render before onDrag because the callback may trigger a layout update.
      onDrag?.(event, info);
    };

    const onSessionEnd = (event: PointerEvent, info: PanInfo) =>
      this.stop(event, info);

    const resumeAnimation = () =>
      eachAxis(
        (axis) =>
          this.getAnimationState(axis) === "paused" &&
          this.getAxisMotionValue(axis).animation?.play(),
      );

    const { dragSnapToOrigin } = this.getProps();

    this.panSession = new PanSession(
      originEvent,
      {
        onSessionStart,
        onStart,
        onMove,
        onSessionEnd,
        resumeAnimation,
      },
      {
        transformPagePoint: this.visualElement.getTransformPagePoint(),
        dragSnapToOrigin,
        contextWindow: getContextWindow(this.visualElement),
        element: this.state.element as HTMLElement,
      },
    );
  }

  private stop(event: PointerEvent, info: PanInfo) {
    const isDragging = this.isDragging;
    this.cancel();
    if (!isDragging) return;

    const { velocity } = info;
    this.startAnimation(velocity);

    const { onDragEnd } = this.getProps();
    if (onDragEnd) {
      frame.postRender(() => onDragEnd(event, info));
    }
  }

  private cancel() {
    this.isDragging = false;
    const { projection } = this.visualElement;
    if (projection) {
      projection.isAnimationBlocked = false;
    }
    this.panSession?.end();
    this.panSession = undefined;

    const { dragPropagation } = this.getProps();
    if (!dragPropagation && this.openGlobalLock) {
      this.openGlobalLock();
      this.openGlobalLock = null;
    }

    this.state.setActive("whileDrag", false);
  }

  private updateAxis(axis: DragDirection, _point: Point, offset?: Point) {
    const { drag } = this.getProps();

    if (!offset || !shouldDrag(axis, drag, this.currentDirection)) return;

    const axisValue = this.getAxisMotionValue(axis);
    let next = this.originPoint[axis] + offset[axis];

    if (this.constraints && this.constraints[axis]) {
      next = applyConstraints(next, this.constraints[axis], this.elastic[axis]);
    }

    axisValue.set(next);
  }

  private resolveConstraints() {
    const { dragConstraints, dragElastic } = this.getProps();

    const layout =
      this.visualElement.projection && !this.visualElement.projection.layout
        ? this.visualElement.projection.measure(false)
        : this.visualElement.projection?.layout;

    const prevConstraints = this.constraints;

    if (dragConstraints && isHTMLElement(dragConstraints)) {
      if (!this.constraints) {
        this.constraints = this.resolveRefConstraints();
      }
    } else {
      if (dragConstraints && layout) {
        this.constraints = calcRelativeConstraints(
          layout.layoutBox,
          dragConstraints as Partial<BoundingBox>,
        );
      } else {
        this.constraints = false;
      }
    }

    this.elastic = resolveDragElastic(dragElastic);

    if (
      prevConstraints !== this.constraints &&
      layout &&
      this.constraints &&
      !this.hasMutatedConstraints
    ) {
      eachAxis((axis) => {
        if (this.constraints !== false && this.getAxisMotionValue(axis)) {
          this.constraints[axis] = rebaseAxisConstraints(
            layout.layoutBox[axis],
            this.constraints[axis],
          );
        }
      });
    }
  }

  private resolveRefConstraints() {
    const { dragConstraints: constraints, onMeasureDragConstraints } =
      this.getProps();
    if (!constraints || !isHTMLElement(constraints)) return false;

    const constraintsElement = constraints;

    invariant(
      constraintsElement !== null,
      "If `dragConstraints` is set as a React ref, that ref must be passed to another component's `ref` prop.",
    );

    const { projection } = this.visualElement;

    if (!projection || !projection.layout) return false;

    const constraintsBox = measurePageBox(
      constraintsElement,
      projection.root!,
      this.visualElement.getTransformPagePoint(),
    );

    let measuredConstraints = calcViewportConstraints(
      projection.layout.layoutBox,
      constraintsBox,
    );

    if (onMeasureDragConstraints) {
      const userConstraints = onMeasureDragConstraints(
        convertBoxToBoundingBox(measuredConstraints),
      );

      this.hasMutatedConstraints = !!userConstraints;

      if (userConstraints) {
        measuredConstraints = convertBoundingBoxToBox(userConstraints);
      }
    }

    return measuredConstraints;
  }

  private startAnimation(velocity: Point) {
    const {
      drag,
      dragMomentum,
      dragElastic,
      dragTransition,
      dragSnapToOrigin,
      onDragTransitionEnd,
    } = this.getProps();

    const constraints: Partial<ResolvedConstraints> = this.constraints || {};

    const momentumAnimations = eachAxis((axis) => {
      if (!shouldDrag(axis, drag, this.currentDirection)) {
        return;
      }

      let transition = (constraints && constraints[axis]) || {};

      if (dragSnapToOrigin) transition = { min: 0, max: 0 };

      const bounceStiffness = dragElastic ? 200 : 1000000;
      const bounceDamping = dragElastic ? 40 : 10000000;

      const inertia = {
        type: "inertia" as AnimationGeneratorType,
        velocity: dragMomentum ? velocity[axis] : 0,
        bounceStiffness,
        bounceDamping,
        timeConstant: 750,
        restDelta: 1,
        restSpeed: 10,
        ...dragTransition,
        ...transition,
      };

      return this.startAxisValueAnimation(axis, inertia);
    });

    return Promise.all(momentumAnimations).then(onDragTransitionEnd);
  }

  private startAxisValueAnimation(axis: DragDirection, transition: Transition) {
    const axisValue = this.getAxisMotionValue(axis);

    addValueToWillChange(this.visualElement, axis);
    return (axisValue as any).start(
      animateMotionValue(
        axis,
        axisValue,
        0,
        transition,
        this.visualElement,
        false,
      ),
    );
  }

  private stopAnimation() {
    if (!this.visualElement.projection?.isPresent) return;
    eachAxis((axis) => this.getAxisMotionValue(axis).stop());
  }

  private pauseAnimation() {
    eachAxis((axis) => this.getAxisMotionValue(axis).animation?.pause());
  }

  private getAnimationState(axis: DragDirection) {
    return this.getAxisMotionValue(axis).animation?.state;
  }

  /** _dragX and _dragY override the element's x and y MotionValues. */
  private getAxisMotionValue(axis: DragDirection) {
    const dragKey =
      `_drag${axis.toUpperCase()}` as `_drag${Uppercase<DragDirection>}`;
    const props = this.visualElement.getProps();
    const externalMotionValue = props[dragKey];

    return (
      externalMotionValue ||
      this.visualElement.getValue(
        axis,
        (props.initial
          ? props.initial[axis as keyof typeof props.initial]
          : undefined) || 0,
      )
    );
  }

  private snapToCursor(point: Point) {
    eachAxis((axis) => {
      const { drag } = this.getProps();

      if (!shouldDrag(axis, drag, this.currentDirection)) return;

      const { projection } = this.visualElement;
      const axisValue = this.getAxisMotionValue(axis);

      if (projection && projection.layout) {
        const { min, max } = projection.layout.layoutBox[axis];

        axisValue.set(point[axis] - mixNumber(min, max, 0.5));
      }
    });
  }

  /** Preserve the element's relative position after measured constraints resize. */
  scalePositionWithinConstraints() {
    if (!this.visualElement.current) return;

    const { drag, dragConstraints } = this.getProps();
    const { projection } = this.visualElement;
    if (!isHTMLElement(dragConstraints) || !projection || !this.constraints)
      return;

    this.stopAnimation();

    const boxProgress = { x: 0, y: 0 };
    eachAxis((axis) => {
      const axisValue = this.getAxisMotionValue(axis);
      if (axisValue && this.constraints !== false) {
        const latest = axisValue.get();
        boxProgress[axis] = calcOrigin(
          { min: latest, max: latest },
          this.constraints[axis] as Axis,
        );
      }
    });

    const { transformTemplate } = this.visualElement.getProps();
    this.state.element.style.transform = transformTemplate
      ? transformTemplate({}, "")
      : "none";
    projection.root?.updateScroll();
    projection.updateLayout();
    this.resolveConstraints();

    eachAxis((axis) => {
      if (!shouldDrag(axis, drag, null)) return;

      const axisValue = this.getAxisMotionValue(axis);
      const { min, max } = (this.constraints as ResolvedConstraints)[
        axis
      ] as Axis;
      axisValue.set(mixNumber(min, max, boxProgress[axis]));
    });
  }

  addListeners() {
    if (!this.state.element) return;
    elementDragControls.set(this.visualElement, this);
    const element = this.state.element as HTMLElement;

    const stopPointerListener = addPointerEvent(
      element,
      "pointerdown",
      (event) => {
        const { drag, dragListener = true } = this.getProps();
        if (drag && dragListener) {
          this.start(event);
        }
      },
    );

    const measureDragConstraints = () => {
      const { dragConstraints } = this.getProps();
      if (isHTMLElement(dragConstraints)) {
        this.constraints = this.resolveRefConstraints();
      }
    };

    const { projection } = this.visualElement;

    const stopMeasureLayoutListener = projection!.addEventListener(
      "measure",
      measureDragConstraints,
    );

    if (projection && !projection!.layout) {
      projection.root?.updateScroll();
      projection.updateLayout();
    }

    frame.read(measureDragConstraints);

    const stopResizeListener = addDomEvent(window, "resize", () =>
      this.scalePositionWithinConstraints(),
    );

    const stopLayoutUpdateListener = projection!.addEventListener(
      "didUpdate",
      (({ delta, hasLayoutChanged }: LayoutUpdateData) => {
        if (this.isDragging && hasLayoutChanged) {
          eachAxis((axis) => {
            const motionValue = this.getAxisMotionValue(axis);
            if (!motionValue) return;

            this.originPoint[axis] += delta[axis].translate;
            motionValue.set(motionValue.get() + delta[axis].translate);
          });
          this.visualElement.render();
        }
      }) as any,
    );

    return () => {
      stopResizeListener();
      stopPointerListener();
      stopMeasureLayoutListener();
      stopLayoutUpdateListener?.();
    };
  }

  getProps(): Options {
    const props = this.visualElement.getProps() as any as Options;
    const {
      drag = false,
      dragDirectionLock = false,
      dragPropagation = false,
      dragConstraints = false,
      dragElastic = defaultElastic,
      dragMomentum = true,
    } = props;
    return {
      ...props,
      drag,
      dragDirectionLock,
      dragPropagation,
      dragConstraints,
      dragElastic,
      dragMomentum,
    };
  }
}

function shouldDrag(
  direction: DragDirection,
  drag: boolean | DragDirection | undefined,
  currentDirection: null | DragDirection,
) {
  return (
    (drag === true || drag === direction) &&
    (currentDirection === null || currentDirection === direction)
  );
}

function getCurrentDirection(
  offset: Point,
  lockThreshold = 10,
): DragDirection | null {
  let direction: DragDirection | null = null;

  if (Math.abs(offset.y) > lockThreshold) {
    direction = "y";
  } else if (Math.abs(offset.x) > lockThreshold) {
    direction = "x";
  }

  return direction;
}

export function expectsResolvedDragConstraints({
  dragConstraints,
  onMeasureDragConstraints,
}: MotionProps) {
  return isHTMLElement(dragConstraints) && !!onMeasureDragConstraints;
}
