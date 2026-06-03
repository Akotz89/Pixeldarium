#!/bin/bash
# Pixeldarium Codex validation script
# Run this before committing or opening a PR.

set -e

echo "=== Pixeldarium Validation ==="
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

# 2. Standalone Agent Studio check
echo ""
echo "--- Standalone Agent Studio Check ---"
STUDIO_ROOT="../pixeldarium-agent-studio"
if [ -f "$STUDIO_ROOT/package.json" ]; then
  if (cd "$STUDIO_ROOT" && npm run validate); then
    echo "Standalone agent studio OK"
  else
    FAIL=1
  fi
else
  echo "Standalone agent studio not present at $STUDIO_ROOT"
fi

# 3. Runtime boundary isolation check
echo ""
echo "--- Runtime Boundary Check ---"
LEAK=$(grep -rl "agent-studio\|pipeline_runner\|palette_snap\|grid_snap\|atlas_pack" \
  index.html js/ 2>/dev/null || true)
if [ -z "$LEAK" ]; then
  echo "No tooling references leaked into runtime"
else
  echo "TOOLING LEAKED INTO RUNTIME: $LEAK"
  FAIL=1
fi

# 4. Git whitespace check
echo ""
echo "--- Git Whitespace Check ---"
if git diff --check HEAD 2>/dev/null; then
  echo "No whitespace errors"
else
  echo "Whitespace errors found"
  FAIL=1
fi

# 5. Check for mixed line endings
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
