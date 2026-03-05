#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILLS_DIR="$HOME/.claude/skills"

echo "=== ai-cli-tools installer ==="
echo ""

# Install pnpm dependencies (workspaces)
echo "Installing dependencies..."
(cd "$SCRIPT_DIR" && pnpm install)

# Link all CLIs globally
echo "Linking CLIs globally..."
(cd "$SCRIPT_DIR/packages/image-gen-cli" && pnpm link --global)
(cd "$SCRIPT_DIR/packages/tts-cli" && pnpm link --global)
(cd "$SCRIPT_DIR/packages/slack-cli" && pnpm link --global)

# Install Claude Code skills
echo "Installing Claude Code skills..."

mkdir -p "$SKILLS_DIR/image-gen"
cp "$SCRIPT_DIR/packages/image-gen-cli/skill/SKILL.md" "$SKILLS_DIR/image-gen/SKILL.md"
echo "  Installed image-gen skill"

mkdir -p "$SKILLS_DIR/tts"
cp "$SCRIPT_DIR/packages/tts-cli/skill/SKILL.md" "$SKILLS_DIR/tts/SKILL.md"
echo "  Installed tts skill"

mkdir -p "$SKILLS_DIR/slack"
cp "$SCRIPT_DIR/packages/slack-cli/skill/SKILL.md" "$SKILLS_DIR/slack/SKILL.md"
echo "  Installed slack skill"

echo ""
echo "Done!"
echo ""
echo "Make sure OPENAI_API_KEY is set for image-gen and tts:"
echo "  export OPENAI_API_KEY=\"your-key-here\""
echo ""
echo "For slack-cli, configure your Slack token:"
echo "  slack-cli auth setup xoxb-your-token"
echo ""
echo "Available tools:"
echo "  image-gen -p \"A cat in space\" -o cat.png"
echo "  tts -t \"Hello world\" -o hello.mp3"
echo "  slack-cli channels list"
echo ""
echo "Claude Code skills: /image-gen, /tts, /slack"
