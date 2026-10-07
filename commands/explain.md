---
description: Explains a flow in the active project with a clickable map, verified code references and an optional step-by-step tutor. Does not run the development loop.
argument-hint: [flow or question] [--tutor]
---

Explain the active project's flow requested in `$ARGUMENTS`.

Read `${CLAUDE_PLUGIN_ROOT}/docs/flow-explainer.md` and follow its shared contract. Use the
current repository and its actual languages; `.claude/squad.md`, manifests and existing flow
docs are orientation when present, not prerequisites. Do not onboard the repo or create a BOARD
just to explain it. If no flow is named, use the current task's flow or a small main journey
identified in the project's entry points; state the selected scope.

The lead coordinates an architect explicitly in **Explain-only mode**, supplying
`${CLAUDE_PLUGIN_ROOT}/agents/architect.md`, the absolute explanation-guide path and exact
repository/scope, or reuses an architect's existing verified trace. The lead may handle a small
explanation directly. Generate only the
explanation artifacts, with source references read from the active repo. Do not change product
code, launch the app, run its tests, create implementation/WF tickets or publish tracker data.
`--tutor` opens Tutor: guide the reader through this project's code and language, one step at a
time, with a concrete example and a few relevant concepts.

When Visualize is available, read its skill and deliver the fragment through its inline content
reference. Otherwise open/link the standalone version using the host's normal artifact tools.
Offer code exploration through the map's folded snippets; never claim unverified behavior or
invent classes, methods, agent ownership, lessons or test outcomes.
