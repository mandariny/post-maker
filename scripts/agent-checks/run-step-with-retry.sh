#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 '<check-command>' ['repair-command']" >&2
  exit 2
fi

CHECK_COMMAND="$1"
REPAIR_COMMAND="${2:-}"
MAX_RETRIES="${MAX_RETRIES:-1}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./logging.sh
. "$SCRIPT_DIR/logging.sh"
trap 'status=$?; agent_log "FAIL" "retry" "fail" "unexpected exit at line $LINENO with status $status"; exit $status' ERR

attempt=0
agent_stage "retry" "START" "running retry wrapper"
agent_log "INFO" "retry" "start" "running retry wrapper"
until bash -lc "$CHECK_COMMAND"; do
  if [ "$attempt" -ge "$MAX_RETRIES" ] || [ -z "$REPAIR_COMMAND" ]; then
    agent_stage "retry" "FAIL" "check failed and no retries remain"
    agent_log "FAIL" "retry" "fail" "check failed and no retries remain"
    exit 1
  fi

  attempt=$((attempt + 1))
  agent_stage "retry" "RETRY" "running repair command ($attempt/$MAX_RETRIES)"
  agent_log "WARN" "retry" "retry" "retry $attempt/$MAX_RETRIES: running repair command"
  agent_log "INFO" "retry" "command" "$REPAIR_COMMAND"
  bash -lc "$REPAIR_COMMAND"
done
agent_stage "retry" "PASS" "check command completed"
agent_log "PASS" "retry" "pass" "check command completed"
