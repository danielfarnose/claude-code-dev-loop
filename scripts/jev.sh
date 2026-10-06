#!/usr/bin/env bash
# Asks Jev (TypeSafe System One) closed questions about a ticket and prints the raw JSON answers.
# ADVISORY ONLY: an answer flags a ticket for the architect to re-read; it never blocks a ticket,
# approves a merge or replaces the @qa. Optional: without a key it exits 78 and the lead carries on
# exactly as before ("Jev not run" — never shown as a pass).
#
# Usage: jev.sh <ticket.md> [questions.json]   ·   jev.sh --check
#   questions.json defaults to templates/jev-ticket-questions.json — the ONE reviewable place for
#   the questions; change them there, not in prompts.
#   --check: one real request; exits 0 (key infers) or 78 (unusable).
# Config in $SQUAD_ENV_FILE or ~/.claude/squad.env (shell variables win), same as agent-or.sh:
#   TYPESAFE_API_KEY — required.   TYPESAFE_MODEL — optional, defaults to jev-latest.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TICKET="${1:-}"; QUESTIONS="${2:-$ROOT_DIR/templates/jev-ticket-questions.json}"
[[ -n "$TICKET" ]] || { echo "usage: jev.sh <ticket.md> [questions.json]  ·  jev.sh --check" >&2; exit 64; }

# ponytail: copy of agent-or.sh's loader (TYPESAFE_* instead of OPENROUTER_*); extract a shared
# file if a third script needs it.
for ENV_FILE in "${SQUAD_ENV_FILE:-}" "$HOME/.claude/squad.env" "$ROOT_DIR/.env"; do
  [[ -n "$ENV_FILE" && -f "$ENV_FILE" ]] || continue
  while IFS= read -r line || [[ -n "$line" ]]; do
    if [[ "$line" =~ ^[[:space:]]*(TYPESAFE_[A-Z_]+)[[:space:]]*=[[:space:]]*(.*)$ ]]; then
      k="${BASH_REMATCH[1]}"; v="${BASH_REMATCH[2]%\"}"; v="${v#\"}"
      [[ -z "${!k:-}" ]] && export "$k=$v"
    fi
  done < "$ENV_FILE"
done
[[ -n "${TYPESAFE_API_KEY:-}" ]] || { echo "TYPESAFE_API_KEY is not set (shell, SQUAD_ENV_FILE, or ~/.claude/squad.env) — Jev not run" >&2; exit 78; }
MODEL="${TYPESAFE_MODEL:-jev-latest}"

if [[ "$TICKET" == "--check" ]]; then
  body="$(jq -n --arg m "$MODEL" '{state:"ok", model:$m, questions:{ok:{type:"noul", instructions:"The text says ok"}}}')"
else
  [[ -f "$TICKET" ]] || { echo "no such ticket: $TICKET" >&2; exit 64; }
  [[ -f "$QUESTIONS" ]] || { echo "no such questions file: $QUESTIONS" >&2; exit 64; }
  body="$(jq -n --rawfile s "$TICKET" --slurpfile q "$QUESTIONS" --arg m "$MODEL" '{state:$s, model:$m, questions:$q[0]}')"
fi

# 429/529 = rate limit / overloaded: the API asks for backoff. Three tries, then give up (78).
out="$(mktemp)"; trap 'rm -f "$out"' EXIT
for wait in 2 8 0; do
  code="$(curl -sS -o "$out" -w '%{http_code}' -X POST https://api.typesafe.ai/v1/systemone \
    -H "Authorization: Bearer $TYPESAFE_API_KEY" -H "Content-Type: application/json" \
    --data-binary "$body" || true)"
  [[ "$code" == 429 || "$code" == 529 ]] && (( wait > 0 )) && { sleep "$wait"; continue; }
  break
done

if [[ "$code" != 200 ]]; then
  echo "Jev not run (HTTP $code): $(head -c 300 "$out")" >&2
  [[ "$code" == 422 ]] && exit 65   # our request is wrong (bad questions file) — not an outage
  exit 78
fi
if [[ "$TICKET" == "--check" ]]; then echo "OK · $(jq -r .model "$out") answers with this key"; else cat "$out"; fi
