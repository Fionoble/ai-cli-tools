# image-gen-cli

A CLI tool for generating and editing images using OpenAI's `gpt-image-1` model. Comes with a [Claude Code](https://claude.com/claude-code) skill for seamless AI-assisted image generation.

## Setup

### Prerequisites

- Node.js 18+
- An [OpenAI API key](https://platform.openai.com/api-keys)

### Install

```bash
git clone <this-repo>
cd image-gen-cli
bash install.sh
```

This will:
1. Install npm dependencies
2. Link the `image-gen` command globally
3. Install the Claude Code skill to `~/.claude/skills/image-gen/`

Then add your API key to your shell profile:

```bash
echo 'export OPENAI_API_KEY="sk-..."' >> ~/.zshrc
source ~/.zshrc
```

## CLI Usage

```
image-gen [options]
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `-p, --prompt <text>` | Image prompt (required) | - |
| `-i, --image <path>` | Input image for editing | - |
| `-o, --output <path>` | Output file path | `generated-<timestamp>.png` |
| `-s, --size <size>` | `1024x1024`, `1024x1536`, `1536x1024`, `auto` | `auto` |
| `-q, --quality <quality>` | `low`, `medium`, `high`, `auto` | `auto` |
| `-n, --count <n>` | Number of images to generate | `1` |
| `-m, --model <model>` | OpenAI model | `gpt-image-1` |

### Examples

Generate an image:

```bash
image-gen -p "A watercolor painting of a Japanese garden" -q high -o garden.png
```

Edit an existing image:

```bash
image-gen -p "Make the sky a dramatic sunset" -i photo.png -o photo-sunset.png
```

Generate a logo:

```bash
image-gen -p "Minimalist coffee shop logo" -q high -s 1024x1024 -o logo.png
```

## Claude Code Skill

After installing, the `/image-gen` skill is available in Claude Code. You can either:

- Invoke it directly: `/image-gen create a logo for my app`
- Or just ask naturally: "generate an image of a cat in space"

Claude will craft a detailed prompt, pick appropriate settings, generate the image, and display the result.

### Manual Skill Install

If you only want the Claude Code skill without the global CLI link:

```bash
mkdir -p ~/.claude/skills/image-gen
cp skill/SKILL.md ~/.claude/skills/image-gen/SKILL.md
```

## License

ISC
