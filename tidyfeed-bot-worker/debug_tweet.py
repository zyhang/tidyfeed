#!/usr/bin/env python3
"""Debug: Capture and analyze TweetDetail response"""

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
TWEET_ID = '2006834169637384470'  # The target tweet

async def main():
    print("Capturing TweetDetail response...\n")
    
    from twikit import Client
    import twikit.client.client as client_module
    
    client = Client('en-US')
    client.load_cookies(BOT_COOKIES_PATH)
    
    # Capture raw response
    captured_data = {}
    original_request = client_module.Client.request
    
    async def patched_request(self_client, method, url, **kwargs):
        result = await original_request(self_client, method, url, **kwargs)
        if 'TweetDetail' in str(url):
            captured_data['response'] = result[0] if result else None
        return result
    
    client_module.Client.request = patched_request
    
    try:
        print(f"Fetching tweet {TWEET_ID}...")
        await client.get_tweet_by_id(TWEET_ID)
    except Exception as e:
        print(f"twikit error (expected): {e}")
    finally:
        client_module.Client.request = original_request
    
    if 'response' in captured_data:
        data = captured_data['response']
        
        # Save full response
        with open('tweet_detail_raw.json', 'w') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print("✅ Saved to tweet_detail_raw.json")
        
        # Analyze structure
        print("\n📊 Response structure:")
        print(f"Top keys: {list(data.keys())}")
        
        if 'data' in data:
            d = data['data']
            print(f"data keys: {list(d.keys())}")
            
            if 'tweetResult' in d:
                tr = d['tweetResult']
                print(f"tweetResult keys: {list(tr.keys())}")
                if 'result' in tr:
                    r = tr['result']
                    print(f"tweetResult.result keys: {list(r.keys())}")
                    if 'legacy' in r:
                        print(f"  legacy.full_text: {r['legacy'].get('full_text', 'N/A')[:100]}")
            
            if 'threaded_conversation_with_injections_v2' in d:
                tc = d['threaded_conversation_with_injections_v2']
                print(f"threaded_conversation keys: {list(tc.keys())}")
                if 'instructions' in tc:
                    for i, inst in enumerate(tc['instructions']):
                        print(f"  instruction[{i}] type: {inst.get('type')}")
                        if inst.get('type') == 'TimelineAddEntries':
                            entries = inst.get('entries', [])
                            print(f"    entries count: {len(entries)}")
                            for j, entry in enumerate(entries[:3]):
                                eid = entry.get('entryId', '')
                                print(f"    entry[{j}]: {eid[:50]}...")
                                content = entry.get('content', {})
                                print(f"      content keys: {list(content.keys())}")


if __name__ == '__main__':
    asyncio.run(main())
