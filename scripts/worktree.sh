#!/usr/bin/env bash
# Serial worktree for the squad loop: one run = one worktree = one squad/<run-id> branch.
# The loop is SERIAL on purpose (cap 1): the next worktree starts from an already-merged base
# branch, so there are no conflicts and no work lost between runs.
#
#   worktree.sh new    <repo> <run-id>            create + bootstrap; prints the path on stdout
#   worktree.sh review <repo> <run-id> <commit>   throwaway worktree FROZEN at <commit>, for @qa
#   worktree.sh list   <repo>                     what is active
#   worktree.sh merge  <repo> <run-id> [base]     --ff-only into the base branch
#   worktree.sh clean  <repo> <run-id> [--force]  removes worktree + branch + the review one
set -euo pipefail

ROOT="${SQUAD_WORKTREES:-$HOME/.squad-worktrees}"
CAP=1 # ponytail: serial on purpose. Raise to 2 the day parallel runs are actually a thing.

die() {
  echo "worktree.sh: $*" >&2
  exit 1
}

repo_ok() { git -C "$1" rev-parse --git-dir >/dev/null 2>&1 || die "not a git repo: $1"; }

wt_path() { echo "$ROOT/$(basename "$1")/$2"; }

# worktrees whose branch is squad/* → "<path>\t<branch>" per line
squad_worktrees() {
  git -C "$1" worktree list --porcelain | awk '
    /^worktree /{wt=$2}
    /^branch refs\/heads\/squad\//{sub("refs/heads/","",$2); print wt"\t"$2}'
}

