#!/usr/bin/env python3
"""
TidyFeed Bot Worker

Monitors Twitter notifications for @tidyfeedapp mentions.
When users reply to a tweet with trigger words (save/keep/收藏/tidy),
the target tweet is saved to their TidyFeed account.

IMPORTANT: This bot manually parses the raw API response because
twikit's get_notifications() parsing is broken for mentions.
"""

import os
import sys
import json
import asyncio
import logging
import random
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any, Set

import requests

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


# ============================================
# Backend API
# ============================================

def call_bot_save(handle: str, tweet_url: str, mention_id: str = None,
                  tweet_text: str = None, media_urls: list = None,
                  author_handle: str = None, author_name: str = None) -> Dict[str, Any]:
    """
    Call backend API to save tweet. Backend handles deduplication via mention_id.
    """
    try:
        payload = {
            'handle': handle,
            'tweet_url': tweet_url,
            'mention_id': mention_id,  # Backend uses this for deduplication
            'tweet_text': tweet_text,
            'media_urls': media_urls or [],
            'author_handle': author_handle,
            'author_name': author_name
        }
        response = requests.post(
            f'{API_BASE_URL}/api/internal/bot-save',
            headers={'Content-Type': 'application/json', 'X-Service-Key': INTERNAL_SERVICE_KEY},
            json=payload,
            timeout=30
        )
        if response.ok:
            return response.json()
        else:
            logger.error(f'Backend error: {response.status_code} - {response.text[:200]}')
            return {'success': False, 'error': f'HTTP {response.status_code}'}
    except Exception as e:
        logger.error(f'Backend request failed: {e}')
        return {'success': False, 'error': str(e)}


# ============================================
# Tweet Parsing
# ============================================

def contains_trigger(text: str) -> bool:
    if not text:
        return False
    text_lower = text.lower()
    return any(t in text_lower for t in TRIGGER_WORDS)


def parse_mentions_response(data: Dict) -> list:
    """
    Parse raw mentions.json response from X API.
    Returns list of mention tweets with user info.
    """
    mentions = []
    
    try:
        global_objects = data.get('globalObjects', {})
        tweets = global_objects.get('tweets', {})
        users = global_objects.get('users', {})
        
        for tweet_id, tweet in tweets.items():
            user_id = tweet.get('user_id_str')
            user = users.get(user_id, {})
            
            mentions.append({
                'id': tweet_id,
                'text': tweet.get('full_text', ''),
                'user_handle': user.get('screen_name', ''),
                'user_name': user.get('name', ''),
                'in_reply_to_status_id': tweet.get('in_reply_to_status_id_str'),
                'created_at': tweet.get('created_at')
            })
    except Exception as e:
        logger.error(f'Error parsing mentions: {e}')
    
    return mentions


# ============================================
# Bot Client
# ============================================

