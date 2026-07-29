#!/usr/bin/env bash
# Exit on error
set -o errexit

# Install dependencies
npm install

# Set Puppeteer cache directory explicitly
export PUPPETEER_CACHE_DIR=/opt/render/.cache/puppeteer

# Install Chrome for Puppeteer
npx puppeteer browsers install chrome

# Output installed Chrome path for debugging
echo "Chrome installed at:"
find /opt/render/.cache/puppeteer -name "chrome" -type f 2>/dev/null | head -5 || echo "Chrome binary not found in expected location"