# node_modules, .env* and graphify-out (the optional knowledge graph) are not tracked: a fresh
# worktree does not have them and the gate blows up on the first `npx tsc`. They are symlinked to
# the main repo — 0 bytes, same directory, nothing duplicated. A file the checkout already brought (e.g. a tracked .env.example) is never
# overwritten: that would dirty the worktree and @qa would read it as scope overflow.
# A .gitignore with `node_modules/` (trailing slash) matches directories, not symlinks, so the link
# may show up as untracked. Cosmetic: it never lands in a commit because @developer commits by
# explicit path, never with `git add -A`.
bootstrap() {
  local repo=$1 wt=$2 src rel
  for src in "$repo"/node_modules "$repo"/*/node_modules "$repo"/graphify-out; do
    [ -d "$src" ] || continue
    rel=${src#"$repo"/}
    [ -e "$wt/$rel" ] && continue
    mkdir -p "$wt/$(dirname "$rel")"
    ln -sfn "$src" "$wt/$rel"
    echo "  link $rel" >&2
  done
  for src in "$repo"/.env "$repo"/.env.*; do
    [ -f "$src" ] || continue
    rel=$(basename "$src")
    [ -e "$wt/$rel" ] && continue
    ln -sfn "$src" "$wt/$rel"
    echo "  link $rel" >&2
  done
}

cmd_new() {
  local repo=$1 run=$2 active n=0 base path
  repo_ok "$repo"
  active=$(squad_worktrees "$repo")
  [ -n "$active" ] && n=$(printf '%s\n' "$active" | wc -l | tr -d ' ')
  if [ "$n" -ge "$CAP" ]; then
    echo "$n squad worktree(s) already active — the loop is serial:" >&2
    printf '%s\n' "$active" >&2
    die "resume that run (/squad:run resume) or close it (worktree.sh merge + clean)"
  fi
  base=$(git -C "$repo" symbolic-ref --short HEAD 2>/dev/null) ||
    die "the repo is in detached HEAD — check out the base branch first"
  path=$(wt_path "$repo" "$run")
  [ -e "$path" ] && die "already exists: $path"
  mkdir -p "$(dirname "$path")"
  git -C "$repo" worktree add "$path" -b "squad/$run" "$base" >&2
  bootstrap "$repo" "$path"
  # The worktree is built from the base branch (what is committed), so a dirty main repo does not
  # affect it. It only matters at merge time: git refuses the ff if it would clobber local changes.
  if [ -n "$(git -C "$repo" status --porcelain)" ]; then
    echo "warning: $repo has uncommitted changes — harmless for the worktree, but they can block the merge" >&2
  fi
  echo "base: $base" >&2
  echo "$path" # stdout = the path only, so it can be captured
}

# REVIEW worktree: detached at the commit under judgement, so @qa runs the gate against a frozen
# tree while @developer keeps editing the run's own worktree (the loop's dev‖qa pipeline).
# Detached on purpose: with no `squad/*` branch the CAP does not count it, so it never blocks a run.
# It is throwaway — recreated on every verdict and removed by `clean`.
cmd_review() {
  local repo=$1 run=$2 commit=$3 path
  repo_ok "$repo"
  git -C "$repo" rev-parse --verify "$commit^{commit}" >/dev/null 2>&1 || die "no such commit: $commit"
  path=$(wt_path "$repo" "$run-review")
  if [ -d "$path" ]; then
    # Reuse: the bootstrap (node_modules symlinks) is already done, moving HEAD costs nothing.
    git -C "$path" checkout --detach --force "$commit" >&2 ||
      die "could not move the review worktree to $commit"
    git -C "$path" clean -qfd -e node_modules -e '.env*' -e graphify-out >&2 # leftovers from the previous verdict
  else
    mkdir -p "$(dirname "$path")"
    git -C "$repo" worktree add --detach "$path" "$commit" >&2
    bootstrap "$repo" "$path"
  fi
  echo "$path" # stdout = the path only, so it can be captured
}

cmd_list() {
  local repo=$1 active
  repo_ok "$repo"
  echo "== worktrees of $repo"
  git -C "$repo" worktree list
  active=$(squad_worktrees "$repo")
  if [ -n "$active" ]; then
    echo "== active squad run:"
    printf '%s\n' "$active"
  else
    echo "== squad: none active"
  fi
}

cmd_merge() {
  local repo=$1 run=$2 base=${3:-} br cur
  repo_ok "$repo"
  br="squad/$run"
  git -C "$repo" rev-parse --verify "$br" >/dev/null 2>&1 || die "no such branch $br"
  cur=$(git -C "$repo" symbolic-ref --short HEAD 2>/dev/null) || die "the repo is in detached HEAD"
  [ -n "$base" ] || base=$cur
  [ "$cur" = "$base" ] || die "the repo is on '$cur', not on the base '$base' — check it out first"
  git -C "$repo" merge --ff-only "$br" || die "not a fast-forward: '$base' moved, or local changes would be clobbered.
  Fix: in the worktree → git rebase $base → RE-RUN the gate → worktree.sh merge again.
  Never merge without ff: it would put code the gate never verified into $base."
  echo "merge ok: $br → $base"
}

cmd_clean() {
  local repo=$1 run=$2 force=${3:-} br path rev
  repo_ok "$repo"
  br="squad/$run"
  path=$(wt_path "$repo" "$run")
  if [ "$force" != "--force" ] && git -C "$repo" rev-parse --verify "$br" >/dev/null 2>&1; then
    git -C "$repo" merge-base --is-ancestor "$br" HEAD 2>/dev/null ||
      die "$br is not merged into $(git -C "$repo" symbolic-ref --short HEAD) — merge it, or pass --force to discard that work"
  fi
  if [ -d "$path" ]; then
    git -C "$repo" worktree remove --force "$path"
  fi
  # The review one is throwaway and has no branch: it always goes, with no merge check.
  # `if`, not `[ -d ] && …`: with `set -e` an AND-list failing on the left aborts the function.
  rev=$(wt_path "$repo" "$run-review")
  if [ -d "$rev" ]; then
    git -C "$repo" worktree remove --force "$rev"
  fi
  git -C "$repo" worktree prune
  git -C "$repo" branch -D "$br" >/dev/null 2>&1 || true
  echo "clean: $br"
}

[ $# -ge 2 ] || die "usage: worktree.sh new|review|list|merge|clean <repo> [run-id] [args]"
case "$1" in
new)
  [ $# -eq 3 ] || die "usage: worktree.sh new <repo> <run-id>"
  cmd_new "$2" "$3"
  ;;
review)
  [ $# -eq 4 ] || die "usage: worktree.sh review <repo> <run-id> <commit>"
  cmd_review "$2" "$3" "$4"
  ;;
list)
  cmd_list "$2"
  ;;
merge)
  [ $# -ge 3 ] || die "usage: worktree.sh merge <repo> <run-id> [base]"
  cmd_merge "$2" "$3" "${4:-}"
  ;;
clean)
  [ $# -ge 3 ] || die "usage: worktree.sh clean <repo> <run-id> [--force]"
  cmd_clean "$2" "$3" "${4:-}"
  ;;
*) die "unknown command: $1 (new|review|list|merge|clean)" ;;
esac
