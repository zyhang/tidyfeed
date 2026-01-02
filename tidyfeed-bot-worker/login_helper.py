#!/usr/bin/env python3
"""
TidyFeed Bot - Login Helper

A standalone utility script to generate cookies.json for the bot account.
Run this ONCE locally to authenticate and save cookies.

Usage:
    1. Copy .env.example to .env and fill in BOT_USERNAME, BOT_EMAIL, BOT_PASSWORD
    2. Run: python login_helper.py
    3. Complete any challenges (CAPTCHA, email verification) if prompted
    4. cookies.json will be saved to the current directory
    5. Upload cookies.json to your deployment or set as environment variable

Note: Twitter may require 2FA or email verification on first login.
      This script handles interactive prompts.
"""

import os
import sys
import asyncio
import json

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("Warning: python-dotenv not installed, using environment variables directly")

# Configuration
BOT_USERNAME = os.environ.get('BOT_USERNAME', '')
BOT_EMAIL = os.environ.get('BOT_EMAIL', '')
BOT_PASSWORD = os.environ.get('BOT_PASSWORD', '')
COOKIES_PATH = os.environ.get('BOT_COOKIES_PATH', './cookies.json')


async def main():
    """Perform login and save cookies."""
    print("=" * 50)
    print("TidyFeed Bot - Login Helper")
    print("=" * 50)
    
    # Validate credentials
    if not BOT_USERNAME:
        print("\n❌ Error: BOT_USERNAME not set")
        print("   Set it in .env file or as environment variable")
        sys.exit(1)
    
    if not BOT_PASSWORD:
        print("\n❌ Error: BOT_PASSWORD not set")
        print("   Set it in .env file or as environment variable")
        sys.exit(1)
    
    print(f"\n📱 Bot Account: @{BOT_USERNAME}")
    print(f"📧 Email: {BOT_EMAIL or '(not set)'}")
    print(f"💾 Cookies will be saved to: {COOKIES_PATH}")
    print()
    
    # Confirm before proceeding
    confirm = input("Proceed with login? [y/N]: ").strip().lower()
    if confirm != 'y':
        print("Aborted.")
        sys.exit(0)
    
    try:
        from twikit import Client
    except ImportError:
        print("\n❌ Error: twikit not installed")
        print("   Run: pip install twikit")
        sys.exit(1)
    
    print("\n🔐 Logging in to Twitter...")
    
    try:
        # Create client
        client = Client('en-US')
        
        # Perform login
        # auth_info_1: username or phone
        # auth_info_2: email (for verification if needed)
        # password: account password
        await client.login(
            auth_info_1=BOT_USERNAME,
            auth_info_2=BOT_EMAIL if BOT_EMAIL else BOT_USERNAME,
            password=BOT_PASSWORD
        )
        
        print("✅ Login successful!")
        
        # Verify we're logged in
        user = await client.user()
        print(f"✅ Authenticated as: @{user.screen_name} ({user.name})")
        
        # Save cookies
        client.save_cookies(COOKIES_PATH)
        print(f"\n💾 Cookies saved to: {COOKIES_PATH}")
        
        # Also print cookies as JSON for environment variable usage
        print("\n" + "=" * 50)
        print("📋 For container deployment, you can also use this as BOT_COOKIES_JSON:")
        print("=" * 50)
        
        with open(COOKIES_PATH, 'r') as f:
            cookies_content = f.read()
            # Compact JSON for env var
            cookies_compact = json.dumps(json.loads(cookies_content), separators=(',', ':'))
            print(f"\nBOT_COOKIES_JSON='{cookies_compact}'")
        
        print("\n" + "=" * 50)
        print("✅ Setup complete!")
        print("=" * 50)
        print(f"\nNext steps:")
        print(f"  1. Keep {COOKIES_PATH} secure (it contains auth tokens)")
        print(f"  2. For local testing: cookies will be loaded automatically")
        print(f"  3. For Fly.io: set BOT_COOKIES_JSON as a secret")
        print(f"     fly secrets set BOT_COOKIES_JSON='...'")
        
    except Exception as e:
        print(f"\n❌ Login failed: {e}")
        print("\nPossible causes:")
        print("  - Wrong username/password")
        print("  - Account locked or suspended")
        print("  - 2FA enabled (not yet supported)")
        print("  - Twitter is blocking automated login")
        print("\nTry logging in manually via browser first, then retry.")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    asyncio.run(main())
