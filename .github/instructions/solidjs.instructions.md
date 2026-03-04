---
description: "Use when writing, reviewing, or refactoring SolidJS components, routes, or signals. Covers reactivity model, component lifecycle, and rendering primitives."
applyTo: "apps/web/src/**/*.tsx"
---
# SolidJS conventions

Components run **once**—signals drive all updates. The reactivity model is tracking-based, not re-render based.

## Anti-patterns

| Wrong | Correct | Why |
|-------|---------|-----|
| `const { value } = props` | `props.value` | Destructuring breaks reactive tracking |
| Reading `count` | Calling `count()` | Signals are getter functions |
| Logic in render body | `createEffect` / `onMount` | Side effects must be tracked |
| `<For>` over primitives | `<Index>` for primitives | `<For>` is reference-keyed (re-creates on index shift) |
| `<Index>` over objects | `<For>` for objects | `<Index>` is index-keyed (re-creates on value change) |

## Signals and effects

```tsx
// Good: reactive access
const [count, setCount] = createSignal(0);
return <span>{count()}</span>;

// Bad: loses reactivity
const { count } = store; // never destructure
```

## Event handling and derived values

```tsx
// Derived value — updates automatically
const doubled = () => count() * 2;

// Side effect — runs when dependency changes
createEffect(() => console.log(count()));
```

## Checks

Run `bun run check:web` after every change.
