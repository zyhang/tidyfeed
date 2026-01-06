#!/usr/bin/env python3
"""
TidyFeed Bot - Firefox Cookie Extractor (macOS)

Extracts ALL X/Twitter cookies from Firefox for twikit.
"""

import os
import sys
import json
import sqlite3
from pathlib import Path

# Configuration
FIREFOX_BASE = Path.home() / 'Library/Application Support/Firefox/Profiles'
OUTPUT_FILE = 'cookies.json'


def find_firefox_profile():
    """Find the default Firefox profile."""
    if not FIREFOX_BASE.exists():
        return None

    profiles = list(FIREFOX_BASE.glob('*.default*'))
    if not profiles:
        return None

    # Prefer default-release
    for p in profiles:
        if 'default-release' in p.name:
            return p

    return profiles[0]


def get_firefox_cookies(domain='x.com'):
    """Extract ALL cookies from Firefox for a specific domain."""
    profile = find_firefox_profile()
    if not profile:
        print(f"❌ Firefox profile not found")
        return None

    cookie_path = profile / 'cookies.sqlite'
    if not cookie_path.exists():
        print(f"❌ Firefox cookies not found at: {cookie_path}")
        return None

    print(f"📂 Firefox profile: {profile.name}")

    # Copy database (Firefox may lock it)
    import shutil
    temp_path = Path('/tmp/firefox_cookies_copy.db')
    try:
        shutil.copy(cookie_path, temp_path)
    except Exception as e:
        print(f"❌ Cannot access Firefox cookies: {e}")
        print("   Try quitting Firefox first")
        return None

    cookies = {}
    try:
        conn = sqlite3.connect(temp_path)
        cursor = conn.cursor()

        # Query for ALL cookies from x.com (including .x.com)
        cursor.execute("""
            SELECT name, value, host
            FROM moz_cookies
            WHERE host LIKE ? OR host LIKE ?
        """, (f'%{domain}', f'%.{domain}'))

        for row in cursor.fetchall():
            name, value, host = row
            # Include all cookies from x.com and .x.com
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


async def test_cookies(cookies):
    """Test if cookies work with twikit."""
    print("\n🧪 Testing cookies with twikit...")
    try:
        from twikit import Client
        client = Client('en-US')
        client.set_cookies(cookies)

        # Try to get user_id (validates cookies)
        uid = await client.user_id()
        if uid:
            print(f"✅ Authenticated! User ID: {uid}")

            # Try to get username
            try:
                user = await client.user()
                print(f"✅ Account: @{user.screen_name} ({user.name})")
            except:
                pass
            return True
        else:
            print("❌ Authentication failed - no user_id returned")
            return False
    except Exception as e:
        print(f"❌ Authentication failed: {e}")
        return False


def main():
    print("=" * 60)
    print("🍪 TidyFeed Bot - Firefox Cookie Extractor")
    print("=" * 60)
    print()

    print("📋 Extracting cookies from Firefox...")
    print("   Target: x.com")
    print()

    cookies = get_firefox_cookies('x.com')

    if not cookies:
        print("\n❌ Failed to extract cookies.")
        sys.exit(1)

    print(f"✅ Found {len(cookies)} cookies from x.com")

    # Check for required cookies
    required = ['auth_token', 'ct0']
    found = [c for c in required if c in cookies]
    missing = [c for c in required if c not in cookies]

    print(f"   Required cookies: {', '.join(found)}")
    if missing:
        print(f"   ⚠️ Missing: {', '.join(missing)}")
        sys.exit(1)

    # Test cookies locally before saving
    import asyncio
    if not asyncio.run(test_cookies(cookies)):
        print("\n❌ Cookies failed authentication test!")
        print("\nPossible issues:")
        print("   - You're not logged into x.com as @tidyfeedapp")
        print("   - Cookies have expired")
        print("   - Network issues")
        sys.exit(1)

    # Save to file
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(cookies, f, indent=2)

    print()
    print("=" * 60)
    print(f"✅ Cookies saved to: {OUTPUT_FILE}")
    print("=" * 60)
    print()
    print("📝 Next steps:")
    print("   1. Upload to server: python refresh_cookies.py")
    print("   2. Restart bot: fly apps restart tidyfeed-bot-worker")


if __name__ == '__main__':
    main()
