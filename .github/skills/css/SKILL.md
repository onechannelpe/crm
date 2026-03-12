---
name: css
description: 'CSS layout, flexbox, grid, and styling decisions. Use when debugging layout bugs, choosing layout algorithms, centering elements, working with shadows/depth, or applying container queries and :has selectors.'
---

## layout algorithms
css = collection of layout algorithms. always identify active algorithm first.
- flow: default for non-table elements
- flexbox: display:flex on parent → children use flexbox
- grid: display:grid on parent → children use grid
- positioned: position:absolute/fixed/sticky → overrides flex/grid participation
- property semantics (width, z-index, alignment) vary by algorithm
- in flexbox, width is hypothetical/shrinks; in flow, width is hard constraint
- z-index not implemented in pure flow layout
- inline vs block in flow affects intrinsic spacing and alignment

## flow layout
- inline elements: line layout, baseline-aligned by default
- inline elements (incl img) create bottom gap for descenders. fix: display:block on img | switch parent to flex/grid | line-height:0 on container (no readable text)
- block: stacks vertically, expands horizontally
- width:auto expands to available width, accounts for margin; width:100% = exact containing block width, ignores margin → overflow risk
- % height requires explicit height on parent (not min-height), circular dep otherwise
- min-height doesn't make height "knowable" for % children
- % heights calculated from parent content box (not padding/border)
- html special: height:100% on html = viewport height

## flexbox
- one primary axis distribution
- most versatile for centering/general alignment
- center both axes: display:flex; justify-content:center; align-items:center
- overflow symmetric when centered
- flex:1 → fills primary axis
- supports z-index without position
- prefer over grid when % sizing on children must relate to container (no grid track shrinkwrap)

## grid
- two-dimensional (rows + columns simultaneously)
- implicit grid: rows auto-created when not defined; explicit: both defined
- fr = flexible proportional; distributes remaining space after intrinsic sizing
- % in grid rigid → can overflow with gap; prefer fr over % when using gap
- gap preferred over grid-gap (deprecated)
- repeat(n, value) for repeated tracks
- assign with grid-column/grid-row for fixed placement
- grid lines ref lines not columns; n-column grid has n+1 lines
- start/end syntax with slash: grid-column: 2 / 4
- negative line numbers count from end; grid-column: 1 / -1 = full width
- span keyword: grid-column: span 2 (dynamic, no fixed pos)
- grid-auto-flow:row dense backfills gaps but may reorder visual order vs DOM; check accessibility
- DOM order must match visual order; tab order follows DOM not grid placement
- grid-template-areas for semantic clarity in explicit layouts
- align tracks: justify-content / align-content; align items in cells: justify-items / align-items; individual: justify-self / align-self
- justify = columns (inline axis); align = rows (block axis)
- place-content = justify-content + align-content; place-items = justify-items + align-items
- stacking in same cell: place-items:center

## centering
- one element, no sibling effect: max-width:fit-content; margin-inline:auto
- two-axis (any count): display:flex; justify-content:center; align-items:center
- floating overlay: position:fixed; inset:0; margin:auto (+ width/height:fit-content if unknown size)
- horizontal-only fixed: left:0; right:0; margin-inline:auto
- stack multiple centered: grid shared cell + place-items:center
- text centering: text-align:center (layout centering doesn't center inline content)
- use margin-inline not margin-left/right (logical direction)
- don't switch layout mode just for centering if simpler solution exists

## container queries
- use when component behavior depends on container size, not viewport
- media queries for top-level layout; container queries for sub-layout adaptation
- define with container-type (e.g. inline-size)
- min-width container queries for progressive enhancement
- safe baseline outside @container; enhance inside
- one intentional breakpoint > multiple fragile viewport breakpoints
- avoid magic number viewport ranges for component-specific behavior
- fail gracefully; unsupported browsers ignore @container
- nearest container is default when multiple ancestors; use container-name + @container <name> for specific ancestor
- container: name / type shorthand (sets both container-name and container-type)

## :has
- style parent based on descendant presence/state
- feature-detect: @supports selector(:has(*))
- fallback outside @supports
- :has(child:focus-visible) → move focus style to parent, doesn't affect mouse users
- prefer over :focus-within for specificity (specific types, focus-visible only)
- use with state pseudo-classes for interaction-driven styling
- :has on html for global detection (e.g. scroll lock)
- large/hardcoded :has = consider JS state instead
- no core functionality reliance where legacy support required
- combine with sibling combinators to select elements preceding a sibling
- cross-tree interactions via shared ancestor

## percentage and sizing
- % height requires explicit parent height
- % width: relative to containing block in flow/flex; in grid can be relative to track size
- grid track % calculated against total grid area; fr accounts for leftover space
- % tracks + gap → overflow; fr avoids this

## shadows
- larger offset+blur = higher elevation; single light source direction globally
- higher elevation: increase offset, increase blur, decrease opacity
- layered box-shadow (multiple layers) = more realistic depth than single large blur; layering increases render cost; avoid excessive layers and animating heavy layered shadows
- no pure black shadows (desaturates); match hue to bg, reduce saturation+lightness
- tune to avoid grey wash or glowing effect
- use design tokens/elevation scales
- css vars for shadow color so it adapts to bg
- adjust shadow color when bg color changes
- drop-shadow filter for non-rectangular shapes; box-shadow for rectangular

## accessibility
- logical DOM order for keyboard navigation
- grid visual reordering doesn't change reading order
- fallback focus styles when overriding defaults
- line-height ≥ 1.5 for body text
- logical properties (margin-inline etc.) for i18n
- avoid fragile layout hacks depending on viewport coincidences
- algorithm-aware solutions > memorized snippets

## decision hierarchy
- identify active algorithm before debugging
- one axis → flexbox; two axes → grid; overlay → positioned; doc flow → flow
- container queries for components; media queries for pages
- :has for static/structural relationships; JS state for dynamic
- maintainability > cleverness
- fr/fit-content over rigid % when gaps matter
- build mental models not isolated property memorization
