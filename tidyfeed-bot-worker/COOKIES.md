# Refreshing Bot Cookies

The bot uses X/Twitter cookies for authentication via twikit. These cookies expire periodically and need to be refreshed.

## Quick Start

### Using the Python script (recommended):

```bash
python refresh_cookies.py cookies.json
```

### Using the shell script:

```bash
./refresh_cookies.sh cookies.json
```

## How to Get Fresh Cookies

1. **Install a cookie manager extension:**
   - Chrome: [EditThisCookie](https://chrome.google.com/webstore/detail/editthiscookie/)
   - Firefox: [Cookie-Editor](https://addons.mozilla.org/en-US/firefox/addon/cookie-editor/)

2. **Log into X/Twitter:**
   - Go to https://x.com and log in as **@tidyfeedapp**

3. **Export cookies:**
   - Click the extension icon
   - Select "Export" → "JSON" format
   - Save the file as `cookies.json`

4. **Upload to server:**
   ```bash
   python refresh_cookies.py cookies.json
   ```

## Manual Upload (alternative)

If the scripts don't work, use SFTP directly:

```bash
fly ssh sftp shell -a tidyfeed-bot-worker
# Then: put cookies.json /data/cookies.json
```

## Verify Upload

Check the bot logs to see if cookies are working:

```bash
fly logs -a tidyfeed-bot-worker
```

Look for:
- ✅ `Cookies loaded`
- ✅ `Bot started, polling for mentions...`
- ❌ `Could not authenticate you` → cookies are expired/invalid

## Troubleshooting

**Error: `Could not authenticate you` (401)**
- Cookies have expired → export fresh cookies
- Wrong account → make sure you're logged in as @tidyfeedapp
- Corrupt file → re-export cookies from browser

**Error: `fly: command not found`**
Install Fly CLI:
```bash
curl -L https://fly.io/install.sh | sh
```

**Error: `Cookies file not found`**
Make sure `cookies.json` is in the bot-worker directory, or provide the full path:
```bash
python refresh_cookies.py /full/path/to/cookies.json
```

## How Often to Refresh

X/Twitter cookies typically expire after **14-30 days**. You'll need to refresh when you see:

```
[ERROR] Error fetching mentions: status: 401
```

in the bot logs.
