#!/usr/bin/env python3
"""
TidyFeed Bot - Chrome Cookie Extractor (macOS)

Extracts X/Twitter cookies directly from Chrome's cookie database.
This works on macOS and reads Chrome's encrypted cookies.

Usage:
    python extract_cookies_chrome.py

Requirements:
    - macOS
    - Chrome browser
    - Must be logged into x.com in Chrome
"""

import os
import sys
import json
import sqlite3
import shutil
from pathlib import Path

# Configuration
CHROME_COOKIE_PATH = Path.home() / 'Library/Application Support/Google/Chrome/Default/Cookies'
OUTPUT_FILE = 'cookies.json'

# Required cookies for X/Twitter authentication
REQUIRED_COOKIES = ['auth_token', 'ct0']
OPTIONAL_COOKIES = ['twid', 'tweetdeck_version', 'kdt']


def get_chrome_cookies(domain='x.com'):
    """Extract cookies from Chrome's database for a specific domain."""
    cookie_path = CHROME_COOKIE_PATH

    if not cookie_path.exists():
        print(f"❌ Chrome cookies not found at: {cookie_path}")
        print("\nMake sure Chrome is installed and you've logged into x.com")
        return None

    # Chrome locks the database, so we need to copy it first
    temp_path = Path('/tmp/chrome_cookies_copy.db')
    try:
        shutil.copy(cookie_path, temp_path)
    except Exception as e:
        print(f"❌ Cannot access Chrome cookies: {e}")
        print("\nTry quitting Chrome first, then run this script again.")
        return None

    cookies = {}
    try:
        conn = sqlite3.connect(temp_path)
        conn.text_factory = bytes  # Handle encoded values
        cursor = conn.cursor()

        # Query for cookies from x.com
        cursor.execute("""
            SELECT name, value, host_key
            FROM cookies
            WHERE host_key LIKE ? OR host_key LIKE ?
        """, (f'%{domain}', f'%.{domain}'))

        for row in cursor.fetchall():
            name, value, host = row

            # Decode value (Chrome stores as bytes)
            try:
                if isinstance(value, bytes):
                    value = value.decode('utf-8')
            except:
                try:
                    value = value.decode('utf-8', errors='ignore')
                except:
                    continue

            # Only take cookies from x.com (not subdomains)
            if host == domain or host == f'.{domain}':
                cookies[name] = value

        conn.close()

    except Exception as e:
        print(f"❌ Error reading cookie database: {e}")
        return None
    finally:
        # Clean up temp file
        try:
            temp_path.unlink()
        except:
            pass

    return cookies


def main():
    print("=" * 60)
    print("🍪 TidyFeed Bot - Chrome Cookie Extractor")
    print("=" * 60)
    print()

    print("📋 Extracting cookies from Chrome...")
    print("   Target: x.com")
    print()

    cookies = get_chrome_cookies('x.com')

    if not cookies:
        print("\n❌ Failed to extract cookies.")
        print("\nAlternative: Use the manual method:")
        print("   1. Open Chrome → x.com")
        print("   2. Press F12 → Application → Cookies → https://x.com")
        print("   3. Copy values for 'auth_token' and 'ct0'")
        print("   4. Run: python extract_cookies.py")
        sys.exit(1)

    # Check for required cookies
    found_required = [c for c in REQUIRED_COOKIES if c in cookies]
    missing = [c for c in REQUIRED_COOKIES if c not in cookies]

    print(f"✅ Found {len(cookies)} cookies from x.com")
    print(f"   Required: {', '.join(found_required)}")

    if missing:
        print(f"   ⚠️ Missing: {', '.join(missing)}")

        if 'auth_token' in missing or 'ct0' in missing:
            print("\n❌ Critical cookies missing!")
            print("   Make sure you're logged into x.com in Chrome")
            sys.exit(1)

    # Filter to only needed cookies
    output_cookies = {}
    for name in REQUIRED_COOKIES + OPTIONAL_COOKIES:
        if name in cookies:
            output_cookies[name] = cookies[name]

    # Add guest_id cookies if present (helps with requests)
    for name in ['guest_id', 'guest_id_ads', 'guest_id_marketing']:
        if name in cookies:
            output_cookies[name] = cookies[name]

    # Save to file
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(output_cookies, f, indent=2)

    print()
    print("=" * 60)
    print(f"✅ Cookies saved to: {OUTPUT_FILE}")
    print("=" * 60)
    print()
    print("📝 Next steps:")
    print("   1. Review the cookies in cookies.json")
    print("   2. Upload to server: python refresh_cookies.py")
    print("   3. Restart bot: fly apps restart tidyfeed-bot-worker")


if __name__ == '__main__':
    main()
