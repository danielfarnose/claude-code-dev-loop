# Interactive project explainer

Squad explains the **active repository**, independently of its product, framework or language.
Use `/squad:explain [flow] [--tutor]` in Claude or `$squad:codex-explain [flow] [--tutor]` in
Codex for an explanation without starting development. At the close of a code run, deliver a
small map of the affected flow. Reuse its existing trace and evidence; this is documentation,
not the approved planning prototype or a WF test. It does not enable `--wf`, add a verification
gate, require human approval, create a video or authorize publication.

## Trace and responsibility

- **Architect:** follows the real entry point, callers, branches and consumers. Maps a small
  ordered main journey and identifies what each step receives/returns. Put alternate paths and
  limitations in the relevant step's `note`, not a speculative whole-repo graph.
- **Developer:** updates the changed paths/symbols/line ranges after implementing. Supplies the
  actual code revision and preserves prior verified references that still apply.
- **QA:** checks the touched map against the final reviewed code as part of the existing review,
  including consumers and relevant alternatives. A static snippet proves where code is, not
  that a live API or the whole journey passed. Reuse existing runtime/test evidence honestly.
- **Lead:** assembles and shows the map. On R0 the lead traces/checks it directly; no extra agents
  are needed solely for a small map. On explain-only requests, the architect/lead traces code
  read-only; report gaps explicitly instead of launching app tests to manufacture evidence.

`actor` identifies the human, component or process that actually runs the step. `agent` is a
runtime agent used by that project, or `null` for a deterministic/human step. These are distinct
from Squad's architect/developer/QA roles; do not assign those development roles as runtime
owners. Name functions, types and classes as they exist in the code; a Go function is not a class.

The map has three views: **Qué hace**, **Código y agentes**, and **Tutor**. Step buttons select a
block; code stays folded until requested. Tutor adds Anterior/Siguiente, progress, a concrete
example and at most three concepts from this project's language. Derive lessons from the
referenced code and contract/manifests when present. Annotations explain real lines inside a
snippet, not imagined code. If no lesson was prepared, show the verified summary and say so.
Do not turn every closing explanation into a full course; provide detailed tutoring on request.

## Artifacts and schema

Reuse one named map per flow, adjacent to its existing flow docs. Prefer the contract's `§Flows`
directory; otherwise use `docs/flows/`. For an explain-only request, a task-owned output directory
is also suitable. Save the JSON source and standalone HTML there. For inline display, create
the fragment in a durable task-owned location allowed by the available Visualize skill.
Record the code revision examined; update it and recheck refs if the source changes. A later
status/documentation-only commit does not invalidate unchanged source evidence.

```json
{
  "title": "Create an invoice",
  "repoRoot": "/absolute/path/to/the-active-repo",
  "revision": "code-commit-sha",
  "steps": [{
    "id": "save", "title": "Save the invoice", "actor": "Invoice service",
    "agent": null,
    "summary": "Validates the draft and saves it.",
    "input": "The customer's invoice draft.", "output": "The saved invoice ID.",
    "note": "Validation errors return to the editor.",
    "code": [{
      "path": "src/invoices/service.py", "symbol": "save_invoice",
      "line": 20, "lines": 8,
      "annotations": [{"line": 22, "text": "The validator checks the draft before it is saved."}]
    }],
    "tutor": {
      "explanation": "This function receives the draft, checks it and returns the saved result.",
      "example": "A draft with no customer returns an error before anything is saved.",
      "concepts": [{"term": "Function", "meaning": "A named piece of code that receives input and returns a result."}]
    }
  }]
}
```

This is a schema example, not a claim about any project's code. `note`, `code`, `tutor`,
`tutor.concepts` and `code[].annotations` are optional; text fields remain plain text. `agent`
may be `null`. Code paths are relative to the repository, and lines are one-based. `lines`
defaults to 12, must be 1–40, and the complete range must exist. `symbol` is a manually verified
name; the renderer checks files/ranges and reads the snippet itself, not an AST or invented JSON
snippet. Language labels are derived from source extensions and describe **this mapped journey**,
not an exhaustive repository inventory. For unsupported extensions, extend the renderer's
language table when needed rather than mislabeling the source.

Exclude credentials, auth state, `.env`, logs and secret material; inspect the selected snippets
before sharing. The renderer confines real paths and symlinks to the repo and rejects known
secret paths and non-source files. It limits source files to 1 MiB each/4 MiB combined, snippets
to 256 KiB combined, 40 steps and eight refs per step. These checks do not detect a credential
embedded inside ordinary source code; the author and QA must exclude it.

## Render and deliver

No packages, server, API or network calls are needed:

```bash
node <plugin-root>/scripts/flow-explainer.mjs <flow.json> <fragment.html> [--tutor]
node <plugin-root>/scripts/flow-explainer.mjs <flow.json> <standalone.html> --standalone [--tutor]
```

Relative `repoRoot` resolves from the JSON file's directory. The default output is a fragment
using the host's utilities/theme. Read and follow Visualize when available, including its
writable output location and inline response contract; do not assume it is installed. The
standalone output supplies its own defaults and works without Visualize. Both safely embed
plain-text data and use `textContent` for source and lesson display. Selection/view state uses
Visualize's `widgetState` when available; there is no learner tracking or remote storage.

Check the rendered map's step selection, mode switching and Tutor navigation before delivering.
Open snippets to confirm paths/symbols/line explanations match the code. Use the host's normal
browser/preview tools when available; a missing preview is a stated limitation, not permission
to install another browser framework. Explain-only output has code evidence, not an implied QA
approval. At run close, retain the map with the flow docs, link it in BOARD Notes, and show the
interactive explanation in the final response.
