#!/usr/bin/env bash
# Runs @developer or @qa as a `claude -p` process against OpenRouter (GPT-5.6 Sol by default),
# instead of the session's Agent tool. Reason: inside one Claude Code session you cannot mix
# backends per subagent — the whole process talks to ONE endpoint. To let these two agents use a
# different model they are launched as a separate process carrying the OpenRouter env. The lead
# uses this as ATTEMPT 1; if it fails (exit != 0, unusable output) it falls back to the usual Agent
# tool (sonnet) — see commands/run.md §OpenRouter engine.
#
# Usage: agent-or.sh <developer|qa> <prompt-file> <workdir> [--dry-run]
#   prompt-file: the lead's prompt (the same one it would hand the Agent tool), in a file.
#   workdir:     the worktree the agent works in (the process cwd: repo hooks and settings apply
#                exactly as usual).
#   --dry-run:   prints the resolved command (without the token) and exits 0. A cheap self-check.
#   --check:     verifies against the API that the key can actually INFER, then exits (0 ok / 78
#                unusable). It exists because OpenRouter provisioning keys start the same way
#                (`sk-or-v1-`) and are valid for administration but return 401 on inference:
#                without this check the symptom was a silent fallback mid-run (2026-08-08).
#
# This optimization is Claude-only. Codex uses native Codex subagents and does not call this script.
# Config in $SQUAD_ENV_FILE or ~/.claude/squad.env (shell variables win):
#   OPENROUTER_API_KEY  — required. Without it, exit 78: the lead uses the fallback and carries on.
#   OPENROUTER_MODEL    — optional, defaults to openai/gpt-5.6-sol.
#
# The ANTHROPIC_* env is set ONLY on the child process — never export it into the lead's session
# (it would redirect the entire lead to OpenRouter).
set -euo pipefail

AGENT="${1:-}"; PROMPT_FILE="${2:-}"; WORKDIR="${3:-}"; FLAG="${4:-}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

usage() { echo "usage: agent-or.sh <developer|qa> <prompt-file> <workdir> [--dry-run|--check]  ·  agent-or.sh --check" >&2; exit 64; }
# Bare `--check`: validates the key only, with no agent and no prompt.
if [[ "$AGENT" == "--check" ]]; then AGENT="developer"; PROMPT_FILE=""; WORKDIR="."; FLAG="--check"; fi
[[ "$AGENT" == "developer" || "$AGENT" == "qa" ]] || usage
if [[ "$FLAG" != "--check" ]]; then
  [[ -f "$PROMPT_FILE" ]] || { echo "no such prompt-file: $PROMPT_FILE" >&2; exit 64; }
fi
[[ -d "$WORKDIR" ]] || { echo "no such workdir: $WORKDIR" >&2; exit 64; }

# Credentials without deps (OPENROUTER_* only; shell variables always win). Host-specific config
# files live outside the replaceable plugin cache. SQUAD_ENV_FILE is the neutral explicit override;
# the repo's .env remains the clone-and-run-by-hand fallback.
ENV_FILES=("${SQUAD_ENV_FILE:-}" "$HOME/.claude/squad.env" "$ROOT_DIR/.env")
for ENV_FILE in "${ENV_FILES[@]}"; do
  [[ -n "$ENV_FILE" && -f "$ENV_FILE" ]] || continue
  # `|| [[ -n "$line" ]]`: without it the LAST line is lost when the file does not end in a
  # newline — `read` leaves it in $line but returns 1, so the while exits before the body. Happened
  # with the real key (2026-08-08): a hand-edited .env had no trailing newline and the script
  # reported "no key" while holding one.
  while IFS= read -r line || [[ -n "$line" ]]; do
    if [[ "$line" =~ ^[[:space:]]*(OPENROUTER_[A-Z_]+)[[:space:]]*=[[:space:]]*(.*)$ ]]; then
      k="${BASH_REMATCH[1]}"; v="${BASH_REMATCH[2]%\"}"; v="${v#\"}"
      [[ -z "${!k:-}" ]] && export "$k=$v"
    fi
  done < "$ENV_FILE"
done
if [[ -z "${OPENROUTER_API_KEY:-}" ]]; then
  echo "OPENROUTER_API_KEY is not set (shell, SQUAD_ENV_FILE, or ~/.claude/squad.env) — use the Claude Agent fallback" >&2
  exit 78
fi
MODEL="${OPENROUTER_MODEL:-openai/gpt-5.6-sol}"

