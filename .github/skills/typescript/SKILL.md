---
name: typescript
description: 'TypeScript and SolidJS patterns for this codebase. Use when implementing TypeScript features, reviewing TS/TSX code, choosing type utilities, debugging SolidJS reactivity issues, or checking exhaustiveness of union handling.'
---

## types
- extract types from repo/service returns, don't redefine: `Awaited<ReturnType<typeof repos.foo.bar>>`
- use utility types: Pick<T,K>, Omit<T,K>, Partial<T> over manual redefinition
- use unknown for external/untrusted data (errors, JSON parsing, API responses); narrow with type predicates:
  ```ts
  function isMyType(value: unknown): value is MyType {
    return typeof value === "object" && value !== null && "id" in value
  }
  ```
- use `as const` for literal values to enable discriminated unions: `{ status: "ok" as const }`
- use `satisfies` for validation without widening: configs, Record<K,V> dicts, template literals
- end union/enum switch with exhaustiveness check:
  ```ts
  default:
    status satisfies never
    throw new Error(`Unhandled status: ${status}`)
  ```
- Result<T,E> for service-layer errors; check isErr() before throw/return

## SolidJS anti-patterns
- props destructuring breaks reactivity; use props.value not `const { value } = props`
- components run once, not on every update; signals drive updates
- signals are functions; access with count(), not count
- use <For> (reference-keyed) for objects, <Index> (index-keyed) for primitives
- side effects belong in createEffect/onMount, never during render

## procedure
- extract types from inference before creating new ones
- narrow all external/untrusted data with type predicates
- wrap service errors in Result<T,E>; check isErr() before throw
- suspect SolidJS anti-patterns first before concluding a component is broken
- add satisfies never at end of every union switch
- run `bun run check:web` after each change