class TidyFeedBot:
    def __init__(self):
        self.client = None
        self._authenticated = False
    
    async def initialize(self) -> bool:
        try:
            from twikit import Client
            
            self.client = Client('en-US')
            cookies_path = Path(BOT_COOKIES_PATH)
            
            if not cookies_path.exists():
                logger.error(f'❌ Cookies not found: {BOT_COOKIES_PATH}')
                return False
            
            logger.info(f'🔐 Loading cookies from {BOT_COOKIES_PATH}...')
            self.client.load_cookies(str(cookies_path))
            logger.info('✅ Cookies loaded')
            
            self._authenticated = True
            return True
            
        except Exception as e:
            logger.error(f'❌ Failed to initialize: {e}')
            return False
    
    async def fetch_mentions_raw(self) -> list:
        """
        Fetch mentions by intercepting twikit's internal HTTP request.
        
        We call get_notifications() which triggers proper initialization,
        but we patch the client to capture the raw response for parsing.
        """
        try:
            import twikit.client.client as client_module
            
            # Patch to capture raw response
            captured_data = {}
            original_request = client_module.Client.request
            
            async def patched_request(self_client, method, url, **kwargs):
                result = await original_request(self_client, method, url, **kwargs)
                if 'mentions' in str(url):
                    captured_data['response'] = result[0] if result else None
                return result
            
            client_module.Client.request = patched_request
            
            try:
                # This triggers initialization and makes the actual request
                await self.client.get_notifications('mentions')
            finally:
                # Restore original method
                client_module.Client.request = original_request
            
            if 'response' in captured_data and captured_data['response']:
                return parse_mentions_response(captured_data['response'])
            return []
            
        except Exception as e:
            logger.error(f'Error fetching mentions: {e}')
            return []
    
    async def poll_once(self) -> int:
        if not self._authenticated:
            return 0
        
        try:
            logger.debug('🔍 Fetching mentions...')
            mentions = await self.fetch_mentions_raw()
            
            if not mentions:
                logger.debug('No mentions found')
                return 0
            
            logger.info(f'📬 Found {len(mentions)} mention(s)')
            
            processed = 0
            for mention in mentions:
                if await self._process_mention(mention):
                    processed += 1
            
            return processed
            
        except Exception as e:
            logger.error(f'❌ Poll error: {e}')
            import traceback
            traceback.print_exc()
            return 0
    
    async def _process_mention(self, mention: Dict) -> bool:
        tweet_id = mention['id']
        text = mention.get('text', '')
        sender = mention.get('user_handle', '')
        reply_to = mention.get('in_reply_to_status_id')
        
        # Debug: log mention details
        logger.info(f'🔍 Checking mention: id={tweet_id}, from=@{sender}')
        logger.info(f'   Text: "{text[:80]}..."')
        logger.info(f'   Reply to: {reply_to}')
        
        # Check for trigger words (skip without marking - no trigger = not our concern)
        if not contains_trigger(text):
            logger.debug(f'   ⏭️ Skipped: no trigger word found')
            return False
        
        # Must be a reply to another tweet (skip without marking)
        if not reply_to:
            logger.debug(f'   ⏭️ Skipped: not a reply')
            return False
        
        logger.info(f'📥 Save command from @{sender}')
        logger.info(f'   Target tweet ID: {reply_to}')
        
        # Fetch the TARGET tweet (the one being replied to - this is what we want to save)
        target_tweet = await self._fetch_tweet(reply_to)
        
        if target_tweet:
            target_url = f"https://x.com/{target_tweet.get('author_handle', 'i')}/status/{reply_to}"
            target_text = target_tweet.get('text', '')
            target_author = target_tweet.get('author_handle', '')
            target_author_name = target_tweet.get('author_name', '')
            target_media = target_tweet.get('media_urls', [])
            
            logger.info(f'   Target author: @{target_author}')
            logger.info(f'   Target text: "{target_text[:60]}..."')
        else:
            # Fallback if we can't fetch the tweet
            target_url = f'https://x.com/i/status/{reply_to}'
            target_text = None
            target_author = None
            target_author_name = None
            target_media = []
            logger.warning(f'   ⚠️ Could not fetch target tweet, saving URL only')
        
        # Call backend API with target tweet info (backend handles deduplication)
        result = call_bot_save(
            handle=sender,
            tweet_url=target_url,
            mention_id=tweet_id,  # Backend marks as processed
            tweet_text=target_text,
            media_urls=target_media,
            author_handle=target_author,
            author_name=target_author_name
        )
        
        if result.get('success'):
            if result.get('already_processed'):
                logger.info(f'   ⏭️ Skipped: already processed')
                return False
            
            if result.get('user_found'):
                if result.get('saved'):
                    logger.info(f'✅ Saved for @{sender}')
                elif result.get('already_saved'):
                    logger.info(f'ℹ️ Already saved for @{sender}')
                
                # Like the tweet to acknowledge
                await self._like_tweet(tweet_id)
                return True
            else:
                logger.info(f'⚠️ @{sender} not linked to TidyFeed')
                return False
        else:
            logger.error(f'❌ Backend error: {result.get("error", "unknown")}')
            return False
    
    async def _fetch_tweet(self, tweet_id: str) -> Optional[Dict]:
        """Fetch a tweet by ID by intercepting twikit's raw response."""
        import twikit.client.client as client_module
        
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
            await self.client.get_tweet_by_id(tweet_id)
        except Exception as e:
            # twikit may throw parsing errors, but we have the raw data
            logger.debug(f'twikit error (expected): {e}')
        finally:
            client_module.Client.request = original_request
        
        # Parse our captured data regardless of twikit errors
        if 'response' in captured_data and captured_data['response']:
            try:
                return self._parse_tweet_detail(captured_data['response'], tweet_id)
            except Exception as e:
                logger.warning(f'Failed to parse tweet {tweet_id}: {e}')
        
        return None
    
    def _parse_tweet_detail(self, data: Dict, target_id: str) -> Optional[Dict]:
        """Parse TweetDetail GraphQL response."""
        try:
            # Navigate through threaded_conversation response
            tc = data.get('data', {}).get('threaded_conversation_with_injections_v2', {})
            instructions = tc.get('instructions', [])
            
            for instruction in instructions:
                if instruction.get('type') == 'TimelineAddEntries':
                    entries = instruction.get('entries', [])
                    
                    # The focal tweet is the first entry
                    for entry in entries:
                        entry_id = entry.get('entryId', '')
                        
                        # Check if this is the target tweet entry
                        if f'tweet-{target_id}' in entry_id:
                            content = entry.get('content', {})
                            item_content = content.get('itemContent', {})
                            tweet_results = item_content.get('tweet_results', {})
                            result = tweet_results.get('result', {})
                            
                            if result:
                                return self._extract_tweet_from_result(result)
                    
                    # Fallback: just try the first tweet entry
                    if entries:
                        first_entry = entries[0]
                        content = first_entry.get('content', {})
                        item_content = content.get('itemContent', {})
                        tweet_results = item_content.get('tweet_results', {})
                        result = tweet_results.get('result', {})
                        
                        if result:
                            return self._extract_tweet_from_result(result)
                    break
                    
        except Exception as e:
            logger.warning(f'Failed to parse tweet detail: {e}')
        return None
    
    def _extract_tweet_from_result(self, result: Dict) -> Optional[Dict]:
        """Extract tweet data from a result object."""
        try:
            legacy = result.get('legacy', {})
            core = result.get('core', {})
            user_results = core.get('user_results', {}).get('result', {})
            user_legacy = user_results.get('legacy', {})
            
            # Get media URLs
            media_urls = []
            media_items = legacy.get('extended_entities', {}).get('media', [])
            for m in media_items:
                url = m.get('media_url_https') or m.get('url')
                if url:
                    media_urls.append(url)
            
            return {
                'id': legacy.get('id_str', ''),
                'text': legacy.get('full_text', ''),
                'author_handle': user_legacy.get('screen_name', ''),
                'author_name': user_legacy.get('name', ''),
                'media_urls': media_urls
            }
        except Exception as e:
            logger.warning(f'Failed to extract tweet: {e}')
        return None
    
    async def _like_tweet(self, tweet_id: str):
        try:
            await self.client.favorite_tweet(tweet_id)
            logger.debug(f'❤️ Liked tweet {tweet_id}')
        except Exception as e:
            logger.warning(f'Failed to like tweet: {e}')


