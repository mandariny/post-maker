#!/usr/bin/env bash
set -euo pipefail

MAX_RETRIES="${MAX_RETRIES:-1}"
TEST_MARKER="${TEST_MARKER:-.agent-test-passed}"
COMMIT_MESSAGE="${COMMIT_MESSAGE:-agent: complete verified changes}"
REMOTE="${REMOTE:-origin}"
MAIN_BRANCH="${MAIN_BRANCH:-main}"
DEPLOY_COMMAND="${DEPLOY_COMMAND:-npx vercel --prod}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./logging.sh
. "$SCRIPT_DIR/logging.sh"
trap 'status=$?; agent_log "FAIL" "deploy" "fail" "unexpected exit at line $LINENO with status $status"; exit $status' ERR

deploy_once() {
  agent_stage "deploy" "START" "running commit, merge, push, and deployment verification"
  agent_log "INFO" "deploy" "start" "running commit, merge, push, and deployment verification"

  if [ ! -f "$TEST_MARKER" ]; then
    agent_stage "deploy" "FAIL" "missing test pass marker"
    agent_log "FAIL" "deploy" "fail" "missing test pass marker: $TEST_MARKER"
    return 1
  fi

  current_branch="$(git branch --show-current)"
  if [ -z "$current_branch" ]; then
    agent_stage "deploy" "FAIL" "detached HEAD is not supported"
    agent_log "FAIL" "deploy" "fail" "detached HEAD is not supported for auto merge/deploy"
    return 1
  fi

  if [ -n "$(git status --porcelain)" ]; then
    agent_stage "deploy" "START" "committing local changes"
    agent_log "INFO" "deploy" "command" "git add -A"
    git add -A
    agent_log "INFO" "deploy" "command" "git commit -m \"$COMMIT_MESSAGE\""
    git commit -m "$COMMIT_MESSAGE"
  else
    agent_stage "deploy" "SKIP" "no local changes to commit"
    agent_log "INFO" "deploy" "skip" "no local changes to commit"
  fi

  agent_stage "deploy" "START" "merging into $MAIN_BRANCH and pushing"
  agent_log "INFO" "deploy" "command" "git fetch $REMOTE $MAIN_BRANCH"
  git fetch "$REMOTE" "$MAIN_BRANCH"
  agent_log "INFO" "deploy" "command" "git switch $MAIN_BRANCH"
  git switch "$MAIN_BRANCH"
  agent_log "INFO" "deploy" "command" "git pull --ff-only $REMOTE $MAIN_BRANCH"
  git pull --ff-only "$REMOTE" "$MAIN_BRANCH"
  agent_log "INFO" "deploy" "command" "git merge --no-ff $current_branch"
  git merge --no-ff "$current_branch"
  agent_log "INFO" "deploy" "command" "git push $REMOTE $MAIN_BRANCH"
  git push "$REMOTE" "$MAIN_BRANCH"

  agent_stage "deploy" "START" "running Vercel deployment"
  agent_log "INFO" "deploy" "command" "$DEPLOY_COMMAND"
  bash -lc "$DEPLOY_COMMAND"

  if [ -n "${SUPABASE_DEPLOY_COMMAND:-}" ]; then
    agent_stage "deploy" "START" "running Supabase deployment"
    agent_log "INFO" "deploy" "command" "$SUPABASE_DEPLOY_COMMAND"
    bash -lc "$SUPABASE_DEPLOY_COMMAND"
  fi

  agent_stage "deploy" "PASS" "commit, merge, push, and deployment completed"
  agent_log "PASS" "deploy" "pass" "commit, merge, push, and deployment completed"
}

attempt=0
until deploy_once; do
  if [ "$attempt" -ge "$MAX_RETRIES" ] || [ -z "${DEPLOY_RETRY_COMMAND:-}" ]; then
    exit 1
  fi

  attempt=$((attempt + 1))
  agent_stage "deploy" "RETRY" "running DEPLOY_RETRY_COMMAND ($attempt/$MAX_RETRIES)"
  agent_log "WARN" "deploy" "retry" "retry $attempt/$MAX_RETRIES: running DEPLOY_RETRY_COMMAND"
  agent_log "INFO" "deploy" "command" "$DEPLOY_RETRY_COMMAND"
  bash -lc "$DEPLOY_RETRY_COMMAND"
done
