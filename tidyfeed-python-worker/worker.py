"""
TidyFeed Cloud Video Downloader Worker

This worker polls the backend API for pending download tasks,
downloads videos using yt-dlp with the user's Twitter cookies,
uploads them to Cloudflare R2, and cleans up.

SECURITY: Cookies are only held temporarily during download,
then wiped from the database upon task completion.
"""

import os
import sys
import time
import tempfile
import subprocess
import logging
import requests
from pathlib import Path

# Load .env file for local development
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv not installed, use environment variables directly

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# Environment variables
API_BASE_URL = os.environ.get('API_BASE_URL', 'https://api.tidyfeed.app')
INTERNAL_SERVICE_KEY = os.environ.get('INTERNAL_SERVICE_KEY', '')
POLL_INTERVAL = int(os.environ.get('POLL_INTERVAL', '5'))

# R2 configuration (S3-compatible)
R2_ACCOUNT_ID = os.environ.get('R2_ACCOUNT_ID', '')
R2_ACCESS_KEY_ID = os.environ.get('R2_ACCESS_KEY_ID', '')
R2_SECRET_ACCESS_KEY = os.environ.get('R2_SECRET_ACCESS_KEY', '')
R2_BUCKET_NAME = os.environ.get('R2_BUCKET_NAME', 'tidyfeed-media')

if not INTERNAL_SERVICE_KEY:
    logger.error('INTERNAL_SERVICE_KEY environment variable is required')
    sys.exit(1)

HEADERS = {
    'Content-Type': 'application/json',
    'X-Service-Key': INTERNAL_SERVICE_KEY
}


def get_next_task():
    """Poll for the next pending download task."""
    try:
        response = requests.get(
            f'{API_BASE_URL}/api/downloads/internal/next-task',
            headers=HEADERS,
            timeout=30
        )
        response.raise_for_status()
        data = response.json()
        return data.get('task')
    except requests.RequestException as e:
        logger.error(f'Failed to get next task: {e}')
        return None


