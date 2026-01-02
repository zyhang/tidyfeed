#!/usr/bin/env python3
"""
Debug script to test different methods of finding mentions.
"""

import os
import sys
import asyncio
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

BOT_COOKIES_PATH = os.environ.get('BOT_COOKIES_PATH', './cookies.json')
BOT_USERNAME = os.environ.get('BOT_USERNAME', 'tidyfeedapp')


async def main():
    print("=" * 60)
    print("TidyFeed Bot - Search Mentions Debug")
    print("=" * 60)
    
    from twikit import Client
    
    client = Client('en-US')
    
    cookies_path = Path(BOT_COOKIES_PATH)
    if not cookies_path.exists():
        print(f"❌ Cookies not found: {BOT_COOKIES_PATH}")
        return
    
    print(f"Loading cookies from {BOT_COOKIES_PATH}...")
    client.load_cookies(str(cookies_path))
    print("✅ Cookies loaded\n")
    
    # Method 1: Search for mentions
    print("=" * 60)
    print(f"Method 1: Search for '@{BOT_USERNAME}'")
    print("=" * 60)
    
    try:
        search_query = f"@{BOT_USERNAME}"
        print(f"Searching: {search_query}")
        
        results = await client.search_tweet(search_query, 'Latest')
        print(f"Results type: {type(results)}")
        print(f"Results count: {len(results) if results else 0}")
        
        if results:
            for i, tweet in enumerate(results[:5]):
                print(f"\n--- Tweet {i+1} ---")
                print(f"ID: {tweet.id}")
                print(f"Text: {tweet.text[:150] if tweet.text else 'N/A'}")
                print(f"User: @{tweet.user.screen_name if tweet.user else 'N/A'}")
                print(f"Reply to: {getattr(tweet, 'in_reply_to_status_id', 'N/A')}")
                print(f"Created: {getattr(tweet, 'created_at', 'N/A')}")
    except Exception as e:
        print(f"❌ Search error: {e}")
        import traceback
        traceback.print_exc()
    
    # Method 2: Get user mentions timeline
    print("\n" + "=" * 60)
    print("Method 2: Get mentions timeline")
    print("=" * 60)
    
    try:
        # First get bot user info
        user = await client.get_user_by_screen_name(BOT_USERNAME)
        print(f"Bot user ID: {user.id}")
        
        # Try to get mentions
        # Note: This might need a different API call
        mentions = await client.get_user_tweets(user.id, 'Replies')
        print(f"Replies count: {len(mentions) if mentions else 0}")
        
        if mentions:
            for i, tweet in enumerate(mentions[:3]):
                print(f"\n--- Reply {i+1} ---")
                print(f"Text: {tweet.text[:100] if tweet.text else 'N/A'}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    print("\n" + "=" * 60)
    print("Debug complete")


if __name__ == '__main__':
    asyncio.run(main())
