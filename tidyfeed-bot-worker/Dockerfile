# TidyFeed Bot Worker
# Lightweight Python service for Twitter mention monitoring

FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install dependencies first (better caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY bot.py .
COPY login_helper.py .

# Create data directory for persistent storage
# This should be mounted as a volume to preserve:
#   - cookies.json (auth session)
#   - processed_ids.json (dedup state)
RUN mkdir -p /data

# Environment variables (defaults, override at runtime)
ENV API_BASE_URL=https://api.tidyfeed.app
ENV INTERNAL_SERVICE_KEY=
ENV BOT_COOKIES_PATH=/data/cookies.json
ENV PROCESSED_IDS_PATH=/data/processed_ids.json
ENV POLL_MIN_SECONDS=45
ENV POLL_MAX_SECONDS=90
ENV LOG_LEVEL=INFO

# Volume for persistent data
VOLUME ["/data"]

# Health check (optional)
# HEALTHCHECK --interval=60s --timeout=10s \
#   CMD python -c "import os; exit(0 if os.path.exists('/data/cookies.json') else 1)"

# Run the bot
CMD ["python", "-u", "bot.py"]
