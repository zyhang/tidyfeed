#!/usr/bin/env python3
"""
Debug: Watch what twikit actually returns from get_notifications
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
    print("Debugging twikit get_notifications...\n")
    
    from twikit import Client
    
    client = Client('en-US')
    client.load_cookies(BOT_COOKIES_PATH)
    
    print("Calling get_notifications('mentions')...")
    
    try:
        result = await client.get_notifications('mentions')
        
        print(f"\nResult type: {type(result)}")
        print(f"Result len: {len(result) if result else 0}")
        print(f"Result repr: {repr(result)[:500]}")
        
        # Check if result is iterable
        if result:
            print(f"\nIterating through results:")
            for i, item in enumerate(result):
                print(f"\n--- Item {i} ---")
                print(f"Type: {type(item).__name__}")
                
                # Print all attributes
                for attr in ['id', 'tweet', 'message', 'from_user', 'timestamp_ms', 'action']:
                    val = getattr(item, attr, 'N/A')
                    if val != 'N/A':
                        print(f"  {attr}: {str(val)[:100]}")
                
                if i >= 5:
                    print(f"... and {len(result) - 5} more")
                    break
        else:
            print("\nResult is empty!")
            
            # Try to understand the raw response
            print("\nTrying to get raw notifications...")
            
            # Check what methods are available
            print(f"\nClient methods containing 'notif': {[m for m in dir(client) if 'notif' in m.lower()]}")
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    asyncio.run(main())
