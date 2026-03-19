---
name: issue-watcher
description: Use when the user asks to watch a GitHub repo for issues and auto-generate PRs with Claude.
allowed-tools: Bash, Read
---

# issue-watcher

Watches a GitHub repository for new issues and uses Claude to automatically generate PRs that address them.

## Location

- Global: `issue-watcher`
- npx: `npx @fionoble/issue-watcher-cli`

## CLI Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--interval <s>` | Polling interval in seconds | `30` |
| `--label <label>` | Only process issues with this label | all issues |
| `--issue <n>` | Process a specific issue number and exit | — |
| `--once` | Process once and exit (no polling) | off |
| `--init` | Mark existing open issues as processed | off |
| `--dry-run` | Show what would happen without acting | off |
| `-h, --help` | Show help | — |

## Prerequisites

- `gh` CLI installed and authenticated
- `claude` CLI installed
- Run from inside the git repo to watch

## How it works

1. Polls `gh issue list` for new open issues
2. For each new issue, creates an isolated git worktree
3. Runs `claude -p` with the issue content to make code changes
4. If changes were made: commits, pushes, creates a PR, and comments on the issue
5. Tracks processed issues in `~/.issue-watcher/` to avoid reprocessing

## Examples

```bash
# Start watching the current repo
issue-watcher

# Only watch issues labeled "auto-fix"
issue-watcher --label auto-fix

# First run: skip existing issues, only catch new ones
issue-watcher --init

# Process a specific issue
issue-watcher --issue 42

# Dry run to see what would be processed
issue-watcher --dry-run --once
```

## Instructions for Claude

When the user asks to start watching issues, run `issue-watcher` from within
the target repo. Suggest `--init` on first run to skip existing issues.
Suggest `--label` if they want to filter. Use `--dry-run` to preview.
