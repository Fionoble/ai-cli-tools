# ai-cli-tools

AI-powered CLI tools with [Claude Code](https://claude.com/claude-code) skills.

## Packages

| Package | Description |
|---------|-------------|
| [@fionoble/image-gen-cli](./packages/image-gen-cli) | Generate and edit images using OpenAI's gpt-image-1 |
| [@fionoble/tts-cli](./packages/tts-cli) | Text-to-speech using OpenAI's TTS API |
| [@fionoble/issue-watcher](./packages/issue-watcher) | GitHub issue watcher that uses Claude to auto-generate PRs for new issues |
| [@fionoble/slack-cli](./packages/slack-cli) | JSON-first CLI for the Slack API, with a Claude Code skill |
| [@fionoble/fcd](./packages/fcd) | Fuzzy cd — quickly jump into project directories using fzf |

## Quick Start

### Install all tools + Claude Code skills

```bash
git clone https://github.com/Fionoble/ai-cli-tools.git
cd ai-cli-tools
./install.sh
```

### Or install individually via npm

```bash
npm install -g @fionoble/image-gen-cli
npm install -g @fionoble/tts-cli
npm install -g @fionoble/issue-watcher
npm install -g @fionoble/slack-cli
```

## Prerequisites

- Node.js 18+
- An [OpenAI API key](https://platform.openai.com/api-keys) set as `OPENAI_API_KEY`

```bash
export OPENAI_API_KEY="sk-..."
```

## License

ISC
