#!/bin/bash
#
# Definition of Done checker for Index Card Kitchen
# Based on Launch Lab handbook: docs/definition-of-done.md
#
# Usage: ./scripts/check-dod.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PASS="${GREEN}✓${NC}"
FAIL="${RED}✗${NC}"
WARN="${YELLOW}!${NC}"
INFO="${BLUE}→${NC}"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  Definition of Done - Automated Checks"
echo "  Index Card Kitchen"
echo "════════════════════════════════════════════════════════════════"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

ISSUES=0

# ─────────────────────────────────────────────────────────────────────
# DOCUMENTATION
# ─────────────────────────────────────────────────────────────────────
echo -e "${BLUE}Documentation${NC}"
echo "────────────────────────────────────────────────────────────────"

if [ -f "README.md" ]; then
    echo -e "  ${PASS} README.md exists"
else
    echo -e "  ${FAIL} README.md missing"
    ((ISSUES++))
fi

if [ -f ".env.example" ]; then
    echo -e "  ${PASS} .env.example exists"
else
    echo -e "  ${FAIL} .env.example missing"
    ((ISSUES++))
fi

if [ -f "AGENTS.md" ]; then
    echo -e "  ${PASS} AGENTS.md exists (agent instructions)"
else
    echo -e "  ${WARN} AGENTS.md missing (optional but recommended)"
fi

echo ""

# ─────────────────────────────────────────────────────────────────────
# SECURITY: Secrets in repo
# ─────────────────────────────────────────────────────────────────────
echo -e "${BLUE}Security - Secrets Check${NC}"
echo "────────────────────────────────────────────────────────────────"

# Check for .env files (excluding .env.example)
ENV_FILES=$(find . -name ".env" -o -name ".env.local" -o -name ".env.production" 2>/dev/null | grep -v node_modules | grep -v ".env.example" || true)
if [ -z "$ENV_FILES" ]; then
    echo -e "  ${PASS} No .env files in working tree (good)"
else
    echo -e "  ${FAIL} Found .env files that should not be committed:"
    echo "$ENV_FILES" | while read f; do echo "       $f"; done
    ((ISSUES++))
fi

# Check if .env is in .gitignore
if grep -q "^\.env$" .gitignore 2>/dev/null || grep -q "^\.env\*" .gitignore 2>/dev/null; then
    echo -e "  ${PASS} .env is in .gitignore"
else
    echo -e "  ${FAIL} .env not found in .gitignore"
    ((ISSUES++))
fi

# Check git history for secrets (common patterns)
echo -e "  ${INFO} Checking git history for common secret patterns..."
SECRET_PATTERNS="password=|api_key=|apikey=|secret=|AWS_SECRET|PRIVATE_KEY"
HISTORY_SECRETS=$(git log -p --all 2>/dev/null | grep -iE "$SECRET_PATTERNS" | head -5 || true)
if [ -z "$HISTORY_SECRETS" ]; then
    echo -e "  ${PASS} No obvious secrets found in git history"
else
    echo -e "  ${WARN} Potential secrets found in git history (review manually):"
    echo "$HISTORY_SECRETS" | head -3 | while read line; do echo "       ${line:0:60}..."; done
fi

echo ""

# ─────────────────────────────────────────────────────────────────────
# SECURITY: Dependencies
# ─────────────────────────────────────────────────────────────────────
echo -e "${BLUE}Security - Dependencies${NC}"
echo "────────────────────────────────────────────────────────────────"

# Check for lockfiles
if [ -f "client/package-lock.json" ] || [ -f "client/yarn.lock" ]; then
    echo -e "  ${PASS} Client lockfile exists"
else
    echo -e "  ${FAIL} Client lockfile missing (package-lock.json or yarn.lock)"
    ((ISSUES++))
fi

if [ -f "server/package-lock.json" ] || [ -f "server/yarn.lock" ]; then
    echo -e "  ${PASS} Server lockfile exists"
else
    echo -e "  ${FAIL} Server lockfile missing"
    ((ISSUES++))
fi

# Run npm audit
echo -e "  ${INFO} Running npm audit on client..."
cd "$PROJECT_ROOT/client"
CLIENT_AUDIT=$(npm audit --audit-level=critical 2>&1 || true)
if echo "$CLIENT_AUDIT" | grep -q "found 0 vulnerabilities\|0 vulnerabilities"; then
    echo -e "  ${PASS} Client: No critical vulnerabilities"
elif echo "$CLIENT_AUDIT" | grep -q "critical"; then
    CRIT_COUNT=$(echo "$CLIENT_AUDIT" | grep -oE "[0-9]+ critical" | head -1 || echo "some critical")
    echo -e "  ${FAIL} Client: $CRIT_COUNT vulnerabilities found"
    ((ISSUES++))
else
    echo -e "  ${PASS} Client: No critical vulnerabilities"
fi

echo -e "  ${INFO} Running npm audit on server..."
cd "$PROJECT_ROOT/server"
SERVER_AUDIT=$(npm audit --audit-level=critical 2>&1 || true)
if echo "$SERVER_AUDIT" | grep -q "found 0 vulnerabilities\|0 vulnerabilities"; then
    echo -e "  ${PASS} Server: No critical vulnerabilities"
