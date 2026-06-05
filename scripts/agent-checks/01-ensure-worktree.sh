#!/usr/bin/env bash
set -euo pipefail

MAX_RETRIES="${MAX_RETRIES:-1}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./logging.sh
. "$SCRIPT_DIR/logging.sh"
trap 'status=$?; agent_log "FAIL" "worktree" "fail" "unexpected exit at line $LINENO with status $status"; exit $status' ERR

check_worktree() {
  agent_stage "worktree" "START" "checking git worktree constraints"
  agent_log "INFO" "worktree" "start" "checking git worktree constraints"

  git rev-parse --is-inside-work-tree >/dev/null 2>&1 || {
    agent_stage "worktree" "FAIL" "not inside a Git worktree"
    agent_log "FAIL" "worktree" "fail" "not inside a Git worktree"
    return 1
  }

  current_root="$(git rev-parse --show-toplevel)"
  current_branch="$(git branch --show-current)"
  primary_root="$(git worktree list --porcelain | awk 'BEGIN { found=0 } /^worktree / && found == 0 { sub(/^worktree /, ""); print; found=1 }')"

  if [ -z "$primary_root" ]; then
    agent_stage "worktree" "FAIL" "could not detect primary worktree"
    agent_log "FAIL" "worktree" "fail" "could not detect primary worktree"
    return 1
  fi

  if [ "$current_root" = "$primary_root" ]; then
    agent_stage "worktree" "FAIL" "current directory is the primary worktree"
    agent_log "FAIL" "worktree" "fail" "current directory is the primary worktree: $current_root"
    return 1
  fi

  if [ "$current_branch" = "main" ]; then
    agent_stage "worktree" "FAIL" "development must not run directly on main"
    agent_log "FAIL" "worktree" "fail" "development must not run directly on main"
    return 1
  fi

  agent_stage "worktree" "PASS" "non-main worktree verified"
  agent_log "PASS" "worktree" "pass" "development is running in a non-main Git worktree ($current_root on $current_branch)"
}

attempt=0
until check_worktree; do
  if [ "$attempt" -ge "$MAX_RETRIES" ] || [ -z "${WORKTREE_COMMAND:-}" ]; then
    exit 1
  fi

  attempt=$((attempt + 1))
  agent_stage "worktree" "RETRY" "running WORKTREE_COMMAND ($attempt/$MAX_RETRIES)"
  agent_log "WARN" "worktree" "retry" "retry $attempt/$MAX_RETRIES: running WORKTREE_COMMAND"
  agent_log "INFO" "worktree" "command" "$WORKTREE_COMMAND"
  bash -lc "$WORKTREE_COMMAND"
done
