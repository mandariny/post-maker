#!/usr/bin/env bash

agent_log_dir="${AGENT_LOG_DIR:-logs/agent-checks}"
mkdir -p "$agent_log_dir"
agent_log_file="$agent_log_dir/$(date -u +%Y%m%d).log"

agent_log() {
  level="$1"
  step="$2"
  event="$3"
  message="$4"
  timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  clean_message="$(printf '%s' "$message" | tr '\r\n' '  ')"
  printf '%s | %s | %s | %s | %s\n' "$timestamp" "$level" "$step" "$event" "$clean_message" | tee -a "$agent_log_file"
}

agent_stage() {
  step="$1"
  status="$2"
  message="$3"
  clean_message="$(printf '%s' "$message" | tr '\r\n' '  ')"
  printf '==> [%s] %s: %s\n' "$step" "$status" "$clean_message"
}
