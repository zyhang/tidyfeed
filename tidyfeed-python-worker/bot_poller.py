"""
TidyFeed Twitter Bot Poller

Monitors Twitter notifications for @tidyfeedapp mentions.
When users reply to a tweet with trigger words (save/keep/收藏),
the target tweet is saved to their TidyFeed account.

Uses twikit for async Twitter API access.
"""

import os
import sys
import json
import asyncio
import logging
from pathlib import Path
from typing import Optional, Dict, Any, List

# Load .env file for local development
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] [Bot] %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# ============================================
# Configuration
# ============================================

API_BASE_URL = os.environ.get('API_BASE_URL', 'https://api.tidyfeed.app')
INTERNAL_SERVICE_KEY = os.environ.get('INTERNAL_SERVICE_KEY', '')

# Bot credentials
BOT_USERNAME = os.environ.get('BOT_USERNAME', '')
BOT_EMAIL = os.environ.get('BOT_EMAIL', '')
BOT_PASSWORD = os.environ.get('BOT_PASSWORD', '')
BOT_COOKIES_JSON = os.environ.get('BOT_COOKIES_JSON', '')

# Polling settings
POLL_INTERVAL_SECONDS = int(os.environ.get('BOT_POLL_INTERVAL', '60'))

# File paths
COOKIES_FILE = Path('/tmp/twikit_cookies.json')
STATE_FILE = Path('/tmp/bot_state.json')

# Trigger words that activate the save command
TRIGGER_WORDS = ['save', 'keep', '收藏', '保存', 'bookmark']


# ============================================
# State Management
# ============================================

def load_state() -> Dict[str, Any]:
    """Load bot state from file."""
    if STATE_FILE.exists():
        try:
            with open(STATE_FILE, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f'Failed to load state: {e}')
    return {'processed_ids': [], 'last_processed_id': None}


def save_state(state: Dict[str, Any]):
    """Save bot state to file."""
    try:
        # Keep only last 1000 processed IDs to prevent unbounded growth
        if len(state.get('processed_ids', [])) > 1000:
            state['processed_ids'] = state['processed_ids'][-500:]
        
        with open(STATE_FILE, 'w') as f:
            json.dump(state, f)
    except Exception as e:
        logger.warning(f'Failed to save state: {e}')


def is_processed(state: Dict[str, Any], notification_id: str) -> bool:
    """Check if a notification has already been processed."""
    return notification_id in state.get('processed_ids', [])


def mark_processed(state: Dict[str, Any], notification_id: str):
    """Mark a notification as processed."""
    if 'processed_ids' not in state:
        state['processed_ids'] = []
    state['processed_ids'].append(notification_id)
    state['last_processed_id'] = notification_id


# ============================================
# Notification Processing
# ============================================

def contains_trigger_word(text: str) -> bool:
    """Check if text contains any trigger word."""
    text_lower = text.lower()
    return any(trigger in text_lower for trigger in TRIGGER_WORDS)


def extract_command_payload(notification, tweet) -> Optional[Dict[str, Any]]:
    """
    Extract the command payload from a notification.
    
    Returns:
        {
            "commander_handle": "@username",
            "commander_id": "123456",
            "target_tweet_id": "789012",
            "target_url": "https://x.com/...",
            "notification_id": "...",
            "command_text": "..."
        }
    """
    try:
        # The user who sent the command (mentioned us)
        commander = tweet.user
        if not commander:
            logger.debug('No user found in tweet')
            return None
        
        commander_handle = getattr(commander, 'screen_name', None) or getattr(commander, 'username', None)
        commander_id = getattr(commander, 'id', None) or getattr(commander, 'rest_id', None)
        
        if not commander_handle or not commander_id:
            logger.debug('Could not extract commander info')
            return None
        
        # The tweet being replied to (the target to save)
        # This is the tweet the commander is replying to while mentioning us
        in_reply_to_id = getattr(tweet, 'in_reply_to_status_id', None) or \
                         getattr(tweet, 'in_reply_to_tweet_id', None) or \
                         getattr(tweet, 'reply_to', [None])[0] if hasattr(tweet, 'reply_to') else None
        
        if not in_reply_to_id:
            # Direct mention, not a reply - skip for now
            logger.debug(f'Mention from @{commander_handle} is not a reply, skipping')
            return None
        
        # Build target URL
        # We don't know the target author's handle yet, but we can use the tweet ID
        # The backend can resolve the full URL if needed
        target_tweet_id = str(in_reply_to_id)
        
        return {
            'commander_handle': commander_handle,
            'commander_id': str(commander_id),
            'target_tweet_id': target_tweet_id,
            'target_url': f'https://x.com/i/status/{target_tweet_id}',
            'notification_id': getattr(notification, 'id', str(tweet.id)),
            'command_text': getattr(tweet, 'text', '') or getattr(tweet, 'full_text', '')
        }
        
    except Exception as e:
        logger.error(f'Error extracting command payload: {e}')
        return None


