"""
TidyFeed Worker - Unified Entry Point

Runs multiple worker processes in parallel:
1. Video Downloader (worker.py) - Syncs polling loop
2. Twitter Bot Poller (bot_poller.py) - Async polling loop

Use this as the main entry point for container deployments.
"""

import os
import sys
import logging
import multiprocessing
from concurrent.futures import ProcessPoolExecutor

# Load .env file for local development
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] [Main] %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)


def run_video_worker():
    """Run the video downloader worker."""
    from worker import main as video_worker_main
    logger.info('Starting Video Downloader Worker...')
    video_worker_main()


def run_bot_poller():
    """Run the Twitter bot poller."""
    from bot_poller import start_bot
    logger.info('Starting Twitter Bot Poller...')
    start_bot()


def main():
    """Main entry point - runs workers in parallel."""
    logger.info('=' * 60)
    logger.info('TidyFeed Unified Worker')
    logger.info('=' * 60)
    
    # Check which workers to enable
    enable_video_worker = True  # Always enabled
    enable_bot_poller = bool(os.environ.get('BOT_USERNAME'))
    
    processes = []
    
    # Start Video Worker process
    if enable_video_worker:
        video_process = multiprocessing.Process(target=run_video_worker, name='VideoWorker')
        video_process.start()
        processes.append(video_process)
        logger.info('Video Downloader Worker started (PID: %d)', video_process.pid)
    
    # Start Bot Poller process (only if configured)
    if enable_bot_poller:
        bot_process = multiprocessing.Process(target=run_bot_poller, name='BotPoller')
        bot_process.start()
        processes.append(bot_process)
        logger.info('Twitter Bot Poller started (PID: %d)', bot_process.pid)
    else:
        logger.info('Twitter Bot Poller disabled (BOT_USERNAME not set)')
    
    # Wait for all processes
    try:
        for p in processes:
            p.join()
    except KeyboardInterrupt:
        logger.info('Shutting down workers...')
        for p in processes:
            p.terminate()
            p.join(timeout=5)
        logger.info('All workers stopped')


if __name__ == '__main__':
    main()
