# @crm/solid-motion

A SolidJS binding for [Motion](https://motion.dev) (v12, the maintained successor
to Motion One / Framer Motion), providing a declarative `<Motion>` component,
`<Presence>` exit animations, gestures, and drag — with SSR support for Solid Start.

It exists because the community `solid-motionone` wrapper is unmaintained and
pinned to the frozen `@motionone/dom` v10 engine. This package instead vendors
the **framework-agnostic** state core extracted by Motion for Vue (`motion-v`,
MIT) and drives it from a thin Solid layer, so we track the maintained
`motion-dom` / `framer-motion` v12 engine.

## Usage

```tsx
import { Motion, Presence } from "@crm/solid-motion";

<Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
  fades in on mount
</Motion.div>

<Presence>
  <Show when={open()}>
    <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      animates out before unmount
    </Motion.div>
  </Show>
</Presence>
```

## What works (verified end-to-end in a browser)

- Declarative `initial` / `animate` / `exit` / `variants` / `transition`, reactive on prop change.
- SSR: `initial` values (incl. transforms like `y: 20` → `translateY(20px)`) render as
  inline styles server-side, so there is no hydration flash.
- Gestures: `whileHover`, `whilePress`, `whileInView`, `whileFocus`.
- `drag` (with `dragConstraints`, `dragMomentum`, etc.).
- `<Presence>` exit/enter, including lists.

## Known limitation: layout animations

`layout` / `layoutId` props are wired (the projection features are registered and
elements position correctly), **but the FLIP layout animation does not run.**

Framer Motion's projection needs to snapshot an element's box _before_ the DOM
mutates and measure _after_ — React/Vue get this from their synchronous,
tree-ordered render commit. Solid's fine-grained model runs effects _after_ the
DOM has already updated, and an ancestor layout change never re-runs a child's
effect at all, so `willUpdate()` snapshots the already-moved box (zero delta).
Making layout animations work needs a Solid-native projection driver (a global
pre-commit render-effect pass), which is out of scope here. This is the same
reason `solid-motionone` never shipped layout animations.

## Build

Consumed as source — the app's Solid compiler builds the `.tsx` directly, no JS
build. Only TypeScript declarations are generated (so consumers type-check
against `dist/*.d.ts` instead of the vendored, intentionally non-strict engine
source):

```
bun run build:types   # regenerate dist/*.d.ts after editing src
```

`dist/` is gitignored and rebuilt automatically by the `prepare` script on
`bun install`.

## Attribution

The framework-agnostic engine core under `src/state`, `src/features`,
`src/events`, and the shared type/util modules is derived from
[motion-v](https://github.com/motiondivision/motion-vue) (MIT, © Rick Huang) and
[Motion](https://github.com/motiondivision/motion) (MIT, © Motion). The Solid
component/context/presence layer is original.
