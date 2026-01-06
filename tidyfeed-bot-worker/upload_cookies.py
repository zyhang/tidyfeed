#!/usr/bin/env python3
"""
Upload cookies to Fly.io using base64 encoding.
"""

import subprocess
import base64
import json
import sys
from pathlib import Path

COOKIES_FILE = 'cookies.json'
APP_NAME = 'tidyfeed-bot-worker'
REMOTE_PATH = '/data/cookies.json'

# Read and encode cookies
with open(COOKIES_FILE) as f:
    cookies_data = f.read()
    encoded = base64.b64encode(cookies_data.encode()).decode()

print(f"📂 Uploading {COOKIES_FILE} to {APP_NAME}...")
print(f"   Size: {len(cookies_data)} bytes")

# Create command to decode and write
# We use printf to avoid issues with echo interpretation
cmd = f"printf '%s' '{encoded}' | base64 -d > {REMOTE_PATH}"

# Run via fly ssh
result = subprocess.run(
    ['fly', 'ssh', '-a', APP_NAME, 'console', '-C', cmd],
    capture_output=True,
    text=True
)

if result.returncode == 0:
    print("✅ Upload successful!")

    # Verify
    verify_cmd = f"wc -c {REMOTE_PATH}"
    verify_result = subprocess.run(
        ['fly', 'ssh', '-a', APP_NAME, 'console', '-C', verify_cmd],
        capture_output=True,
        text=True
    )
    if verify_result.returncode == 0:
        print(f"   File on server: {verify_result.stdout.strip()}")
else:
    print(f"❌ Upload failed: {result.stderr}")
    sys.exit(1)
