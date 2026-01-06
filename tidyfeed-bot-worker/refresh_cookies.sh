#!/bin/bash
# TidyFeed Bot - Cookie Refresher (Shell version)
# Usage: ./refresh_cookies.sh [cookies_file_path]

set -e

FLY_APP="${FLY_APP_NAME:-tidyfeed-bot-worker}"
COOKIES_FILE="${1:-cookies.json}"
REMOTE_PATH="/data/cookies.json"

echo "🍪 TidyFeed Bot - Cookie Refresher"
echo "======================================"

if [ ! -f "$COOKIES_FILE" ]; then
    echo "❌ Cookies file not found: $COOKIES_FILE"
    echo ""
    echo "📖 How to get cookies:"
    echo "   1. Install 'EditThisCookie' extension in Chrome/Firefox"
    echo "   2. Log into https://x.com as @tidyfeedapp"
    echo "   3. Click extension → Export → JSON"
    echo "   4. Save as cookies.json"
    echo ""
    echo "💡 Usage: ./refresh_cookies.sh [path/to/cookies.json]"
    exit 1
fi

echo "📂 Found cookies: $COOKIES_FILE"
echo "🎯 Target app: $FLY_APP"
echo ""
read -p "Proceed with upload? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled"
    exit 1
fi

echo "🚀 Uploading cookies to Fly.io..."

# Upload using cat through fly ssh
cat "$COOKIES_FILE" | fly ssh sftp shell -a "$FLY_APP" "cat > $REMOTE_PATH"

if [ $? -eq 0 ]; then
    echo "✅ Cookies uploaded successfully!"
    echo ""
    echo "📝 Next steps:"
    echo "   fly logs -a $FLY_APP"
    echo ""
    echo "   Bot should pick up new cookies automatically."
else
    echo "❌ Upload failed"
    exit 1
fi