elif echo "$SERVER_AUDIT" | grep -q "critical"; then
    CRIT_COUNT=$(echo "$SERVER_AUDIT" | grep -oE "[0-9]+ critical" | head -1 || echo "some critical")
    echo -e "  ${FAIL} Server: $CRIT_COUNT vulnerabilities found"
    ((ISSUES++))
else
    echo -e "  ${PASS} Server: No critical vulnerabilities"
fi

cd "$PROJECT_ROOT"
echo ""

# ─────────────────────────────────────────────────────────────────────
# DEPLOYMENT
# ─────────────────────────────────────────────────────────────────────
echo -e "${BLUE}Deployment${NC}"
echo "────────────────────────────────────────────────────────────────"

if [ -f "Dockerfile" ]; then
    echo -e "  ${PASS} Dockerfile exists"
else
    echo -e "  ${FAIL} Dockerfile missing"
    ((ISSUES++))
fi

if [ -f "docker-compose.yml" ]; then
    echo -e "  ${PASS} docker-compose.yml exists"
else
    echo -e "  ${FAIL} docker-compose.yml missing"
    ((ISSUES++))
fi

# Check if current commit is tagged or can be identified
CURRENT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
if [ "$CURRENT_COMMIT" != "unknown" ]; then
    echo -e "  ${PASS} Current commit: $CURRENT_COMMIT"
else
    echo -e "  ${WARN} Could not determine current commit"
fi

echo ""

# ─────────────────────────────────────────────────────────────────────
# ACCESSIBILITY (what can be checked statically)
# ─────────────────────────────────────────────────────────────────────
echo -e "${BLUE}Accessibility - Static Checks${NC}"
echo "────────────────────────────────────────────────────────────────"

# Check for images without alt in JSX
IMGS_NO_ALT=$(grep -rn "<img" client/src --include="*.jsx" --include="*.js" 2>/dev/null | grep -v "alt=" | head -5 || true)
if [ -z "$IMGS_NO_ALT" ]; then
    echo -e "  ${PASS} All <img> tags appear to have alt attributes"
else
    echo -e "  ${WARN} Some <img> tags may be missing alt attributes:"
    echo "$IMGS_NO_ALT" | while read line; do echo "       ${line:0:70}..."; done
fi

# Check for document title
if grep -rq "<title>" client/index.html 2>/dev/null || grep -rq "document.title" client/src 2>/dev/null; then
    echo -e "  ${PASS} Page title is set"
else
    echo -e "  ${WARN} Could not verify page title is set"
fi

echo ""

# ─────────────────────────────────────────────────────────────────────
# SUMMARY
# ─────────────────────────────────────────────────────────────────────
echo "════════════════════════════════════════════════════════════════"
echo -e "  ${BLUE}Automated Check Summary${NC}"
echo "════════════════════════════════════════════════════════════════"

if [ $ISSUES -eq 0 ]; then
    echo -e "  ${GREEN}All automated checks passed!${NC}"
else
    echo -e "  ${RED}$ISSUES issue(s) found that need attention${NC}"
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo -e "  ${BLUE}Manual Checks Required${NC}"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "  Primary Workflow:"
echo "  [ ] Core workflow works start to finish without instructions"
echo "  [ ] Works on mobile and desktop"
echo "  [ ] Empty state is helpful (first-time user sees something useful)"
echo "  [ ] Loading states show progress"
echo "  [ ] Error states are plain-language, no stack traces"
echo "  [ ] Someone else completed the main task without you talking"
echo ""
echo "  Testing:"
echo "  [ ] Automated tests cover the core workflow"
echo "  [ ] Tests pass in CI"
echo "  [ ] Manually tested on real phone and desktop browser"
echo "  [ ] Tried to break it: empty input, huge input, double-click, back button"
echo ""
echo "  Accessibility:"
echo "  [ ] Fully keyboard navigable"
echo "  [ ] Visible focus indicators"
echo "  [ ] Contrast meets WCAG AA (use browser devtools or axe)"
echo "  [ ] Form inputs have labels"
echo "  [ ] Respects reduced motion (prefers-reduced-motion)"
echo "  [ ] Sensible heading order (h1 → h2 → h3)"
echo ""
echo "  Security:"
echo "  [ ] All input validated server-side"
echo "  [ ] HTTPS everywhere in production"
echo "  [ ] Privacy policy is live and accurate"
echo ""
echo "  Analytics & Monitoring:"
echo "  [ ] Analytics events defined (page view, core action start/complete)"
echo "  [ ] Error monitoring reaches a real inbox"
echo "  [ ] Test error triggered and confirmed received"
echo ""
echo "  Deployment:"
echo "  [ ] Deploy is one command, documented in README"
echo "  [ ] Rollback tested on purpose and it worked"
echo ""
echo "  Demo Material:"
echo "  [ ] Screenshots (mobile and desktop)"
echo "  [ ] 30-second video of core workflow"
echo ""
echo "  Production Readiness:"
echo "  [ ] Working support contact on the app"
echo "  [ ] Honest description, no implied capabilities"
echo "  [ ] Visible 'Launch Lab experiment' note"
echo "  [ ] No dark patterns"
echo "  [ ] Users can export their data"
echo "  [ ] Someone other than you can take it down"
echo ""
echo "  Ownership:"
echo "  [ ] Named owner (a person)"
echo "  [ ] 30-day review date in calendar"
echo "  [ ] Listed in launch-lab-handbook docs/projects.md"
echo ""
echo "════════════════════════════════════════════════════════════════"
echo ""

exit $ISSUES
