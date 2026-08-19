#!/usr/bin/env bash
# Check for worktree.sh against a throwaway repo. Touches no real repo.
#   bash scripts/worktree-selftest.sh
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
WT="$HERE/worktree.sh"
TMP=$(mktemp -d)
export SQUAD_WORKTREES="$TMP/worktrees"
REPO="$TMP/repo"
trap 'rm -rf "$TMP"' EXIT

ok=0
fail=0
check() { # check "<what>" <cond...>
  local what=$1
  shift
  if "$@"; then
    echo "  ok   $what"
    ok=$((ok + 1))
  else
    echo "  FAIL $what"
    fail=$((fail + 1))
  fi
}
fails() { # the command MUST fail
  local what=$1
  shift
  if "$@" >/dev/null 2>&1; then
    echo "  FAIL $what (did not fail but should have)"
    fail=$((fail + 1))
  else
    echo "  ok   $what"
    ok=$((ok + 1))
  fi
}

# base repo on 'master' on purpose: not every repo uses 'main'.
mkdir -p "$REPO"
git -C "$REPO" init -q -b master
git -C "$REPO" config user.email t@t.t
git -C "$REPO" config user.name t
echo "node_modules/" >"$REPO/.gitignore"
echo ".env" >>"$REPO/.gitignore"
echo "v1" >"$REPO/app.txt"
echo "EXAMPLE=1" >"$REPO/.env.example" # tracked: bootstrap must NOT overwrite it
mkdir -p "$REPO/node_modules" "$REPO/sub/node_modules"
echo "dep" >"$REPO/node_modules/marker"
echo "SECRETO=1" >"$REPO/.env"
git -C "$REPO" add -A
git -C "$REPO" commit -qm init

echo "== new"
P=$("$WT" new "$REPO" RUN-1 2>/dev/null)
check "worktree created" test -d "$P"
check "branch squad/RUN-1 off master" test "$(git -C "$P" symbolic-ref --short HEAD)" = "squad/RUN-1"
check "root node_modules symlinked" test -L "$P/node_modules"
check "subproject node_modules symlinked" test -L "$P/sub/node_modules"
check "the symlink resolves to the main repo one" test -f "$P/node_modules/marker"
check ".env symlinked" test -L "$P/.env"
check "tracked .env.example NOT overwritten" test ! -L "$P/.env.example"
# What matters: bootstrap touches NOTHING tracked. The symlinks may show up as untracked (a
# .gitignore with `node_modules/` —trailing slash— matches directories, not symlinks); that is
# cosmetic noise and never lands in a commit because the developer commits by explicit path.
check "no tracked file modified" test -z "$(git -C "$P" status --porcelain | grep -v '^??' || true)"

echo "== cap serial"
fails "a second run does not start" "$WT" new "$REPO" RUN-2
check "list shows the active one" bash -c "'$WT' list '$REPO' | grep -q squad/RUN-1"

echo "== fast-forward merge"
echo "v2" >"$P/app.txt"
git -C "$P" commit -qam "run change"
"$WT" merge "$REPO" RUN-1 master >/dev/null
check "master advanced to the run commit" test "$(git -C "$REPO" log -1 --pretty=%s)" = "run change"
check "the file reached master" test "$(cat "$REPO/app.txt")" = "v2"

echo "== review (what makes the dev‖qa pipeline possible)"
C1=$(git -C "$P" rev-parse HEAD)
C0=$(git -C "$P" rev-parse HEAD~1)
R=$("$WT" review "$REPO" RUN-1 "$C1" 2>/dev/null)
check "review worktree created" test -d "$R"
check "frozen at the requested commit" test "$(git -C "$R" rev-parse HEAD)" = "$C1"
check "detached: no squad/* branch" bash -c "! git -C '$R' symbolic-ref -q HEAD >/dev/null"
check "bootstrapped: the gate can run there" test -f "$R/node_modules/marker"
# The key property: review does NOT consume the cap, otherwise it would block the very run it reviews.
ACT=$("$WT" list "$REPO" | sed -n '/active squad run/,$p' | tail -n +2)
check "review does not show up as an active run" test "$(printf '%s' "$ACT" | grep -c .)" = "1"
fails "and the cap still refuses a new run" "$WT" new "$REPO" RUN-2
# Its reason to exist: the developer keeps editing while @qa sees a tree that does not move.
echo "v3" >"$P/app.txt"
check "what the developer edits does not contaminate the review" test "$(cat "$R/app.txt")" = "v2"
R2=$("$WT" review "$REPO" RUN-1 "$C0" 2>/dev/null)
check "the next verdict reuses the same path" test "$R2" = "$R"
check "and moves the tree to the new commit" test "$(cat "$R/app.txt")" = "v1"
# The reuse `git clean` sweeps leftovers from the previous verdict; if it takes the symlinks with
# it, the SECOND verdict's gate blows up for no visible reason.
check "reuse does not take node_modules with it" test -f "$R/node_modules/marker"
check "reuse does not take .env with it" test -L "$R/.env"

echo "== clean"
"$WT" clean "$REPO" RUN-1 >/dev/null
check "clean also removes the review one" test ! -d "$R"
check "worktree removed" test ! -d "$P"
fails "branch removed" git -C "$REPO" rev-parse --verify squad/RUN-1
P3=$("$WT" new "$REPO" RUN-3 2>/dev/null)
check "cap released: a new run gets in" test -d "$P3"

echo "== non-ff merge (base moved) must fail, not merge"
echo "v3" >"$P3/app.txt"
git -C "$P3" commit -qam "run 3 change"
echo "something else" >"$REPO/parallel.txt"
git -C "$REPO" add parallel.txt
git -C "$REPO" commit -qm "hand commit on master"
fails "non-ff merge rejected" "$WT" merge "$REPO" RUN-3 master
check "master untouched after the rejection" test "$(git -C "$REPO" log -1 --pretty=%s)" = "hand commit on master"

echo "== clean without merging protects the work"
fails "clean without --force rejected" "$WT" clean "$REPO" RUN-3
check "the worktree is still alive" test -d "$P3"
"$WT" clean "$REPO" RUN-3 --force >/dev/null
check "--force does remove it" test ! -d "$P3"

echo
echo "ok: $ok · fail: $fail"
[ "$fail" -eq 0 ]
