---
name: design
description: 'UI/UX audit and design architecture review. Use when evaluating page overload, navigation structure, information hierarchy, CTA placement, visual weight, onboarding flow, semantic color tokens, or planning architectural UI changes.'
---

## checks (detect → action)
- pages with >N distinct UI modules above-the-fold → collapse, hide, or lazy-load non-core widgets
- primary navigation: ensure single source-of-truth (router/layout/nav-component) → centralize nav into one module
- UI strings: detect synonyms for same concept (e.g. 'Schedule' vs 'Appointments') → canonical label, replace occurrences
- top-level CTAs: verify only core actions are primary → demote duplicates; move secondary to menus
- large data blocks rendered by default (logs, full lists, debug panels) → convert to collapsible/lazy-loaded
- oversized components, large fixed paddings, non-collapsible sidebars → compact variants, grid/auto-layout, reduce paddings
- feature flags / tenant config / props to hide/show modules → add toggle points
- theme tokens: colors map to states (success/warn/error) not decoration → tokenization and semantic color mapping
- CTAs: use verbs; multi-step actions use dropdowns/menus → verb-first labels; convert multi-actions to dropdowns
- core tabs: Home/Dashboard, Create, Schedule/Appointments (or equivalent) → restructure onboarding if missing
- heading sizes, font weights, prominence of primary vs secondary → increase visual weight for primary; subdue secondary
- optional features surfaced at top-level → move to secondary menus
- missing dividers, inconsistent spacing → add dividers, consistent spacing tokens

## thought process
1. locate navigation module
2. enumerate top-level UI elements: render-tree-simulate or static-parse templates for elements above fold; compute interactive_count
3. if interactive_count > threshold: mark page overloaded, list elements by selector and file path
4. extract all UI strings from templates; cluster by semantic similarity; output conflicting clusters
5. list CTAs in header/primary toolbar; classify by verb vs noun; mark non-verb CTAs
6. detect large data renders: find components that map to full lists or logs; check if they mount on load; if yes → recommend lazy-load/collapse
7. scan CSS/theme for tokens; map colors to semantic roles; flag decorative uses of state colors
8. assess onboarding flow: find first-run routes, welcome dashboards; verify presence of Home/Create/Schedule or equivalent

## output format
per finding: issue | location (file path + component/selector) | action
