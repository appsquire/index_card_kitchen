#!/usr/bin/env bash
#
# Card Studio test runner — shared packing logic + PDF HTML output.
# Usage: ./scripts/test-card-studio.sh
#
# Optional: CARD_STUDIO_SMOKE=1 with server running exercises live PDF export.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo -e "${BLUE}Card Studio — automated tests${NC}"
echo "────────────────────────────────────────"

echo -e "${BLUE}→${NC} Shared card planner (Node built-in test runner)"
(cd shared && node --test cardPlan.test.js)

echo -e "${BLUE}→${NC} PDF HTML template (no Puppeteer)"
(cd server && node --test src/services/pdfGenerator.html.test.js)

if [ "${CARD_STUDIO_SMOKE:-0}" = "1" ]; then
  echo -e "${BLUE}→${NC} Live PDF smoke (requires server on :4000 + auth token)"
  node "$SCRIPT_DIR/card-studio-smoke.mjs" || {
    echo -e "${RED}Smoke test skipped or failed — set CARD_STUDIO_SMOKE=1 only when server is up${NC}"
    exit 1
  }
fi

echo ""
echo -e "${GREEN}✓${NC} Card Studio automated tests passed"
echo ""
echo "Manual browser checklist (Card Studio UI):"
echo "  1. Open a long recipe (e.g. Gazpacho) → Card studio"
echo "  2. Wait for “Fitting your card…” to finish — no ghost stack under preview"
echo "  3. Flip page chips — title only on page 1; Ingredients/Directions labels once each"
echo "  4. Print → dialog shows card content (not blank)"
echo "  5. Download PDF → file has recipe content (not blank)"
echo ""
