#!/usr/bin/env bash
set -euo pipefail

lcov_file="$1"
baseline_file="${2:-}"
tolerance="${COVERAGE_TOLERANCE:-0.1}"
enforce="${COVERAGE_ENFORCE:-true}"

if [[ ! -f "$lcov_file" ]]; then
  echo "Coverage report not found at $lcov_file" >&2
  exit 1
fi

current="$(awk -F: '
  /^LF:/ { lines_found += $2 }
  /^LH:/ { lines_hit += $2 }
  END { if (lines_found > 0) printf "%.2f", lines_hit / lines_found * 100; else print "0.00" }
' "$lcov_file")"

{
  echo "current=$current"
} >> "${GITHUB_OUTPUT:-/dev/null}"

summary="${GITHUB_STEP_SUMMARY:-/dev/null}"

if [[ -z "$baseline_file" || ! -f "$baseline_file" ]]; then
  echo "No baseline coverage recorded yet — skipping comparison." | tee -a "$summary"
  echo "Current coverage: ${current}%" | tee -a "$summary"
  exit 0
fi

baseline="$(tr -d '[:space:]' < "$baseline_file")"

dropped="$(awk -v baseline="$baseline" -v current="$current" -v tolerance="$tolerance" \
  'BEGIN { print (current + tolerance < baseline) ? "yes" : "no" }')"

{
  echo "### Coverage check"
  echo ""
  echo "| Baseline | Current | Tolerance |"
  echo "| --- | --- | --- |"
  echo "| ${baseline}% | ${current}% | ${tolerance}% |"
} >> "$summary"

if [[ "$dropped" == "yes" ]]; then
  echo "" >> "$summary"
  echo "Coverage dropped from ${baseline}% to ${current}% (allowed tolerance ${tolerance}%)." | tee -a "$summary" >&2
  if [[ "$enforce" == "true" ]]; then
    exit 1
  fi
  exit 0
fi

echo "Coverage is at ${current}% (baseline ${baseline}%)." | tee -a "$summary"
