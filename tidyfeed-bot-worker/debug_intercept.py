#!/usr/bin/env python3
"""
Intercept and save raw twikit HTTP response
"""

import os
import json
import asyncio
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

BOT_COOKIES_PATH = './cookies.json'


async def main():
    from twikit import Client
    import twikit.client.client as client_module
    
    # Patch the request method to capture response
    original_request = client_module.Client.request
    captured_responses = []
    
    async def patched_request(self, method, url, **kwargs):
        result = await original_request(self, method, url, **kwargs)
        if 'mentions' in url:
            captured_responses.append({
                'url': url,
                'status': getattr(result[1], 'status_code', 'unknown') if len(result) > 1 else 'N/A',
                'data': result[0] if result else None
            })
        return result
    
    client_module.Client.request = patched_request
    
    print("Intercepting twikit requests...\n")
    
    client = Client('en-US')
    client.load_cookies(BOT_COOKIES_PATH)
    
    result = await client.get_notifications('mentions')
    
    print(f"Result count: {len(result) if result else 0}")
    
    if captured_responses:
        print(f"\n📡 Captured {len(captured_responses)} responses:")
        for i, resp in enumerate(captured_responses):
            print(f"\n--- Response {i+1} ---")
            print(f"URL: {resp['url'][:80]}...")
            print(f"Status: {resp['status']}")
            
            data = resp['data']
            if data:
                # Save to file
                with open('captured_mentions.json', 'w') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                print("✅ Saved to captured_mentions.json")
                
                # Analyze
                if isinstance(data, dict):
                    print(f"Keys: {list(data.keys())}")
                    
                    # Check for globalObjects (common X response format)
                    if 'globalObjects' in data:
                        go = data['globalObjects']
                        tweets = go.get('tweets', {})
                        users = go.get('users', {})
                        print(f"Tweets: {len(tweets)}, Users: {len(users)}")
                        
                        if tweets:
                            print("\n📝 First tweet:")
                            tid, tweet = list(tweets.items())[0]
                            print(f"  ID: {tid}")
                            print(f"  Text: {tweet.get('full_text', 'N/A')[:100]}")
                    
                    # Check for empty data indicators
                    if data.get('errors'):
                        print(f"⚠️ Errors: {data['errors']}")
    else:
        print("❌ No responses captured")


if __name__ == '__main__':
    asyncio.run(main())
