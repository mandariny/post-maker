#!/usr/bin/env bash
set -euo pipefail

MAX_RETRIES="${MAX_RETRIES:-1}"
ARTIFACT_DIR="${ARTIFACT_DIR:-artifacts/agent-checks}"
TEST_MARKER="${TEST_MARKER:-.agent-test-passed}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./logging.sh
. "$SCRIPT_DIR/logging.sh"
trap 'status=$?; agent_log "FAIL" "dev-tests" "fail" "unexpected exit at line $LINENO with status $status"; exit $status' ERR

run_project_tests() {
  if [ -n "${TEST_COMMAND:-}" ]; then
    agent_stage "dev-tests" "START" "running TEST_COMMAND"
    agent_log "INFO" "dev-tests" "command" "$TEST_COMMAND"
    bash -lc "$TEST_COMMAND"
    return
  fi

  if [ -f package.json ]; then
    if command -v npm >/dev/null 2>&1; then
      agent_stage "dev-tests" "START" "running npm test"
      agent_log "INFO" "dev-tests" "command" "npm test"
      npm test
      return
    fi
  fi

  agent_stage "dev-tests" "FAIL" "no test command detected"
  agent_log "FAIL" "dev-tests" "fail" "no TEST_COMMAND provided and no default test command detected"
  return 1
}

run_cdp_checks() {
  if [ -z "${CDP_URL:-}" ] || [ -z "${DEV_URL:-}" ]; then
    agent_stage "dev-tests" "SKIP" "CDP checks disabled"
    agent_log "WARN" "dev-tests" "skip" "set CDP_URL and DEV_URL to enable browser verification"
    return
  fi

  mkdir -p "$ARTIFACT_DIR"
  agent_stage "dev-tests" "START" "running CDP browser verification"
  agent_log "INFO" "dev-tests" "check" "running CDP checks against $DEV_URL via $CDP_URL"

  node - "$CDP_URL" "$DEV_URL" "$ARTIFACT_DIR" <<'NODE'
const [cdpUrl, devUrl, artifactDir] = process.argv.slice(2);
const fs = require('fs');
const path = require('path');

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

async function cdpFetch(endpoint, init) {
  const url = `${cdpUrl.replace(/\/$/, '')}${endpoint}`;
  const response = await fetch(url, init);
  if (!response.ok) {
    fail(`${url} returned ${response.status}`);
  }
  return response;
}

async function main() {
  await cdpFetch('/json/version');

  const encodedTarget = encodeURIComponent(devUrl);
  await cdpFetch(`/json/new?${encodedTarget}`, { method: 'PUT' }).catch(async () => {
    await cdpFetch(`/json/new?${encodedTarget}`);
  });

  const tabs = await (await cdpFetch('/json/list')).json();
  const tab = tabs.find((item) => item.url === devUrl) || tabs[0];
  if (!tab) fail('Chrome has no inspectable tabs');
  if (!tab.webSocketDebuggerUrl) {
    fail('target does not expose webSocketDebuggerUrl for DOM/screenshot inspection');
  }

  if (typeof WebSocket === 'undefined') {
    fail('Node.js WebSocket global is unavailable; use Node 22+ or provide a CDP-capable runtime');
  }

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  let nextId = 1;
  const pending = new Map();

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(JSON.stringify(message.error)));
      else resolve(message.result || {});
    }
  };

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('CDP websocket connect timeout')), 10000);
    ws.onopen = () => {
      clearTimeout(timeout);
      resolve();
    };
    ws.onerror = () => reject(new Error('CDP websocket connection failed'));
  });

  function send(method, params = {}) {
    const id = nextId++;
    const payload = JSON.stringify({ id, method, params });
    const promise = new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    ws.send(payload);
    return promise;
  }

  await send('Page.enable');
  await send('DOM.enable');
  await send('Page.navigate', { url: devUrl });
  await new Promise((resolve) => setTimeout(resolve, Number(process.env.CDP_NAVIGATION_WAIT_MS || 3000)));

  const domResult = await send('Runtime.evaluate', {
    expression: 'document.documentElement.outerHTML',
    returnByValue: true
  });
  const screenshotResult = await send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true
  });

  const snapshot = {
    checkedAt: new Date().toISOString(),
    targetUrl: devUrl,
    tabTitle: tab.title || '',
    tabUrl: tab.url || '',
    websocketDebuggerUrlPresent: true,
    domBytes: Buffer.byteLength(domResult.result?.value || '', 'utf8'),
    screenshotBytes: Buffer.byteLength(screenshotResult.data || '', 'base64')
  };

  fs.writeFileSync(path.join(artifactDir, 'cdp-dom-snapshot.json'), JSON.stringify(snapshot, null, 2));
  fs.writeFileSync(path.join(artifactDir, 'cdp-dom-snapshot.html'), domResult.result?.value || '');
  fs.writeFileSync(path.join(artifactDir, 'cdp-screenshot.png'), Buffer.from(screenshotResult.data || '', 'base64'));
  ws.close();

  if (snapshot.domBytes <= 0) {
    fail('DOM snapshot is empty');
  }

  if (snapshot.screenshotBytes <= 0) {
    fail('screenshot is empty');
  }

  console.log(`PASS: CDP navigation, DOM snapshot, and screenshot completed: ${snapshot.tabUrl}`);
}

main().catch((error) => fail(error && error.stack ? error.stack : String(error)));
NODE
  agent_stage "dev-tests" "PASS" "CDP artifacts written"
  agent_log "PASS" "dev-tests" "artifact" "wrote $ARTIFACT_DIR/cdp-dom-snapshot.json"
  agent_log "PASS" "dev-tests" "artifact" "wrote $ARTIFACT_DIR/cdp-dom-snapshot.html"
  agent_log "PASS" "dev-tests" "artifact" "wrote $ARTIFACT_DIR/cdp-screenshot.png"
}

run_all_checks() {
  agent_stage "dev-tests" "START" "running development verification"
  agent_log "INFO" "dev-tests" "start" "running development verification"
  run_project_tests
  run_cdp_checks
  date -u +"%Y-%m-%dT%H:%M:%SZ" > "$TEST_MARKER"
  agent_stage "dev-tests" "PASS" "tests completed"
  agent_log "PASS" "dev-tests" "artifact" "wrote $TEST_MARKER"
  agent_log "PASS" "dev-tests" "pass" "tests completed"
}

attempt=0
until run_all_checks; do
  rm -f "$TEST_MARKER"

  if [ "$attempt" -ge "$MAX_RETRIES" ] || [ -z "${FIX_COMMAND:-}" ]; then
    exit 1
  fi

  attempt=$((attempt + 1))
  agent_stage "dev-tests" "RETRY" "running FIX_COMMAND ($attempt/$MAX_RETRIES)"
  agent_log "WARN" "dev-tests" "retry" "retry $attempt/$MAX_RETRIES: running FIX_COMMAND"
  agent_log "INFO" "dev-tests" "command" "$FIX_COMMAND"
  bash -lc "$FIX_COMMAND"
done
