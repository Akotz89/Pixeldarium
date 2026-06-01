#!/bin/bash
# PixelSim Codex validation script
# Run this before committing or opening a PR.

set -e

echo "=== PixelSim Validation ==="
echo ""

# 1. Syntax check all JS files
echo "--- JS Syntax Check ---"
FAIL=0
for f in config.js state.js utils.js planet.js terrain.js food.js organisms.js \
         settlements.js render-terrain-cache.js render.js persistence.js ui.js main.js; do
  if [ -f "$f" ]; then
    printf "%s: " "$f"
    if node --check "$f" 2>&1; then
      echo "OK"
    else
      echo "FAIL"
      FAIL=1
    fi
  fi
done

# Also check any files in js/ subdirectories (post-E0)
if [ -d "js" ]; then
  echo ""
  echo "--- JS Subdirectory Syntax Check ---"
  find js -name "*.js" | sort | while read f; do
    printf "%s: " "$f"
    if node --check "$f" 2>&1; then
      echo "OK"
    else
      echo "FAIL"
      FAIL=1
    fi
  done
fi

# 2. Check for whitespace errors
echo ""
echo "--- Git Whitespace Check ---"
if git diff --check HEAD 2>/dev/null; then
  echo "No whitespace errors"
else
  echo "Whitespace errors found"
  FAIL=1
fi

# 3. Check for mixed line endings
echo ""
echo "--- Line Ending Check ---"
CRLF_FILES=$(grep -rlP '\r\n' *.js *.html *.css 2>/dev/null || true)
if [ -z "$CRLF_FILES" ]; then
  echo "All files use LF endings"
else
  echo "CRLF found in: $CRLF_FILES"
  FAIL=1
fi

echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "=== ALL CHECKS PASSED ==="
else
  echo "=== CHECKS FAILED ==="
  exit 1
fi
