# Agents

## 필수 작업 지침

1. Git worktree를 만들어 개발한다. Worktree를 만들지 않고 작업을 수행하려고 할 경우 작업에 실패한다.
2. 개발 작업이 끝나면 테스트를 진행한다. Chrome DevTools Protocol을 이용해 실제로 기능들이 동작하는지 테스트한다. DOM 스냅샷, 스크린샷, 탐색 작업을 위한 Skill들을 만들어 테스트에 실패할 경우 버그를 재현 및 수정사항을 검증하여 반영한다.
3. 테스트에 통과한 경우 commit, main branch에 알아서 merge하고 push, Vercel 배포를 진행한다. 필요시 Supabase 배포도 함께 진행한다.

## 단계별 검증 및 재실행 규칙

각 단계가 끝날 때마다 아래 `.sh` 파일을 실행해 지침을 제대로 수행했는지 확인한다. 스크립트가 실패하면 해당 단계의 작업 명령을 다시 실행하고, 검증 스크립트를 재실행한다. 재실행 후에도 실패하면 다음 단계로 넘어가지 않는다.

1. Worktree 검증: `scripts/agent-checks/01-ensure-worktree.sh`
   - 현재 작업 위치가 Git worktree인지 확인한다.
   - 기본 worktree 또는 `main` branch에서 직접 개발 중이면 실패한다.
   - 실패 시 `WORKTREE_COMMAND`가 있으면 해당 명령을 재실행한 뒤 다시 검증한다.

2. 개발 테스트 검증: `scripts/agent-checks/02-run-dev-tests.sh`
   - `TEST_COMMAND`가 있으면 해당 명령을 실행하고, 없으면 사용 가능한 기본 테스트 명령을 탐지해 실행한다.
   - `CDP_URL`과 `DEV_URL`이 있으면 Chrome DevTools Protocol로 탐색, DOM 스냅샷, 스크린샷 검증을 수행한다.
   - 실패 시 `FIX_COMMAND`가 있으면 버그 수정 명령을 실행한 뒤 테스트를 다시 수행한다.

3. 배포 검증: `scripts/agent-checks/03-commit-merge-push-deploy.sh`
   - 테스트 통과 마커가 있는지 확인한다.
   - `main` branch로 merge, push, Vercel 배포를 수행한다.
   - `SUPABASE_DEPLOY_COMMAND`가 있으면 Supabase 배포도 함께 수행한다.
   - 실패 시 `DEPLOY_RETRY_COMMAND`가 있으면 재실행한 뒤 배포 검증을 다시 수행한다.

공통 재실행 래퍼가 필요한 경우 `scripts/agent-checks/run-step-with-retry.sh`를 사용한다.

## 로그 기록 규칙

각 단계별 검증 스크립트는 반드시 로그를 남긴다. 디버깅 시에는 코드, 테스트 출력, 브라우저 결과와 함께 해당 로그를 먼저 확인해 실패 단계, 재시도 횟수, 실행 명령, 산출물 경로를 추적한다.

- 기본 로그 디렉터리: `logs/agent-checks`
- 로그 파일 이름: `YYYYMMDD.log`
- 로그 형식: `timestamp | level | step | event | message`
- `timestamp`: UTC ISO-8601 형식. 예: `2026-06-05T12:34:56Z`
- `level`: `INFO`, `WARN`, `ERROR`, `PASS`, `FAIL` 중 하나
- `step`: `worktree`, `dev-tests`, `deploy`, `retry` 중 하나
- `event`: `start`, `check`, `command`, `retry`, `artifact`, `pass`, `fail`, `skip` 같은 짧은 이벤트 이름
- `message`: 사람이 읽을 수 있는 단일 행 설명. 줄바꿈은 공백으로 치환해 한 이벤트가 한 줄에 남도록 한다.

예시:

```text
2026-06-05T12:34:56Z | INFO | dev-tests | start | running development verification
2026-06-05T12:35:04Z | PASS | dev-tests | artifact | wrote artifacts/agent-checks/cdp-screenshot.png
2026-06-05T12:35:10Z | FAIL | deploy | fail | missing test pass marker: .agent-test-passed
```

로그 위치를 바꿔야 할 경우 `AGENT_LOG_DIR` 환경변수로 지정한다.

## 터미널 단계 표시 규칙

사용자가 현재 진행 단계를 눈으로 확인할 수 있도록 각 단계별 검증 스크립트는 시작, 재시도, 성공, 실패 시 터미널에 단계 배너를 출력한다.

- 배너 형식: `==> [step] status: message`
- `step`: `worktree`, `dev-tests`, `deploy`, `retry` 중 하나
- `status`: `START`, `RETRY`, `PASS`, `FAIL`, `SKIP` 중 하나
- 예시: `==> [dev-tests] START: running development verification`

터미널 배너는 사람이 실시간으로 보는 진행 상태이고, 상세 원인 추적은 `logs/agent-checks/YYYYMMDD.log` 로그를 기준으로 한다.
