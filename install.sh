#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_DIR="$HOME/.claude/skills/image-gen"

echo "=== image-gen-cli installer ==="
echo ""

# Install npm dependencies
echo "Installing dependencies..."
npm install --prefix "$SCRIPT_DIR"

# Link the CLI globally
echo "Linking CLI globally (may require sudo)..."
npm link --prefix "$SCRIPT_DIR"

# Install Claude Code skill
echo "Installing Claude Code skill..."
mkdir -p "$SKILL_DIR"
cp "$SCRIPT_DIR/skill/SKILL.md" "$SKILL_DIR/SKILL.md"

echo ""
echo "Done! Make sure OPENAI_API_KEY is set in your environment:"
echo ""
echo "  export OPENAI_API_KEY=\"your-key-here\""
echo ""
echo "Then use it directly:"
echo "  image-gen -p \"A cat in space\" -o cat.png"
echo ""
echo "Or via Claude Code:"
echo "  /image-gen generate a cat in space"
