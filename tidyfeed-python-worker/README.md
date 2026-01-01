# TidyFeed Python Worker

Cloud Video Downloader service that processes queued video download tasks.

## Architecture

1. Polls backend API for pending tasks
2. Downloads video using `yt-dlp` with user's Twitter cookies
3. Uploads to Cloudflare R2
4. **CRITICAL**: Notifies backend to wipe cookies immediately

## Setup

```bash
# Copy environment file
cp .env.example .env

# Fill in the values in .env

# Build and run
docker-compose up -d

# View logs
docker-compose logs -f
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `API_BASE_URL` | Backend API URL |
| `INTERNAL_SERVICE_KEY` | Shared secret for internal API auth |
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 access key |
| `R2_SECRET_ACCESS_KEY` | R2 secret key |
| `R2_BUCKET_NAME` | R2 bucket name (default: `tidyfeed-media`) |

## Security

- Twitter cookies are **only** held temporarily during download
- Cookies are **deleted from database** immediately after task completion
- No long-term cookie storage
