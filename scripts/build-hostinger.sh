#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SITE_URL="${SITE:-https://raypearsonlaw.com}"
API_KEY="${ALIGNO_USER_API_KEY:-}"
NOTIFY_TO="${LEAD_NOTIFY_TO:-rpearson@raypearsonlawgroup.com}"
NOTIFY_BCC="${LEAD_NOTIFY_BCC:-aki.b@pentridgemedia.com}"
NOTIFY_FROM="${LEAD_NOTIFY_FROM:-contact@raypearsonlawgroup.com}"
NOTIFY_FROM_NAME="${LEAD_NOTIFY_FROM_NAME:-Law Office of Ray L. Pearson}"
ZIP_PATH="${ROOT}/ray-pearson-hostinger.zip"

if [[ -z "$API_KEY" ]]; then
	echo "Set ALIGNO_USER_API_KEY before running this script." >&2
	exit 1
fi

echo "Building site for ${SITE_URL}..."
SITE="$SITE_URL" npm run build

mkdir -p "$ROOT/dist/api"
cat > "$ROOT/dist/api/config.php" <<PHP
<?php
return [
	'ALIGNO_USER_API_KEY' => '${API_KEY}',
	'ALIGNO_LEAD_WEBHOOK_URL' => 'https://alignocrm.com/api/webhooks/lead',
	'LEAD_NOTIFY_TO' => '${NOTIFY_TO}',
	'LEAD_NOTIFY_BCC' => '${NOTIFY_BCC}',
	'LEAD_NOTIFY_FROM' => '${NOTIFY_FROM}',
	'LEAD_NOTIFY_FROM_NAME' => '${NOTIFY_FROM_NAME}',
];
PHP

echo "Creating ${ZIP_PATH}..."
rm -f "$ZIP_PATH"
(
	cd "$ROOT/dist"
	zip -r "$ZIP_PATH" . -x "*.DS_Store"
)

echo ""
echo "Done."
echo "  Site URL: ${SITE_URL}"
echo "  Zip:      ${ZIP_PATH}"
echo ""
echo "Deploy to Hostinger (API):"
echo "  HOSTINGER_API_TOKEN=... node scripts/deploy-hostinger.mjs"
echo ""
echo "Manual upload fallback:"
echo "  1. File Manager → public_html"
echo "  2. Back up old files if needed, then delete everything in public_html"
echo "  3. Upload ray-pearson-hostinger.zip → Extract"
echo "  4. Confirm index.html and api/ are at the root of public_html"
echo "  5. Hard refresh https://raypearsonlaw.com and test a form"