if [[ "$FLAG" == "--check" ]]; then
  # A real request is the ONLY proof the key can infer: asking /api/v1/key is not enough (a
  # provisioning key answers 200 there and 401 here).
  # `max_tokens` = 32000 ON PURPOSE: it is the ceiling the CLI asks for on an agent turn, and
  # OpenRouter bills REAL tokens, so asking for it costs nothing. With `max_tokens: 1` this check
  # returned OK on an account with no credit and the run only found out halfway (2026-08-08).
  code="$(curl -s -o /tmp/agent-or-check.$$ -w '%{http_code}' \
    -X POST "https://openrouter.ai/api/v1/chat/completions" \
    -H "Authorization: Bearer $OPENROUTER_API_KEY" -H "Content-Type: application/json" \
    -d "{\"model\":\"$MODEL\",\"max_tokens\":32000,\"messages\":[{\"role\":\"user\",\"content\":\"ok\"}]}" || echo 000)"
  body="$(cat /tmp/agent-or-check.$$ 2>/dev/null || true)"; rm -f "/tmp/agent-or-check.$$"
  if [[ "$code" == "200" ]]; then
    echo "OK · $MODEL answers with this key and there is credit for an agent turn"; exit 0
  fi
  echo "this key CANNOT run an agent (HTTP $code): ${body:0:220}" >&2
  case "$code" in
    401) echo "→ Is it a PROVISIONING key? Those administer keys, do not infer, and start the same." >&2
         echo "→ Create a normal API key at https://openrouter.ai/settings/keys (Create Key button)." >&2 ;;
    402) echo "→ The account has no credit for an agent turn (32k token ceiling)." >&2
         echo "→ Add credit at https://openrouter.ai/settings/credits — the free tier is not enough." >&2 ;;
  esac
  exit 78
fi

# The agent's system prompt: the body of agents/<name>.md without the frontmatter (the same rules
# it would get via the Agent tool — TDD, gate, commit by explicit paths, no image re-reads).
AGENT_MD="$ROOT_DIR/agents/$AGENT.md"
[[ -f "$AGENT_MD" ]] || { echo "no such file: $AGENT_MD" >&2; exit 66; }
SYSTEM="$(awk 'BEGIN{fm=0} NR==1&&/^---$/{fm=1;next} fm==1&&/^---$/{fm=2;next} fm!=1{print}' "$AGENT_MD")"

# Tools: the frontmatter ones minus MCP (a headless process does not have the lead session's MCP
# servers; squad.md already degrades the code graph to optional).
if [[ "$AGENT" == "developer" ]]; then
  TOOLS="Read Write Edit Bash Grep Glob Skill"
else
  TOOLS="Read Grep Glob Bash Skill"
fi

if [[ "$FLAG" == "--dry-run" ]]; then
  echo "cd $WORKDIR && env -u ANTHROPIC_API_KEY ANTHROPIC_BASE_URL=https://openrouter.ai/api \\"
  echo "  ANTHROPIC_AUTH_TOKEN=*** ANTHROPIC_MODEL=$MODEL ANTHROPIC_SMALL_FAST_MODEL=$MODEL \\"
  echo "  claude -p <prompt:$(wc -c < "$PROMPT_FILE") bytes> --permission-mode acceptEdits \\"
  echo "  --allowedTools $TOOLS --append-system-prompt <agents/$AGENT.md without frontmatter: $(printf %s "$SYSTEM" | wc -c) bytes>"
  exit 0
fi

cd "$WORKDIR"
# ANTHROPIC_API_KEY is UNSET (`env -u`), not emptied: if an Anthropic key stays in the env the CLI
# would prefer it and the OpenRouter skin would reject it — but emptying it is worse than removing
# it. With `ANTHROPIC_API_KEY=""` the CLI still takes the api-key path and sends an empty header,
# and OpenRouter answers `401 Missing Authentication header` (both agents of RUN-20260808-01 died
# this way, 2026-08-08 — with a good key and the endpoint answering 200 to a curl). SMALL_FAST
# points at the same model: an invented auxiliary id OpenRouter does not have would break the CLI's
# background requests.
# ANTHROPIC_CUSTOM_HEADERS is what ACTUALLY authenticates here. On a machine with a subscription
# login (`oauthAccount` in ~/.claude.json) the CLI ignores ANTHROPIC_AUTH_TOKEN and goes out with no
# auth header at all → OpenRouter answers `401 Missing Authentication header`. Forcing the header is
# the only variant that reached the API (tested 2026-08-08: without it 401; with it, request
# accepted). AUTH_TOKEN is left in place: it is the documented path on machines without OAuth.
env -u ANTHROPIC_API_KEY \
    ANTHROPIC_BASE_URL="https://openrouter.ai/api" \
    ANTHROPIC_AUTH_TOKEN="$OPENROUTER_API_KEY" \
    ANTHROPIC_CUSTOM_HEADERS="Authorization: Bearer $OPENROUTER_API_KEY" \
    ANTHROPIC_MODEL="$MODEL" \
    ANTHROPIC_SMALL_FAST_MODEL="$MODEL" \
  claude -p "$(cat "$PROMPT_FILE")" \
    --permission-mode acceptEdits \
    --allowedTools $TOOLS \
    --append-system-prompt "$SYSTEM"
