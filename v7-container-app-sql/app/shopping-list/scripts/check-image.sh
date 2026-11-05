#!/usr/bin/env bash
# Image checks for the web container (V7, task T2.9). Needs Docker; run from anywhere:
#
#   app/shopping-list/scripts/check-image.sh            # builds shopping-list-web:check first
#   IMAGE=<acr>.azurecr.io/web:<tag> app/shopping-list/scripts/check-image.sh   # existing image
#
# Checks: runs as non-root "node", serves /healthz on 8080, stops cleanly on SIGTERM within
# 10 s (exit 0 — this is also the T2.3 verification), and reports the image size.
set -euo pipefail

cd "$(dirname "$0")/.."
IMAGE="${IMAGE:-shopping-list-web:check}"
NAME="sla-web-check-$$"
HOST_PORT="${HOST_PORT:-18080}"
failures=0

pass() { echo "PASS  $*"; }
fail() { echo "FAIL  $*"; failures=$((failures + 1)); }
cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT

if [[ "$IMAGE" == "shopping-list-web:check" ]]; then
  echo ">> docker build -t $IMAGE ."
  docker build -q -t "$IMAGE" . >/dev/null
fi

# 1. Non-root user
user="$(docker run --rm --entrypoint id "$IMAGE" -un)"
[[ "$user" == "node" ]] && pass "runs as '$user'" || fail "runs as '$user' (expected node)"

# 2. Starts and serves /healthz on 8080 (no API target: /api answers 503, which is fine here)
docker run -d --name "$NAME" -p "$HOST_PORT:8080" "$IMAGE" >/dev/null
for _ in $(seq 1 30); do
  curl -fs "http://127.0.0.1:$HOST_PORT/healthz" >/dev/null 2>&1 && break
  sleep 1
done
code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$HOST_PORT/healthz" || true)"
[[ "$code" == "200" ]] && pass "/healthz → 200 on 8080" || fail "/healthz → $code"

code="$(curl -s -o /dev/null -w '%{http_code}' -X POST "http://127.0.0.1:$HOST_PORT/api/jobs/create-weekly-list" || true)"
[[ "$code" == "404" ]] && pass "edge block: /api/jobs → 404" || fail "edge block: /api/jobs → $code"

# 3. SIGTERM → clean exit within 10 s (docker stop sends SIGTERM, then SIGKILL after -t)
start=$(date +%s)
docker stop -t 15 "$NAME" >/dev/null
elapsed=$(( $(date +%s) - start ))
exit_code="$(docker inspect -f '{{.State.ExitCode}}' "$NAME")"
if [[ "$exit_code" == "0" && "$elapsed" -lt 10 ]]; then
  pass "SIGTERM → exit 0 in ${elapsed}s"
else
  fail "SIGTERM → exit $exit_code in ${elapsed}s (expected 0 in < 10s)"
fi
docker logs "$NAME" 2>&1 | grep -q '"event":"shutdown","signal":"SIGTERM"' \
  && pass "shutdown logged" || fail "no shutdown log line"

# 4. Size (record it in v7-plan.html §6)
size="$(docker image inspect -f '{{.Size}}' "$IMAGE")"
echo "INFO  image size: $(( size / 1024 / 1024 )) MB"

echo ">> $failures failure(s)"
exit "$failures"
