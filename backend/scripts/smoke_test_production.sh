#!/usr/bin/env bash
# Production smoke test for Phase 08.
#
# Verifies three behaviors against a live Railway deployment:
#   1. ML-01, ML-03: /health returns content_model_loaded and collaborative_model_loaded
#   2. DEPLOY-02:    CORS preflight from the production origin succeeds
#   3. ML-02:        /api/recommendations/ returns 200 with recommendations[] + strategy
#
# Usage:
#   RAILWAY_URL=https://your-backend.up.railway.app \
#   FRONTEND_ORIGIN=https://movierecsinc.com \
#   JWT=<supabase access token> \
#   ./backend/scripts/smoke_test_production.sh
#
# JWT is optional -- Test 3 is skipped if not provided.

set -u

: "${RAILWAY_URL:?RAILWAY_URL must be set, e.g. https://your-backend.up.railway.app}"
: "${FRONTEND_ORIGIN:=https://movierecsinc.com}"

PASS=0
FAIL=0

check() {
  local name="$1"; local ok="$2"; local detail="$3"
  if [ "$ok" = "1" ]; then
    echo "PASS: $name"
    PASS=$((PASS + 1))
  else
    echo "FAIL: $name -- $detail"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== Phase 08 Production Smoke Test ==="
echo "Railway:  $RAILWAY_URL"
echo "Frontend: $FRONTEND_ORIGIN"
echo

# -------- Test 1: /health reports model load state (ML-01, ML-03) --------
echo "[1/3] GET $RAILWAY_URL/health"
HEALTH_BODY=$(curl -sS --max-time 10 "$RAILWAY_URL/health" || echo "")
echo "  body: $HEALTH_BODY"
echo "$HEALTH_BODY" | grep -q '"status"[[:space:]]*:[[:space:]]*"ok"' && S1=1 || S1=0
echo "$HEALTH_BODY" | grep -q '"content_model_loaded"[[:space:]]*:[[:space:]]*true' && S2=1 || S2=0
echo "$HEALTH_BODY" | grep -q '"collaborative_model_loaded"' && S3=1 || S3=0
check "health.status=ok"                "$S1" "$HEALTH_BODY"
check "health.content_model_loaded=true" "$S2" "expected true (ML-03: .pkl files loaded)"
check "health.collaborative_model_loaded present" "$S3" "expected key in response"

# -------- Test 2: CORS preflight (DEPLOY-02) --------
echo
echo "[2/3] OPTIONS $RAILWAY_URL/api/recommendations/ from $FRONTEND_ORIGIN"
CORS_HEADERS=$(curl -sS -I -X OPTIONS --max-time 10 \
  -H "Origin: $FRONTEND_ORIGIN" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Authorization,Content-Type" \
  "$RAILWAY_URL/api/recommendations/" || echo "")
echo "$CORS_HEADERS" | sed 's/^/  /'
echo "$CORS_HEADERS" | grep -i "access-control-allow-origin:[[:space:]]*$FRONTEND_ORIGIN" >/dev/null && C1=1 || C1=0
echo "$CORS_HEADERS" | grep -i "access-control-allow-credentials:[[:space:]]*true"         >/dev/null && C2=1 || C2=0
check "cors.allow-origin=$FRONTEND_ORIGIN" "$C1" "FRONTEND_URL on Railway may be wrong"
check "cors.allow-credentials=true"        "$C2" "required for cookie-based auth"

# -------- Test 3: /api/recommendations/ live call (ML-02) --------
echo
if [ -z "${JWT:-}" ]; then
  echo "[3/3] SKIPPED: set JWT=<supabase access token> to run this test"
else
  echo "[3/3] GET $RAILWAY_URL/api/recommendations/?top_n=3"
  REC_STATUS=$(curl -sS -o /tmp/rec_body.json -w "%{http_code}" --max-time 15 \
    -H "Authorization: Bearer $JWT" \
    "$RAILWAY_URL/api/recommendations/?top_n=3" || echo "000")
  REC_BODY=$(cat /tmp/rec_body.json 2>/dev/null || echo "")
  echo "  status: $REC_STATUS"
  echo "  body:   $REC_BODY" | head -c 500; echo
  [ "$REC_STATUS" = "200" ] && R1=1 || R1=0
  echo "$REC_BODY" | grep -q '"recommendations"' && R2=1 || R2=0
  echo "$REC_BODY" | grep -q '"strategy"'        && R3=1 || R3=0
  check "recommendations.http=200" "$R1" "got $REC_STATUS"
  check "recommendations.has recommendations[]" "$R2" "key missing"
  check "recommendations.has strategy"          "$R3" "key missing"
fi

echo
echo "=== Summary: $PASS passed, $FAIL failed ==="
[ "$FAIL" = "0" ] && exit 0 || exit 1