def get_upload_info(task_id: int, filename: str):
    """Get R2 upload information from backend."""
    try:
        response = requests.put(
            f'{API_BASE_URL}/api/downloads/internal/upload-url',
            headers=HEADERS,
            json={'task_id': task_id, 'filename': filename},
            timeout=30
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        logger.error(f'Failed to get upload URL: {e}')
        return None


def complete_task(task_id: int, status: str, r2_key: str = None, 
                  metadata: dict = None, error_message: str = None):
    """Mark task as completed and trigger cookie deletion."""
    try:
        payload = {
            'task_id': task_id,
            'status': status,
            'r2_key': r2_key,
            'metadata': metadata,
            'error_message': error_message
        }
        response = requests.post(
            f'{API_BASE_URL}/api/downloads/internal/complete',
            headers=HEADERS,
            json=payload,
            timeout=30
        )
        response.raise_for_status()
        logger.info(f'Task {task_id} marked as {status}, cookies wiped')
        return True
    except requests.RequestException as e:
        logger.error(f'Failed to complete task: {e}')
        return False


def upload_to_r2(file_path: str, r2_key: str) -> bool:
    """Upload file to Cloudflare R2 using S3-compatible API."""
    try:
        import boto3
        from botocore.config import Config
        
        s3 = boto3.client(
            's3',
            endpoint_url=f'https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com',
            aws_access_key_id=R2_ACCESS_KEY_ID,
            aws_secret_access_key=R2_SECRET_ACCESS_KEY,
            config=Config(signature_version='s3v4'),
            region_name='auto'
        )
        
        s3.upload_file(file_path, R2_BUCKET_NAME, r2_key)
        logger.info(f'Uploaded to R2: {r2_key}')
        return True
    except Exception as e:
        logger.error(f'R2 upload failed: {e}')
        return False


def download_video(tweet_url: str, cookies_string: str, output_dir: str) -> tuple:
    """
    Download video using yt-dlp with the provided cookies.
    Returns (success, file_path, metadata, error_message)
    """
    cookies_file = None
    downloaded_file = None
    
    try:
        # Create temporary cookies file in Netscape format
        cookies_file = os.path.join(output_dir, 'cookies.txt')
        write_cookies_file(cookies_file, cookies_string)
        
        # Prepare yt-dlp command
        output_template = os.path.join(output_dir, '%(id)s.%(ext)s')
        
        cmd = [
            'yt-dlp',
            '--cookies', cookies_file,
            '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            '--merge-output-format', 'mp4',
            '-o', output_template,
            '--no-playlist',
            '--print', 'after_move:filepath',  # Line 1: filepath
            '--print', 'title',                 # Line 2: title
            '--print', 'duration',              # Line 3: duration
            tweet_url
        ]
        
        logger.info(f'Running yt-dlp for: {tweet_url}')
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        
        # Debug: log full output
        logger.info(f'yt-dlp stdout: {result.stdout[:500] if result.stdout else "empty"}')
        if result.stderr:
            logger.warning(f'yt-dlp stderr: {result.stderr[:500]}')
        
        if result.returncode != 0:
            error_msg = result.stderr or 'Unknown yt-dlp error'
            logger.error(f'yt-dlp failed with code {result.returncode}: {error_msg}')
            return False, None, None, error_msg[:500]
        
        # Parse output (filepath, title, duration are printed on separate lines)
        output_lines = result.stdout.strip().split('\n') if result.stdout else []
        logger.info(f'Output lines: {output_lines}')
        
        # Find the downloaded file - look for .mp4 file in temp directory
        if len(output_lines) >= 1 and output_lines[0]:
            downloaded_file = output_lines[0]
            
            # Build metadata
            metadata = {
                'title': output_lines[1] if len(output_lines) > 1 else None,
                'duration': output_lines[2] if len(output_lines) > 2 else None,
                'source_url': tweet_url
            }
            
            if os.path.exists(downloaded_file):
                logger.info(f'Downloaded: {downloaded_file}')
                return True, downloaded_file, metadata, None
            else:
                logger.error(f'File not found at: {downloaded_file}')
        
        # Fallback: scan directory for mp4 files
        for f in os.listdir(output_dir):
            if f.endswith('.mp4'):
                found_file = os.path.join(output_dir, f)
                logger.info(f'Found file via directory scan: {found_file}')
                return True, found_file, {'source_url': tweet_url}, None
        
        return False, None, None, f'No file downloaded. stdout: {result.stdout[:200] if result.stdout else "empty"}'
        
    except subprocess.TimeoutExpired:
        return False, None, None, 'Download timed out (5 min limit)'
    except Exception as e:
        return False, None, None, str(e)[:500]
    finally:
        # Always clean up cookies file
        if cookies_file and os.path.exists(cookies_file):
            os.remove(cookies_file)
            logger.debug('Cleaned up cookies file')


def write_cookies_file(filepath: str, cookies_string: str):
    """
    Write cookies in Netscape format for yt-dlp.
    Input format: "auth_token=xxx; ct0=yyy"
    """
    with open(filepath, 'w') as f:
        f.write('# Netscape HTTP Cookie File\n')
        f.write('# https://curl.haxx.se/rfc/cookie_spec.html\n\n')
        
        # Parse cookie string
        for cookie in cookies_string.split(';'):
            cookie = cookie.strip()
            if '=' in cookie:
                name, value = cookie.split('=', 1)
                # Format: domain, flag, path, secure, expiry, name, value
                f.write(f'.x.com\tTRUE\t/\tTRUE\t0\t{name}\t{value}\n')
                # Also add twitter.com domain
                f.write(f'.twitter.com\tTRUE\t/\tTRUE\t0\t{name}\t{value}\n')


def process_task(task: dict):
    """Process a single download task."""
    task_id = task['id']
    tweet_url = task['tweet_url']
    cookies_string = task.get('cookies')
    user_id = task['user_id']
    
    logger.info(f'Processing task {task_id}: {tweet_url}')
    
    # Check if cookies exist (they might have been wiped if task was retried)
    if not cookies_string:
        logger.error(f'Task {task_id}: No cookies available (already wiped?)')
        complete_task(task_id, 'failed', error_message='Cookies not available')
        return
    
    with tempfile.TemporaryDirectory() as temp_dir:
        # Step 1: Download video
        success, file_path, metadata, error_msg = download_video(
            tweet_url, cookies_string, temp_dir
        )
        
        if not success:
            logger.error(f'Task {task_id} failed: {error_msg}')
            complete_task(task_id, 'failed', error_message=error_msg)
            return
        
        # Step 2: Get upload destination
        filename = os.path.basename(file_path)
        upload_info = get_upload_info(task_id, filename)
        
        if not upload_info:
            complete_task(task_id, 'failed', error_message='Failed to get upload URL')
            return
        
        r2_key = upload_info['key']
        
        # Step 3: Upload to R2
        if not upload_to_r2(file_path, r2_key):
            complete_task(task_id, 'failed', error_message='Upload to R2 failed')
            return
        
        # Step 4: Mark as completed (THIS WIPES THE COOKIES!)
        complete_task(task_id, 'completed', r2_key=r2_key, metadata=metadata)
        logger.info(f'Task {task_id} completed successfully')


def main():
    """Main worker loop."""
    logger.info('=' * 50)
    logger.info('TidyFeed Cloud Video Downloader Worker')
    logger.info(f'API: {API_BASE_URL}')
    logger.info(f'Poll interval: {POLL_INTERVAL}s')
    logger.info('=' * 50)
    
    while True:
        try:
            task = get_next_task()
            
            if task:
                process_task(task)
            else:
                logger.debug('No pending tasks')
            
        except Exception as e:
            logger.error(f'Worker error: {e}')
        
        time.sleep(POLL_INTERVAL)


if __name__ == '__main__':
    main()
