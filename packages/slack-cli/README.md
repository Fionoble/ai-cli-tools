# @fionoble/slack-cli

A JSON-first CLI for the Slack API. Comes with a [Claude Code](https://claude.com/claude-code) skill for seamless AI-assisted Slack interaction.

## Install

```bash
pnpm install -g @fionoble/slack-cli
```

### Prerequisites

- [Bun](https://bun.sh/) runtime
- A Slack API token (`xoxb-`, `xoxp-`, or `xoxc-`)

## Setup

### Browser Login (Recommended)

The easiest way to authenticate — opens your browser, you log in to Slack, done:

```bash
# First time: provide your Slack app credentials (saved for future use)
slack-cli auth login --client-id <id> --client-secret <secret>

# Subsequent logins: credentials are remembered
slack-cli auth login
# or just:
slack-cli auth
```

**One-time app setup:**
1. Visit [api.slack.com/apps](https://api.slack.com/apps) and create (or pick) an app
2. Under **OAuth & Permissions → Redirect URLs**, add: `http://127.0.0.1/callback`
3. Copy the **Client ID** and **Client Secret** from **Basic Information**

You can also set `SLACK_CLIENT_ID` and `SLACK_CLIENT_SECRET` environment variables instead of flags.

### Manual Token Setup

```bash
slack-cli auth setup xoxb-your-token-here
```

For browser/cookie tokens (`xoxc-`):

```bash
slack-cli auth setup xoxc-your-token --cookie "d=xoxd-your-cookie"
```

Token is stored at `~/.config/slack-cli/config.json` with `0600` permissions. You can also use environment variables:

```bash
export SLACK_TOKEN="xoxb-..."
export SLACK_COOKIE="d=..."  # only needed for xoxc- tokens
```

## CLI Usage

All commands output JSON to stdout.

```bash
# Auth
slack-cli auth                   # Browser OAuth login (default)
slack-cli auth login             # Same — browser-based OAuth 2.0
slack-cli auth setup [token]     # Configure token manually
slack-cli auth test
slack-cli auth whoami

# Channels
slack-cli channels list
slack-cli channels info --channel general
slack-cli channels history --channel general --limit 10
slack-cli channels join --channel general

# Messages
slack-cli messages send --channel general --text "Hello!"
slack-cli messages reply --channel general --thread-ts 1709000000.000000 --text "Reply!"
slack-cli messages thread --channel general --thread-ts 1709000000.000000
slack-cli messages search --query "deployment" --limit 5
slack-cli messages update --channel general --ts 1709000000.000000 --text "Updated"
slack-cli messages delete --channel general --ts 1709000000.000000

# Users
slack-cli users list
slack-cli users info --user @jane.doe
slack-cli users lookup --email jane@example.com

# Direct Messages
slack-cli dm open --user @jane.doe
slack-cli dm send --user @jane.doe --text "Hey!"
slack-cli dm history --user @jane.doe

# Reactions
slack-cli reactions add --channel general --ts 1709000000.000000 --name thumbsup
slack-cli reactions remove --channel general --ts 1709000000.000000 --name thumbsup
slack-cli reactions get --channel general --ts 1709000000.000000

# Files
slack-cli files list --channel general
slack-cli files upload --file ./report.pdf --channels general --title "Q1 Report"
slack-cli files info --file F01ABC123
slack-cli files delete --file F01ABC123
```

### Global Flags

| Flag | Description |
|------|-------------|
| `--token <token>` | Override configured token |
| `--cookie <cookie>` | Browser 'd' cookie for xoxc- tokens |
| `--pretty` | Pretty-print JSON output |
| `--raw` | Output raw API data (no `{ok, data}` wrapper) |
| `--quiet` | Suppress non-essential output |

### Name Resolution

- **Channels:** `C01ABC123`, `general`, or `#general`
- **Users:** `U01ABC123`, `@jane.doe`, or `jane@example.com`

### Pagination

Commands return `metadata.next_cursor` when more results exist:

```bash
slack-cli channels list --limit 10
# → metadata: { next_cursor: "dXNlcjpV...", has_more: true }

slack-cli channels list --limit 10 --cursor "dXNlcjpV..."
```

## Claude Code Skill

Once installed, the `/slack` skill is available in Claude Code. You can:

- Invoke directly: `/slack search for recent messages about deployments`
- Or ask naturally: "check what's happening in #general"

## Output Format

Success:
```json
{"ok": true, "data": [...], "metadata": {"count": 5, "has_more": false}}
```

Error:
```json
{"ok": false, "error": "channel_not_found", "message": "...", "exit_code": 4}
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 2 | No token configured |
| 3 | Bad argument |
| 4 | Slack API error |
| 5 | Network error |
| 6 | File I/O error |

## License

ISC