async def handle_save_command(payload: Dict[str, Any]) -> bool:
    """
    Handle a save command by calling the backend API.
    
    This function will be expanded to actually save the tweet.
    For now, it just logs the payload.
    """
    logger.info(f"📥 Save command received:")
    logger.info(f"   Commander: @{payload['commander_handle']} (ID: {payload['commander_id']})")
    logger.info(f"   Target: {payload['target_url']}")
    logger.info(f"   Command: {payload['command_text'][:50]}...")
    
    # TODO: Implement backend API call
    # This will be implemented in the next step
    # 
    # import requests
    # response = requests.post(
    #     f'{API_BASE_URL}/api/bot/save-thread',
    #     headers={'X-Service-Key': INTERNAL_SERVICE_KEY},
    #     json=payload
    # )
    # return response.ok
    
    return True


# ============================================
# Bot Client
# ============================================

class TidyFeedBot:
    """Twitter bot that monitors mentions and processes save commands."""
    
    def __init__(self):
        self.client = None
        self._initialized = False
        self.state = load_state()
    
    async def initialize(self) -> bool:
        """Initialize the twikit client and authenticate."""
        if self._initialized:
            return True
        
        try:
            from twikit import Client
            
            self.client = Client('en-US')
            
            # Step 1: Try to load existing cookies
            if await self._load_cookies():
                logger.info('✅ Authenticated using saved cookies')
                self._initialized = True
                return True
            
            # Step 2: Perform fresh login if no valid cookies
            if not BOT_USERNAME or not BOT_PASSWORD:
                logger.error('❌ BOT_USERNAME and BOT_PASSWORD required for login')
                return False
            
            logger.info(f'🔐 Logging in as @{BOT_USERNAME}...')
            
            await self.client.login(
                auth_info_1=BOT_USERNAME,
                auth_info_2=BOT_EMAIL if BOT_EMAIL else BOT_USERNAME,
                password=BOT_PASSWORD
            )
            
            # Save cookies for next time
            await self._save_cookies()
            logger.info('✅ Login successful, cookies saved')
            
            self._initialized = True
            return True
            
        except Exception as e:
            logger.error(f'❌ Failed to initialize bot: {e}')
            import traceback
            traceback.print_exc()
            return False
    
    async def _load_cookies(self) -> bool:
        """Load and validate cookies from env or file."""
        try:
            # Priority 1: Environment variable (for container deployments)
            if BOT_COOKIES_JSON:
                logger.debug('Trying cookies from BOT_COOKIES_JSON...')
                cookies = json.loads(BOT_COOKIES_JSON)
                self.client.set_cookies(cookies)
                
                # Verify cookies work by making a simple API call
                user = await self.client.user()
                logger.info(f'Loaded cookies for @{user.screen_name}')
                return True
            
            # Priority 2: Local file
            if COOKIES_FILE.exists():
                logger.debug(f'Trying cookies from {COOKIES_FILE}...')
                self.client.load_cookies(str(COOKIES_FILE))
                
                # Verify cookies work
                user = await self.client.user()
                logger.info(f'Loaded cookies for @{user.screen_name}')
                return True
            
            return False
            
        except Exception as e:
            logger.warning(f'Cookie validation failed: {e}')
            return False
    
    async def _save_cookies(self):
        """Save cookies to file for persistence."""
        try:
            self.client.save_cookies(str(COOKIES_FILE))
            logger.debug(f'Cookies saved to {COOKIES_FILE}')
        except Exception as e:
            logger.warning(f'Failed to save cookies: {e}')
    
    async def poll_notifications(self):
        """Poll for new notifications and process save commands."""
        if not self._initialized:
            if not await self.initialize():
                logger.warning('Skipping poll - bot not initialized')
                return
        
        try:
            logger.debug('🔍 Checking notifications...')
            
            # Fetch notifications (mentions)
            # twikit's get_notifications returns different types
            notifications = await self.client.get_notifications('mentions')
            
            if not notifications:
                logger.debug('No notifications')
                return
            
            processed_count = 0
            
            for notification in notifications:
                result = await self._process_notification(notification)
                if result:
                    processed_count += 1
            
            # Save state after processing
            save_state(self.state)
            
            if processed_count > 0:
                logger.info(f'✅ Processed {processed_count} new command(s)')
                
        except Exception as e:
            logger.error(f'❌ Error polling notifications: {e}')
            import traceback
            traceback.print_exc()
            
            # Reset on auth errors
            if 'Unauthorized' in str(e) or '401' in str(e) or 'Could not authenticate' in str(e):
                logger.warning('Auth error detected, will re-authenticate on next poll')
                self._initialized = False
    
    async def _process_notification(self, notification) -> bool:
        """
        Process a single notification.
        Returns True if a command was processed.
        """
        try:
            # Get notification ID for deduplication
            notification_id = str(getattr(notification, 'id', ''))
            
            # Extract tweet from notification
            tweet = getattr(notification, 'tweet', None)
            if not tweet:
                # Try alternative attribute names
                tweet = getattr(notification, 'target_tweet', None) or \
                        getattr(notification, 'status', None)
            
            if not tweet:
                return False
            
            # Use tweet ID as fallback for notification ID
            if not notification_id:
                notification_id = str(getattr(tweet, 'id', ''))
            
            if not notification_id:
                return False
            
            # Skip if already processed
            if is_processed(self.state, notification_id):
                return False
            
            # Get tweet text
            text = getattr(tweet, 'text', '') or getattr(tweet, 'full_text', '')
            
            # Check for trigger words
            if not contains_trigger_word(text):
                # Not a save command, mark as processed and skip
                mark_processed(self.state, notification_id)
                return False
            
            # Extract command payload
            payload = extract_command_payload(notification, tweet)
            
            if not payload:
                mark_processed(self.state, notification_id)
                return False
            
            # Handle the save command
            success = await handle_save_command(payload)
            
            # Mark as processed regardless of success
            # (to avoid repeated processing of failed commands)
            mark_processed(self.state, notification_id)
            
            return success
            
        except Exception as e:
            logger.error(f'Error processing notification: {e}')
            return False


# ============================================
# Main Loop
# ============================================

async def run_bot_loop():
    """Main bot polling loop."""
    logger.info('=' * 50)
    logger.info('🤖 TidyFeed Twitter Bot Poller')
    logger.info(f'   API: {API_BASE_URL}')
    logger.info(f'   Poll interval: {POLL_INTERVAL_SECONDS}s')
    logger.info(f'   Triggers: {TRIGGER_WORDS}')
    logger.info('=' * 50)
    
    if not BOT_USERNAME:
        logger.error('❌ BOT_USERNAME not set - bot cannot start')
        return
    
    bot = TidyFeedBot()
    
    # Initial authentication
    if not await bot.initialize():
        logger.error('❌ Failed to initialize bot, exiting')
        return
    
    logger.info('🚀 Bot started, polling for mentions...')
    
    while True:
        try:
            await bot.poll_notifications()
        except Exception as e:
            logger.error(f'❌ Bot loop error: {e}')
        
        await asyncio.sleep(POLL_INTERVAL_SECONDS)


def start_bot():
    """Entry point to start the bot in an async loop."""
    try:
        asyncio.run(run_bot_loop())
    except KeyboardInterrupt:
        logger.info('Bot stopped by user')


if __name__ == '__main__':
    start_bot()
