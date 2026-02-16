# Project guidelines

## ALWAYS

- Prefer retrieval-led reasoning over pre-training for libraries/frameworks. Use MCP context7 for current docs before writing code.
- Follow framework conventions—do not invent workarounds.
- Implement ONLY what requested (no extra features, no improvements). If request conflicts with architecture or standards, state concern and suggest alternatives.
- If ambiguous, ask up to 2 clarifying questions OR choose simplest valid interpretation.
- Keep responses brief: 3-6 sentences for typical answers. For multi-step work: short overview + ≤5 bullets (what changed, where, next steps).
- State what you verified vs what you're inferring. If uncertain about line numbers or API details, say so.

## WHEN implementing

- Make one change at a time. Run `bun run check` after each change.
- After edits: briefly state what changed, where (file/lines), and validation performed.
- Parallelize independent tool calls (file reads, searches) when possible.
- Provide brief updates (1-2 sentences) only when starting major work phases or plan changes.
- For complex architectural decisions: propose multiple options, evaluate with a rubric (pros/cons/tradeoffs), choose best or suggest hybrid. For straightforward implementations, proceed directly.
- Apply fail-fast: validate inputs → auth checks → business logic
  - Check "not OK" first to avoid nesting
  - Early return or throw immediately for invalid states
  - Keep happy path as straight-line code at the end
- TypeScript: Result<T,E> for service-layer errors. Check isErr() before throw/return
- Rust: Result<T,E> with ?. Validate early in handlers

## WHEN debugging

1. Reproduce: confirm current behavior
2. Isolate: add logging/breakpoints, narrow failing component
3. Read involved code paths
4. Fix only after understanding root cause

Do not assume bug from error messages alone.

## WHEN adding dependencies

- `bun install <package>` to add packages
- Never manually edit package.json dependency versions
- Look up current API via context7 if unfamiliar

## WHEN writing TypeScript

- Extract types from repo/service returns: `Awaited<ReturnType<typeof repos.foo.bar>>`
- Use utility types: `Pick<T, K>`, `Omit<T, K>`, `Partial<T>` over manual type redefinition
- Use `unknown` for external/untrusted data (errors, JSON parsing, API responses); narrow with type predicates `(value: unknown): value is Type`
- Use `as const` for literal values to enable discriminated unions: `{ status: "ok" as const }`
- Use `satisfies` for validation without widening: configs, `Record<K, V>` dictionaries, template literals
- End union/enum `switch` with `satisfies never` for exhaustiveness checks

## WHEN writing documentation

Prefer sentence case for headings. Avoid emojis.


## WHEN writing SolidJS

<!-- SOLIDJS-DOCS-START -->
[SolidJS Docs]|root:./.docs/solidjs|advanced-concepts:{fine-grained-reactivity}|concepts:{context,effects,intro-to-reactivity,refs,signals,stores,understanding-jsx}|concepts/components:{basics,class-style,event-handlers,props}|concepts/control-flow:{conditional-rendering,dynamic,error-boundary,list-rendering,portal}|concepts/derived-values:{derived-signals,memos}|reference/basic-reactivity:{create-effect,create-memo,create-resource,create-signal}|reference/component-apis:{children,create-context,create-unique-id,lazy,use-context}|reference/components:{dynamic,error-boundary,for,index-component,no-hydration,portal,show,suspense,suspense-list,switch-and-match}|reference/jsx-attributes:{attr,bool,classlist,innerhtml,on,on_,once,prop,ref,style,textcontent,use}|reference/lifecycle:{on-cleanup,on-mount}|reference/reactive-utilities:{batch,catch-error,create-root,from,get-owner,index-array,map-array,merge-props,observable,on-util,run-with-owner,split-props,start-transition,untrack,use-transition}|reference/rendering:{dev,hydrate,hydration-script,is-server,render,render-to-stream,render-to-string,render-to-string-async}|reference/secondary-primitives:{create-computed,create-deferred,create-reaction,create-render-effect,create-selector}|reference/server-utilities:{get-request-event}|reference/store-utilities:{create-mutable,create-store,modify-mutable,produce,reconcile,unwrap}|solid-router:{index}|solid-router/advanced-concepts:{lazy-loading,preloading}|solid-router/concepts:{actions,alternative-routers,catch-all,dynamic-routes,layouts,navigation,nesting,path-parameters,search-parameters}|solid-router/data-fetching:{queries,revalidation,streaming}|solid-router/data-fetching/how-to:{handle-error-and-loading-states,preload-data}|solid-router/getting-started:{component,config,installation-and-setup,linking-routes}|solid-router/guides:{migration}|solid-router/reference/components:{a,hash-router,memory-router,navigate,route,router}|solid-router/reference/data-apis:{action,cache,create-async,create-async-store,query,revalidate,use-action,use-submission,use-submissions}|solid-router/reference/preload-functions:{preload}|solid-router/reference/primitives:{use-before-leave,use-current-matches,use-is-routing,use-location,use-match,use-navigate,use-params,use-preload-route,use-resolved-path,use-search-params}|solid-router/reference/response-helpers:{json,redirect,reload}|solid-router/rendering-modes:{spa,ssr}|solid-start:{getting-started,index}|solid-start/advanced:{auth,middleware,request-events,return-responses,session,websocket}|solid-start/building-your-application:{api-routes,css-and-styling,data-fetching,data-mutation,head-and-metadata,route-prerendering,routing,static-assets}|solid-start/guides:{data-fetching,data-mutation,security,service-workers}|solid-start/reference/client:{client-only,mount,start-client}|solid-start/reference/config:{define-config}|solid-start/reference/entrypoints:{app,app-config,entry-client,entry-server}|solid-start/reference/routing:{file-routes}|solid-start/reference/server:{create-handler,create-middleware,get,get-server-function-meta,http-header,http-status-code,start-server,use-server}
<!-- SOLIDJS-DOCS-END -->

Anti-patterns (check docs before implementing):

- Props destructuring breaks reactivity—use `props.value`, not `const { value } = props`
- Components run once, not on every update—signals drive updates
- Signals are functions—access with `count()`, not `count`
- Use `<For>` (reference-keyed) for objects, `<Index>` (index-keyed) for primitives
- Side effects belong in `createEffect`/`onMount`, never during render

## STANDARDS—Files

Naming: kebab-case.ts, camelCase vars, PascalCase types, UPPER_SNAKE_CASE constants

Organization: 70-line guideline (not hard rule). Single responsibility—if "and also" in description, split. Code as documentation. Comments only for non-obvious decisions or JSDoc.

## STANDARDS—Project

Monorepo: web (TS/Bun, apps/web/), engine (Rust, apps/engine/), contracts (JSON source, contracts/engine-api.json)

Contract workflow: Changes to contracts/engine-api.json are source of truth. Run `bun run generate:engine-contract` for bindings. Never edit generated files.

Tests: tests/integration/, tests/unit/. Use vitest. Descriptive: `it("blocks further attempts after repeated failures")`

Checks: `bun run check` before proposing. Use `check:web` or `check:engine` for specific subsystems.
