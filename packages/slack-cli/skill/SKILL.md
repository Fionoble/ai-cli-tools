---
name: slack
description: Interact with Slack — search conversations, read channels and threads, send messages, manage DMs, reactions, and files using the slack-cli tool
allowed-tools: Bash, Read
---

# slack

Interact with Slack using the `slack-cli` JSON-first CLI tool.

## Tool Location

Run with `slack-cli` (if globally linked via `pnpm link --global`) or from the monorepo root.

## Output Format

Every command returns:
```json
{"ok": true, "data": {...}, "metadata": {"next_cursor": "...", "has_more": true}}
```
On error:
```json
{"ok": false, "error": "channel_not_found", "message": "...", "exit_code": 4}
```

## Available Commands

### Auth
```bash
slack-cli auth                   # Browser OAuth login (default)
slack-cli auth login             # Same — browser-based OAuth 2.0
slack-cli auth setup [token]     # Configure token manually (positional, --token flag, or stdin)
slack-cli auth test              # Verify token, show identity
slack-cli auth whoami            # Current user/team identity
```

### Channels
```bash
slack-cli channels list [--type public_channel,private_channel] [--limit 100] [--cursor <c>]
slack-cli channels info --channel <id|name>
slack-cli channels history --channel <id|name> [--limit 20] [--before <ts>] [--after <ts>] [--cursor <c>]
slack-cli channels join --channel <id|name>
```

### Messages
```bash
slack-cli messages send --channel <id|name> --text "message"
slack-cli messages reply --channel <id|name> --thread-ts <ts> --text "reply" [--broadcast]
slack-cli messages thread --channel <id|name> --thread-ts <ts> [--limit 20] [--before <ts>] [--after <ts>] [--cursor <c>] [--inclusive]
slack-cli messages search --query "search terms" [--channel <name>] [--from <user>] [--limit 20]
slack-cli messages update --channel <id|name> --ts <ts> --text "new text"
slack-cli messages delete --channel <id|name> --ts <ts>
```

### Users
```bash
slack-cli users list [--limit 100] [--cursor <c>]
slack-cli users info --user <id|handle|email>
slack-cli users lookup --email <email>
```

### Direct Messages
```bash
slack-cli dm open --user <id|handle|email>
slack-cli dm send --user <id|handle|email> --text "message"
slack-cli dm history --user <id|handle|email> [--limit 20] [--cursor <c>]
```

### Reactions
```bash
slack-cli reactions add --channel <id|name> --ts <ts> --name emoji_name
slack-cli reactions remove --channel <id|name> --ts <ts> --name emoji_name
slack-cli reactions get --channel <id|name> --ts <ts>
```

### Files
```bash
slack-cli files list [--channel <id|name>] [--user <id>] [--limit 20]
slack-cli files upload --file <path> [--channels <ids>] [--title "title"]
slack-cli files info --file <id>
slack-cli files delete --file <id>
```

## Global Flags

- `--pretty` — Pretty-print JSON output
- `--raw` — Output raw API data without the ok/data wrapper
- `--quiet` — Suppress non-essential output
- `--token <token>` — Override configured token
- `--cookie <cookie>` — Browser 'd' cookie for xoxc- tokens

## Setup

Requires a Slack API token. Two ways to authenticate:

**Browser login (recommended):**
```bash
slack-cli auth login --client-id <id> --client-secret <secret>
# Credentials are saved — subsequent logins just need: slack-cli auth
```
Requires a Slack app. Set `SLACK_CLIENT_ID` and `SLACK_CLIENT_SECRET` env vars, or pass via flags.

**Manual token setup:**
```bash
slack-cli auth setup <token>
```

Token types:
- `xoxb-` — Bot token
- `xoxp-` — User token (required for `messages search`). Browser login produces this type.
- `xoxc-` — Browser/cookie token (requires `--cookie` or `$SLACK_COOKIE`)

Token is stored at `~/.config/slack-cli/config.json` (mode 0600).

## Name Resolution

- **Channels:** Pass a channel ID (e.g., `C01ABC123`) or a name (e.g., `general` or `#general`). Names are resolved automatically and cached for 1 hour.
- **Users:** Pass a user ID (e.g., `U01ABC123`), a handle (e.g., `@jane.doe`), or an email. Resolved automatically and cached.
- **Prefer IDs:** If you already have an ID from a previous command response, reuse it directly — this avoids any API call for resolution.
- **Prefer email over handle:** Email lookup is a single cheap API call (Tier 4). Handle lookup may paginate through the full user list (Tier 2, rate-limited). Use email when you have it.

## Pagination

List commands return `metadata.next_cursor` when there are more results. Pass `--cursor <value>` on the next call to get the next page.

## Instructions

When the user asks you to interact with Slack:

1. **Use `messages search`** for broad discovery across channels — it's the most powerful tool for finding conversation context.
2. **Use `channels history`** when you need recent messages in a specific channel.
3. **Use `messages thread`** to read full thread replies — the first message returned is always the parent.
4. **Use `dm history`** to review direct message conversations.
5. **Chain commands**: search first to find relevant timestamps, then read the thread with `messages thread --thread-ts <ts>`.
6. Pipe `--limit` to control how much data you pull. Start small, expand if needed.

### Rate Limit Best Practices

- **Reuse IDs from previous responses.** Every response includes channel/user IDs — pass those directly instead of names to avoid resolution API calls entirely.
- **Prefer email for user lookup.** `--user jane@example.com` uses a single Tier 4 call. `--user @jane.doe` may paginate `users.list` (Tier 2, 20 req/min).
- **Results are cached for 1 hour.** After the first name→ID resolution, subsequent calls with the same name are free (no API call).
- **The CLI auto-retries on rate limits** (up to 3 times with exponential backoff). If retries are exhausted, the error output includes `retry_after` (seconds) — wait that long before trying again.
- **If you see `"error": "rate_limited"`**, check the `retry_after` field and wait before retrying:
  ```json
  {"ok": false, "error": "rate_limited", "message": "...", "exit_code": 4, "retry_after": 30}
  ```

## Caching

Channel and user name→ID mappings are cached at `~/.config/slack-cli/cache.json` (1-hour TTL). List commands (`channels list`, `users list`) bulk-populate this cache. The cache is also populated during name resolution, so the first lookup pays the API cost and all subsequent lookups for the same name are instant.

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 2 | No token configured |
| 3 | Bad argument |
| 4 | Slack API error |
| 5 | Network error |
| 6 | File I/O error |
