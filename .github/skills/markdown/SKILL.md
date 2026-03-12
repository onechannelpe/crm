---
name: markdown
description: 'Technical Markdown writing and editing. Use when drafting or revising READMEs, contributing guides, architecture notes, runbooks, or other maintainer-facing documentation. Covers structure, prose, links, lists, command blocks, and readability review.'
---

## scope
- write technical Markdown for maintainers and contributors
- prefer readable prose over exhaustive inventories
- optimize both rendered output and raw Markdown

## workflow
1. read the current document and the code or config it describes
2. identify the document job: front page, task guide, architecture note, runbook, or reference
3. write the content first with minimal formatting
4. add headings, lists, links, and code fences only after the content is coherent
5. cut any sentence that does not add a fact, a constraint, or a procedure
6. reread in raw Markdown and in rendered structure; fix sections that feel list-heavy or path-heavy

## structure rules
- start with the document's job, not generic setup text
- use headings only for distinct technical topics
- keep heading count low; merge adjacent sections that answer the same question
- organize by task or system boundary, not by the order files were inspected
- put commands in short blocks with one lead-in sentence when the block needs context
- use lists for steps, options, or parallel items; use prose for everything else
- avoid sections added only for symmetry

## prose rules
- use short declarative sentences
- make the first sentence of each paragraph carry the topic
- keep one technical idea per paragraph
- prefer concrete nouns: route, worker, contract, handler, schema, query, migration
- prefer direct verbs: serves, writes, validates, forwards, generates, fails
- remove filler transitions and editorial throat-clearing
- avoid chatty or theatrical phrases
- avoid rhetorical contrasts such as "not only x but y"
- avoid repeated sentence templates across sections

## readability rules
- visible link labels should optimize for reading; link targets should preserve full precision
- same-area references may use short paths such as `src/server/auth.ts`
- cross-area references should use readable labels such as `handoff-token.ts (web)` or `engine API contract`
- if a directory is presented as a place to inspect, link it
- avoid showing full relative paths as visible link text when a shorter label is clear
- dense inventories should become grouped prose or a narrow table
- use tables only for genuinely tabular data such as config groups, support matrices, or status grids

## README patterns
- root README: strong title block, short orientation paragraph, small navigation surface, then the core tasks or system map
- app README: what the component does, how it runs, where requests or jobs enter, and what to read first when changing it
- architecture paragraphs should explain control flow and boundaries, not sell the design
- contribution entrypoints should name the first files or directories worth opening
- when a contract or generated artifact exists, state the source of truth and the regeneration command near the first mention

## style guardrails
- no meta-conversation
- no promotional language
- no speculation about future work unless the document is explicitly a roadmap
- no em dashes
- no decorative bolding or heading sprawl
- no file-by-file tours unless the document is a reference index

## strict rubric
- job clarity: the first screen makes the document purpose obvious
- section economy: each heading introduces a distinct topic with enough content to justify it
- sentence utility: each sentence adds a fact, a constraint, or a procedure
- paragraph shape: each paragraph develops one idea and stops
- readability: command blocks, links, and file references do not interrupt the prose
- specificity: statements name concrete code paths, interfaces, inputs, outputs, or constraints
- maintainability: volatile facts are tied to source-of-truth files or commands
- tone: calm, direct, and maintainer-written; no chat residue

## fail conditions
- headings exist only to make the document look complete
- paragraphs are lists in disguise
- the same concept is renamed for variety
- visible links read like raw filesystem paths
- commands appear without enough context to know when to run them
- prose sounds generic enough to fit a different repository unchanged
