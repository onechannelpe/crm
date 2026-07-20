# Solid Motion

`@crm/solid-motion` provides SolidJS components backed by Motion's maintained
DOM animation engine. Culqi360 consumes the package directly from TypeScript
source, including during server rendering.

## API

- `Motion` creates animated HTML and SVG elements.
- `Presence` and `AnimatePresence` keep removed children mounted until their
  exit animations finish.
- `MotionConfig` sets shared animation configuration for its descendants.
- `MotionState` exposes the underlying animation state when lower-level control
  is required.

## Usage

```tsx
import { Show } from "solid-js";

import { Motion, Presence } from "@crm/solid-motion";

<Motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.2 }}
>
  Fades in on mount
</Motion.div>

<Presence>
  <Show when={open()}>
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      Animates before unmounting
    </Motion.div>
  </Show>
</Presence>
```

Motion props are reactive. The package supports variants, transitions, exit
animations, hover, press, focus, viewport gestures, and drag constraints.
Initial values are rendered as inline styles during server rendering, including
transforms such as `y: 20`.

## Layout animations

`layout` and `layoutId` register projection state and position elements, but
FLIP layout animations do not run.

Motion's projection engine needs an element snapshot before a DOM update and a
measurement after it. Solid effects run after the DOM update, and an ancestor
layout change does not rerun a child's effect. The projection engine therefore
observes no usable position delta. Supporting layout animations requires a
Solid-specific projection driver with a pre-commit measurement pass.

## Development

The Culqi360 application compiles this package's `.tsx` source directly.
TypeScript declarations are generated in `dist/` so consumers do not type-check
the vendored engine source.

Run from `packages/solid-motion`:

```sh
bun run build:types
bun run test
```

`bun install` also regenerates declarations through the package's `prepare`
script.

## Attribution

The framework-independent engine code under `src/state`, `src/features`,
`src/events`, and the shared type and utility modules is derived from
[Motion for Vue](https://github.com/motiondivision/motion-vue) and
[Motion](https://github.com/motiondivision/motion). Both projects use the MIT
license. Motion for Vue is Copyright Rick Huang, and Motion is Copyright Motion.
The Solid component, context, and presence layers are original to this package.
