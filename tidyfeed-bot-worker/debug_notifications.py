#!/usr/bin/env python3
"""
Debug script to test notification fetching.
Run this to see what twikit returns.
"""

import os
import sys
import json
import asyncio
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

BOT_COOKIES_PATH = os.environ.get('BOT_COOKIES_PATH', './cookies.json')


async def main():
    print("=" * 60)
    print("TidyFeed Bot - Notification Debug")
    print("=" * 60)
    
    from twikit import Client
    
    client = Client('en-US')
    
    cookies_path = Path(BOT_COOKIES_PATH)
    if not cookies_path.exists():
        print(f"❌ Cookies not found: {BOT_COOKIES_PATH}")
        return
    
    print(f"Loading cookies from {BOT_COOKIES_PATH}...")
    client.load_cookies(str(cookies_path))
    print("✅ Cookies loaded")
    
    print()
    print("Fetching notifications (mentions)...")
    print("-" * 60)
    
    try:
        # Try different notification types
        for notif_type in ['mentions', 'All']:
            print(f"\n📬 Trying: get_notifications('{notif_type}')")
            try:
                notifications = await client.get_notifications(notif_type)
                print(f"   Type: {type(notifications)}")
                print(f"   Count: {len(notifications) if notifications else 0}")
                
                if notifications:
                    for i, notif in enumerate(notifications[:5]):  # First 5
                        print(f"\n   --- Notification {i+1} ---")
                        print(f"   Type: {type(notif).__name__}")
                        
                        # Print all attributes
                        for attr in dir(notif):
                            if not attr.startswith('_'):
                                try:
                                    val = getattr(notif, attr)
                                    if not callable(val):
                                        val_str = str(val)[:100] if val else 'None'
                                        print(f"   {attr}: {val_str}")
                                except:
                                    pass
                        
                        # Check for tweet
                        tweet = getattr(notif, 'tweet', None)
                        if tweet:
                            print(f"\n   📝 Tweet found:")
                            print(f"      ID: {getattr(tweet, 'id', 'N/A')}")
                            print(f"      Text: {getattr(tweet, 'text', 'N/A')[:100]}")
                            user = getattr(tweet, 'user', None)
                            if user:
                                print(f"      User: @{getattr(user, 'screen_name', 'N/A')}")
                            print(f"      Reply to: {getattr(tweet, 'in_reply_to_status_id', 'N/A')}")
                        
            except Exception as e:
                print(f"   ❌ Error: {e}")
                import traceback
                traceback.print_exc()
                
    except Exception as e:
        print(f"❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
    
    print()
    print("=" * 60)
    print("Debug complete")


if __name__ == '__main__':
    asyncio.run(main())
