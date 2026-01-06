#!/usr/bin/env python3
"""
TidyFeed Bot - Cookie Refresher

Upload fresh X/Twitter cookies to the bot worker on Fly.io.

Usage:
    1. Export cookies from browser as JSON (use EditThisCookie extension)
    2. Save as cookies.json in this directory
    3. Run: python refresh_cookies.py

Or provide the cookies file path:
    python refresh_cookies.py /path/to/cookies.json
"""

import os
import sys
import json
import subprocess
from pathlib import Path

# Configuration
FLY_APP_NAME = os.environ.get('FLY_APP_NAME', 'tidyfeed-bot-worker')
REMOTE_PATH = '/data/cookies.json'


def get_fly_app_name():
    """Get the Fly app name from fly.toml or environment."""
    try:
        fly_toml = Path('fly.toml')
        if fly_toml.exists():
            with open(fly_toml) as f:
                for line in f:
                    if 'app = ' in line or "app=" in line:
                        # Extract app name from line like: app = "tidyfeed-bot-worker"
                        name = line.split('=')[1].strip().strip('"').strip("'")
                        if name and not name.startswith('#'):
                            return name
    except Exception:
        pass
    return FLY_APP_NAME


def verify_cookies(cookies_path: Path) -> bool:
    """Verify the cookies file contains required Twitter cookies."""
    try:
        with open(cookies_path) as f:
            cookies = json.load(f)

        # Support both formats: JSON array (EditThisCookie) or dict (key-value)
        if isinstance(cookies, dict):
            # Key-value format: {"auth_token": "...", "ct0": "..."}
            cookie_names = set(cookies.keys())
            essential = ['auth_token', 'ct0']
            found = [e for e in essential if e in cookie_names]
            if len(found) < 2:
                print(f'⚠️ Warning: Missing essential cookies. Found: {found}')
                print(f'   Expected: {essential}')
            print(f'✅ Found {len(cookies)} cookies for x.com (key-value format)')
            return True
        elif isinstance(cookies, list):
            # JSON array format: [{"name": "auth_token", "value": "..."}, ...]
            cookie_names = {c.get('name', '') for c in cookies}
            essential = ['auth_token', 'ct0']
            found = [e for e in essential if e in cookie_names]
            if len(found) < 2:
                print(f'⚠️ Warning: Missing essential cookies. Found: {found}')
                print(f'   Expected: {essential}')
            print(f'✅ Found {len(cookies)} cookies for x.com (JSON array format)')
            return True
        else:
            print('❌ Invalid format: cookies must be a JSON object or array')
            return False

    except json.JSONDecodeError:
        print('❌ Invalid JSON format')
        return False
    except Exception as e:
        print(f'❌ Error reading cookies: {e}')
        return False


def upload_cookies(cookies_path: Path, app_name: str):
    """Upload cookies to Fly.io server."""
    print(f'\n🚀 Uploading cookies to Fly.io app: {app_name}')

    # Method 1: Using pipe (most reliable)
    try:
        with open(cookies_path, 'rb') as f:
            cookies_data = f.read()

        # Use fly ssh with cat command
        cmd = [
            'fly', 'ssh', 'sftp', 'shell',
            '-a', app_name,
            f'cat > {REMOTE_PATH}'
        ]

        result = subprocess.run(
            cmd,
            input=cookies_data,
            capture_output=True
        )

        if result.returncode == 0:
            print('✅ Cookies uploaded successfully!')

            # Verify the upload
            verify_cmd = ['fly', 'ssh', '-a', app_name, 'wc', '-c', REMOTE_PATH]
            verify_result = subprocess.run(verify_cmd, capture_output=True, text=True)
            if verify_result.returncode == 0:
                size = verify_result.stdout.strip().split()[0]
                print(f'   Uploaded file size: {size} bytes')

            print('\n📝 Next steps:')
            print('   1. Check bot logs: fly logs -a tidyfeed-bot-worker')
            print('   2. Bot should pick up new cookies automatically')
            return True
        else:
            print(f'❌ Upload failed: {result.stderr.decode()}')
            return False

    except FileNotFoundError:
        print('❌ "fly" CLI not found. Install it first:')
        print('   curl -L https://fly.io/install.sh | sh')
        return False
    except Exception as e:
        print(f'❌ Upload error: {e}')
        return False


def main():
    print('=' * 60)
    print('🍪 TidyFeed Bot - Cookie Refresher')
    print('=' * 60)

    # Get cookies file path
    if len(sys.argv) > 1:
        cookies_path = Path(sys.argv[1])
    else:
        cookies_path = Path('cookies.json')

    if not cookies_path.exists():
        print(f'\n❌ Cookies file not found: {cookies_path}')
        print('\n📖 How to get cookies:')
        print('   1. Install "EditThisCookie" extension in your browser')
        print('   2. Log into https://x.com as @tidyfeedapp')
        print('   3. Click the extension → Export → JSON')
        print('   4. Save as cookies.json in this directory')
        print('\n💡 Tip: You can also specify a custom path:')
        print('   python refresh_cookies.py /path/to/your/cookies.json')
        sys.exit(1)

    print(f'\n📂 Found cookies file: {cookies_path}')

    # Verify cookies format
    if not verify_cookies(cookies_path):
        sys.exit(1)

    # Get Fly app name
    app_name = get_fly_app_name()
    print(f'\n🎯 Target app: {app_name}')

    # Confirm upload
    response = input('\nProceed with upload? (y/N): ').strip().lower()
    if response != 'y':
        print('❌ Cancelled')
        sys.exit(0)

    # Upload
    if upload_cookies(cookies_path, app_name):
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == '__main__':
    main()
