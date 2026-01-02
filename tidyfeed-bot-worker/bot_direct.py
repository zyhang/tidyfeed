#!/usr/bin/env python3
"""
TidyFeed Bot Worker - Direct X API Version

Uses X's internal API endpoints directly instead of twikit,
which has become unreliable due to Cloudflare blocking.
"""

import os
import sys
import json
import asyncio
import logging
import random
import httpx
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any, List, Set

import requests

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# ============================================
# Configuration
# ============================================

API_BASE_URL = os.environ.get('API_BASE_URL', 'https://api.tidyfeed.app')
INTERNAL_SERVICE_KEY = os.environ.get('INTERNAL_SERVICE_KEY', '')

BOT_USERNAME = os.environ.get('BOT_USERNAME', 'tidyfeedapp')
BOT_COOKIES_PATH = os.environ.get('BOT_COOKIES_PATH', './cookies.json')

POLL_MIN_SECONDS = int(os.environ.get('POLL_MIN_SECONDS', '45'))
POLL_MAX_SECONDS = int(os.environ.get('POLL_MAX_SECONDS', '90'))
ERROR_SLEEP_SECONDS = 300

PROCESSED_IDS_PATH = os.environ.get('PROCESSED_IDS_PATH', './processed_ids.json')
MAX_STORED_IDS = 1000

TRIGGER_WORDS = ['save', 'keep', '收藏', '保存', 'tidy', 'bookmark']

LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL.upper(), logging.INFO),
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# X API Bearer Token (public, same as used by web client)
X_BEARER_TOKEN = 'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA'


# ============================================
# State Management
# ============================================

class StateManager:
    def __init__(self, filepath: str = PROCESSED_IDS_PATH):
        self.filepath = Path(filepath)
        self.processed_ids: Set[str] = set()
        self._load()
    
    def _load(self):
        if self.filepath.exists():
            try:
                with open(self.filepath, 'r') as f:
                    data = json.load(f)
                    self.processed_ids = set(data.get('ids', []))
            except:
                self.processed_ids = set()
    
    def save(self):
        try:
            ids_list = list(self.processed_ids)[-MAX_STORED_IDS:]
            self.processed_ids = set(ids_list)
            with open(self.filepath, 'w') as f:
                json.dump({'ids': ids_list, 'updated_at': datetime.utcnow().isoformat()}, f)
        except Exception as e:
            logger.warning(f'Failed to save state: {e}')
    
    def is_processed(self, id: str) -> bool:
        return id in self.processed_ids
    
    def mark_processed(self, id: str):
        self.processed_ids.add(id)


# ============================================
# Backend API
# ============================================

def call_bot_save(handle: str, tweet_url: str, tweet_text: str = None) -> Dict[str, Any]:
    try:
        response = requests.post(
            f'{API_BASE_URL}/api/internal/bot-save',
            headers={'Content-Type': 'application/json', 'X-Service-Key': INTERNAL_SERVICE_KEY},
            json={'handle': handle, 'tweet_url': tweet_url, 'tweet_text': tweet_text},
            timeout=30
        )
        return response.json() if response.ok else {'success': False, 'error': f'HTTP {response.status_code}'}
    except Exception as e:
        logger.error(f'Backend error: {e}')
        return {'success': False, 'error': str(e)}


# ============================================
# Direct X API Client
# ============================================

