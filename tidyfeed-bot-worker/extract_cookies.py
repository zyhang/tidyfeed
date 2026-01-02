#!/usr/bin/env python3
"""
TidyFeed Bot - Cookie Extractor (Manual Method)

Since Cloudflare blocks automated login, we need to extract cookies
from a browser where you're already logged in.

Method 1: Use browser developer tools
Method 2: Use browser extension (EditThisCookie, Cookie-Editor)

This script helps you create cookies.json from manually copied values.
"""

import json
import os

COOKIES_PATH = os.environ.get('BOT_COOKIES_PATH', './cookies.json')

def main():
    print("=" * 60)
    print("TidyFeed Bot - Manual Cookie Extractor")
    print("=" * 60)
    print()
    print("Since Cloudflare blocks automated login, we'll extract")
    print("cookies from your browser manually.")
    print()
    print("STEPS:")
    print("1. Open Chrome/Firefox and go to https://x.com")
    print("2. Log in to @tidyfeedapp account")
    print("3. Open Developer Tools (F12) → Application → Cookies")
    print("4. Find and copy the values for these cookies:")
    print("   - auth_token")
    print("   - ct0")
    print()
    
    print("-" * 60)
    print("Enter cookie values (paste and press Enter):")
    print("-" * 60)
    
    auth_token = input("auth_token: ").strip()
    if not auth_token:
        print("❌ auth_token is required!")
        return
    
    ct0 = input("ct0: ").strip()
    if not ct0:
        print("❌ ct0 is required!")
        return
    
    # Optional cookies (twikit may need these)
    print()
    print("Optional cookies (press Enter to skip):")
    twid = input("twid (optional): ").strip()
    
    # Build cookies dict in twikit format
    cookies = {
        "auth_token": auth_token,
        "ct0": ct0,
    }
    
    if twid:
        cookies["twid"] = twid
    
    # Add common required cookies with default values
    cookies.update({
        "guest_id_marketing": f"v1%3A{auth_token[:13]}",
        "guest_id_ads": f"v1%3A{auth_token[:13]}",
        "personalization_id": f'"v1_{auth_token[:22]}=="',
        "guest_id": f"v1%3A{auth_token[:13]}",
    })
    
    # Save
    with open(COOKIES_PATH, 'w') as f:
        json.dump(cookies, f, indent=2)
    
    print()
    print("=" * 60)
    print(f"✅ Cookies saved to: {COOKIES_PATH}")
    print("=" * 60)
    print()
    print("Now run: python bot.py")


if __name__ == '__main__':
    main()
