# TidyFeed Cloud Video Downloader Worker
# Dockerfile for running yt-dlp video downloads

FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy worker script
COPY worker.py .

# Create temp directory for downloads
RUN mkdir -p /tmp/downloads

# Environment variables (to be overridden at runtime)
ENV API_BASE_URL=https://api.tidyfeed.app
ENV INTERNAL_SERVICE_KEY=
ENV POLL_INTERVAL=5
ENV R2_ACCOUNT_ID=
ENV R2_ACCESS_KEY_ID=
ENV R2_SECRET_ACCESS_KEY=
ENV R2_BUCKET_NAME=tidyfeed-media

# Run the worker
CMD ["python", "-u", "worker.py"]