class XApiClient:
    """Direct X API client using cookies for authentication."""
    
    def __init__(self, cookies_path: str):
        self.cookies = {}
        self.ct0 = ''
        self.auth_token = ''
        self._load_cookies(cookies_path)
        
        self.http = httpx.AsyncClient(
            headers={
                'Authorization': f'Bearer {X_BEARER_TOKEN}',
                'x-twitter-active-user': 'yes',
                'x-twitter-client-language': 'en',
            },
            timeout=30.0
        )
    
    def _load_cookies(self, path: str):
        with open(path, 'r') as f:
            self.cookies = json.load(f)
        self.auth_token = self.cookies.get('auth_token', '')
        self.ct0 = self.cookies.get('ct0', '')
        logger.info(f'Loaded cookies: auth_token={self.auth_token[:10]}..., ct0={self.ct0[:10]}...')
    
    def _get_headers(self) -> Dict[str, str]:
        return {
            'Authorization': f'Bearer {X_BEARER_TOKEN}',
            'x-csrf-token': self.ct0,
            'x-twitter-active-user': 'yes',
            'cookie': f'auth_token={self.auth_token}; ct0={self.ct0}'
        }
    
    async def search_mentions(self, username: str) -> List[Dict]:
        """
        Search for recent tweets mentioning @username.
        Uses Twitter's search API.
        """
        try:
            query = f'@{username}'
            url = 'https://api.x.com/2/tweets/search/recent'
            
            # Try Twitter API v2 first (may require elevated access)
            # Fallback to internal search endpoint
            
            # Use internal search endpoint (same as web)
            search_url = f'https://x.com/i/api/2/search/adaptive.json'
            params = {
                'q': query,
                'tweet_search_mode': 'live',
                'count': 20,
                'query_source': 'typed_query',
                'pc': 1,
                'spelling_corrections': 1
            }
            
            response = await self.http.get(
                search_url,
                params=params,
                headers=self._get_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                return self._parse_search_results(data)
            else:
                logger.warning(f'Search API returned {response.status_code}')
                return []
                
        except Exception as e:
            logger.error(f'Search error: {e}')
            return []
    
    def _parse_search_results(self, data: Dict) -> List[Dict]:
        """Parse search results from adaptive.json format."""
        tweets = []
        try:
            globalObjects = data.get('globalObjects', {})
            tweets_data = globalObjects.get('tweets', {})
            users_data = globalObjects.get('users', {})
            
            for tweet_id, tweet in tweets_data.items():
                user_id = tweet.get('user_id_str')
                user = users_data.get(user_id, {})
                
                tweets.append({
                    'id': tweet_id,
                    'text': tweet.get('full_text', ''),
                    'user_handle': user.get('screen_name', ''),
                    'user_name': user.get('name', ''),
                    'in_reply_to_status_id': tweet.get('in_reply_to_status_id_str'),
                    'created_at': tweet.get('created_at')
                })
        except Exception as e:
            logger.error(f'Parse error: {e}')
        
        return tweets
    
    async def like_tweet(self, tweet_id: str) -> bool:
        """Like a tweet."""
        try:
            url = 'https://x.com/i/api/1.1/favorites/create.json'
            response = await self.http.post(
                url,
                data={'id': tweet_id},
                headers=self._get_headers()
            )
            return response.status_code == 200
        except Exception as e:
            logger.warning(f'Like failed: {e}')
            return False


# ============================================
# Bot Logic
# ============================================

def contains_trigger(text: str) -> bool:
    text_lower = text.lower()
    return any(t in text_lower for t in TRIGGER_WORDS)


class TidyFeedBot:
    def __init__(self):
        self.client = None
        self.state = StateManager()
    
    async def initialize(self) -> bool:
        try:
            self.client = XApiClient(BOT_COOKIES_PATH)
            return True
        except Exception as e:
            logger.error(f'Init failed: {e}')
            return False
    
    async def poll_once(self) -> int:
        if not self.client:
            return 0
        
        try:
            logger.debug(f'Searching for @{BOT_USERNAME} mentions...')
            tweets = await self.client.search_mentions(BOT_USERNAME)
            
            if not tweets:
                logger.debug('No results from search')
                return 0
            
            logger.info(f'Found {len(tweets)} tweets mentioning @{BOT_USERNAME}')
            
            processed = 0
            for tweet in tweets:
                if await self._process_tweet(tweet):
                    processed += 1
            
            self.state.save()
            return processed
            
        except Exception as e:
            logger.error(f'Poll error: {e}')
            return 0
    
    async def _process_tweet(self, tweet: Dict) -> bool:
        tweet_id = tweet['id']
        
        if self.state.is_processed(tweet_id):
            return False
        
        text = tweet.get('text', '')
        sender = tweet.get('user_handle', '')
        reply_to = tweet.get('in_reply_to_status_id')
        
        if not contains_trigger(text):
            self.state.mark_processed(tweet_id)
            return False
        
        if not reply_to:
            logger.debug(f'@{sender} mention is not a reply, skipping')
            self.state.mark_processed(tweet_id)
            return False
        
        target_url = f'https://x.com/i/status/{reply_to}'
        
        logger.info(f'📥 Save command from @{sender}')
        logger.info(f'   Target: {target_url}')
        logger.info(f'   Text: "{text[:50]}..."')
        
        result = call_bot_save(sender, target_url, text)
        self.state.mark_processed(tweet_id)
        
        if result.get('success') and result.get('user_found'):
            logger.info(f'✅ Saved for @{sender}')
            await self.client.like_tweet(tweet_id)
            return True
        elif result.get('success'):
            logger.info(f'⚠️ @{sender} not linked to TidyFeed')
        else:
            logger.error(f'❌ Backend error: {result.get("error")}')
        
        return False


# ============================================
# Main
# ============================================

async def run_bot():
    logger.info('=' * 60)
    logger.info('🤖 TidyFeed Bot Worker (Direct API)')
    logger.info(f'   API: {API_BASE_URL}')
    logger.info(f'   Bot: @{BOT_USERNAME}')
    logger.info(f'   Triggers: {TRIGGER_WORDS}')
    logger.info('=' * 60)
    
    if not INTERNAL_SERVICE_KEY:
        logger.error('❌ INTERNAL_SERVICE_KEY not set')
        sys.exit(1)
    
    if not Path(BOT_COOKIES_PATH).exists():
        logger.error(f'❌ Cookies not found: {BOT_COOKIES_PATH}')
        sys.exit(1)
    
    bot = TidyFeedBot()
    if not await bot.initialize():
        sys.exit(1)
    
    logger.info('🚀 Bot started')
    
    while True:
        try:
            processed = await bot.poll_once()
            if processed > 0:
                logger.info(f'✅ Processed {processed} command(s)')
            
            sleep_time = random.randint(POLL_MIN_SECONDS, POLL_MAX_SECONDS)
            logger.debug(f'💤 Sleeping {sleep_time}s')
            await asyncio.sleep(sleep_time)
            
        except KeyboardInterrupt:
            logger.info('👋 Shutting down')
            break
        except Exception as e:
            logger.error(f'❌ Error: {e}')
            await asyncio.sleep(60)


def main():
    try:
        asyncio.run(run_bot())
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()
