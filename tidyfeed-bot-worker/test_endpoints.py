#!/usr/bin/env python3
"""
Test different X API endpoints to find one that works.
"""

import os
import json
import asyncio
import httpx

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

BOT_COOKIES_PATH = './cookies.json'
X_BEARER = 'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA'


async def main():
    # Load cookies
    with open(BOT_COOKIES_PATH) as f:
        cookies = json.load(f)
    
    auth_token = cookies.get('auth_token', '')
    ct0 = cookies.get('ct0', '')
    
    headers = {
        'Authorization': f'Bearer {X_BEARER}',
        'x-csrf-token': ct0,
        'cookie': f'auth_token={auth_token}; ct0={ct0}',
        'x-twitter-active-user': 'yes',
    }
    
    print("Testing X API endpoints...\n")
    
    async with httpx.AsyncClient(headers=headers, timeout=30) as client:
        
        # Test 1: Account settings (known to work)
        print("1️⃣ Testing account/settings.json")
        try:
            r = await client.get('https://api.x.com/1.1/account/settings.json')
            print(f"   Status: {r.status_code}")
            if r.status_code == 200:
                data = r.json()
                print(f"   ✅ screen_name: {data.get('screen_name')}")
        except Exception as e:
            print(f"   ❌ {e}")
        
        # Test 2: Activity (notifications)
        print("\n2️⃣ Testing activity/about_me.json")
        try:
            r = await client.get('https://api.x.com/1.1/activity/about_me.json', params={'count': 20})
            print(f"   Status: {r.status_code}")
            if r.status_code == 200:
                data = r.json()
                print(f"   ✅ Found {len(data)} activities")
                for i, item in enumerate(data[:3]):
                    action = item.get('action', 'unknown')
                    print(f"   - Activity {i+1}: {action}")
        except Exception as e:
            print(f"   ❌ {e}")
        
        # Test 3: Mentions timeline
        print("\n3️⃣ Testing statuses/mentions_timeline.json")
        try:
            r = await client.get('https://api.x.com/1.1/statuses/mentions_timeline.json', params={'count': 20})
            print(f"   Status: {r.status_code}")
            if r.status_code == 200:
                data = r.json()
                print(f"   ✅ Found {len(data)} mentions")
                for tweet in data[:3]:
                    user = tweet.get('user', {}).get('screen_name', 'unknown')
                    text = tweet.get('text', '')[:50]
                    reply_to = tweet.get('in_reply_to_status_id_str', None)
                    print(f"   - @{user}: {text}...")
                    print(f"     Reply to: {reply_to}")
        except Exception as e:
            print(f"   ❌ {e}")
        
        # Test 4: Search tweets
        print("\n4️⃣ Testing search/tweets.json")
        try:
            r = await client.get('https://api.x.com/1.1/search/tweets.json', 
                                params={'q': '@tidyfeedapp', 'result_type': 'recent', 'count': 10})
            print(f"   Status: {r.status_code}")
            if r.status_code == 200:
                data = r.json()
                statuses = data.get('statuses', [])
                print(f"   ✅ Found {len(statuses)} tweets")
        except Exception as e:
            print(f"   ❌ {e}")


if __name__ == '__main__':
    asyncio.run(main())
