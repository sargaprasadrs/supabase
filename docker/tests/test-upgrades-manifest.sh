#!/bin/sh
#
# Validate the upgrade manifest (upgrades.json), which update.sh reads with jq.
#
#   - json:    upgrades.json is valid JSON
#   - keys:    top-level keys are bare-semver versions (e.g. "0.7.0"), plus the
#              optional "_schema" documentation block
#   - schema:  each version-keyed entry has valid field types
#   - gate:    any non-null "gate" points at a script that exists in the repo
#
# The manifest is the source of truth for gating; the CHANGELOG is display only,
# so this test deliberately does NOT cross-check the two. Requires jq (already a
# runtime dependency of update.sh); no yq, no generation step.
#
# Usage:
#   sh tests/test-upgrades-manifest.sh      # run from the docker/ directory
#
set -eu

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
DOCKER_DIR=$(dirname "$SCRIPT_DIR")
cd "$DOCKER_DIR"

JSON=upgrades.json

command -v jq >/dev/null 2>&1 || { echo "ERROR: jq is required"; exit 1; }
[ -f "$JSON" ] || { echo "ERROR: $JSON missing"; exit 1; }

PASS=0; FAIL=0
ok()  { PASS=$((PASS+1)); printf "  ok   - %s\n" "$1"; }
bad() { FAIL=$((FAIL+1)); printf "  FAIL - %s\n" "$1"; }

echo ""
echo "=== upgrades.json is valid JSON ==="
if jq -e . "$JSON" >/dev/null 2>"$SCRIPT_DIR/.err"; then
    ok "upgrades.json parses"
else
    bad "upgrades.json is not valid JSON: $(cat "$SCRIPT_DIR/.err" 2>/dev/null)"
    rm -f "$SCRIPT_DIR/.err"
    echo "=== Result: $PASS passed, $FAIL failed ==="; exit 1
fi
rm -f "$SCRIPT_DIR/.err"

echo ""
echo "=== top-level keys are versions (or _schema) ==="
for k in $(jq -r 'keys[]' "$JSON"); do
    case "$k" in
        _schema)       ok "doc block '_schema' present" ;;
        [0-9]*.[0-9]*) ok "version key $k" ;;
        *)             bad "unexpected top-level key '$k' (want bare semver like 0.7.0)" ;;
    esac
done

echo ""
echo "=== version-keyed entries have valid field types ==="
for k in $(jq -r 'keys[]' "$JSON"); do
    case "$k" in [0-9]*.[0-9]*) ;; *) continue ;; esac
    errs=$(jq -r --arg k "$k" '.[$k] |
        [ (if (.breaking != null) and ((.breaking|type) != "boolean") then "breaking must be bool" else empty end),
          (if (.gate != null) and ((.gate|type) != "string") then "gate must be string|null" else empty end),
          (if (.migration_guide_url != null) and ((.migration_guide_url|type) != "string") then "migration_guide_url must be string|null" else empty end),
          (if (.requires != null) and ((.requires|type) != "array") then "requires must be array" else empty end)
        ] | join("; ")' "$JSON")
    if [ -z "$errs" ]; then ok "entry $k valid"; else bad "entry $k: $errs"; fi
done

echo ""
echo "=== gate scripts referenced by entries exist ==="
checked=0
for k in $(jq -r 'keys[]' "$JSON"); do
    case "$k" in [0-9]*.[0-9]*) ;; *) continue ;; esac
    gate=$(jq -r --arg k "$k" '.[$k].gate // empty' "$JSON")
    [ -n "$gate" ] || continue
    checked=$((checked+1))
    if [ -f "$gate" ]; then
        ok "gate for $k exists: $gate"
    else
        bad "gate for $k missing: $gate"
    fi
done
[ "$checked" = 0 ] && echo "  (no entries reference a gate script)"

echo ""
echo "=== Result: $PASS passed, $FAIL failed ==="
[ "$FAIL" = 0 ] || exit 1