# ============================================
# Main Loop
# ============================================

async def run_bot():
    logger.info('=' * 60)
    logger.info('🤖 TidyFeed Bot Worker')
    logger.info(f'   API: {API_BASE_URL}')
    logger.info(f'   Bot: @{BOT_USERNAME}')
    logger.info(f'   Poll interval: {POLL_MIN_SECONDS}-{POLL_MAX_SECONDS}s')
    logger.info(f'   Triggers: {TRIGGER_WORDS}')
    logger.info('=' * 60)
    
    if not INTERNAL_SERVICE_KEY:
        logger.error('❌ INTERNAL_SERVICE_KEY not set')
        sys.exit(1)
    
    # Wait for cookies file (allows time to upload via fly ssh sftp)
    cookies_path = Path(BOT_COOKIES_PATH)
    if not cookies_path.exists():
        logger.warning(f'⏳ Waiting for cookies at {BOT_COOKIES_PATH}...')
        logger.warning('   Upload via: fly ssh sftp shell -> put cookies.json /data/cookies.json')
        while not cookies_path.exists():
            await asyncio.sleep(30)
            logger.info(f'⏳ Still waiting for {BOT_COOKIES_PATH}...')
        logger.info('✅ Cookies file found!')
    
    bot = TidyFeedBot()
    
    if not await bot.initialize():
        logger.error('❌ Failed to initialize bot')
        sys.exit(1)
    
    logger.info('🚀 Bot started, polling for mentions...')
    
    while True:
        try:
            processed = await bot.poll_once()
            
            if processed > 0:
                logger.info(f'✅ Processed {processed} command(s)')
            
            sleep_time = random.randint(POLL_MIN_SECONDS, POLL_MAX_SECONDS)
            logger.debug(f'💤 Sleeping {sleep_time}s')
            await asyncio.sleep(sleep_time)
            
        except KeyboardInterrupt:
            logger.info('👋 Shutting down...')
            bot.state.save()
            break
            
        except Exception as e:
            logger.error(f'❌ Unexpected error: {e}')
            import traceback
            traceback.print_exc()
            await asyncio.sleep(60)


def main():
    try:
        asyncio.run(run_bot())
    except KeyboardInterrupt:
        logger.info('👋 Bot stopped')


if __name__ == '__main__':
    main()
