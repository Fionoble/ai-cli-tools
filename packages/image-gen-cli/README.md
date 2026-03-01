# @fionoble/image-gen-cli

A CLI tool for generating and editing images using OpenAI's `gpt-image-1` model. Comes with a [Claude Code](https://claude.com/claude-code) skill for seamless AI-assisted image generation.

## Install

```bash
npm install -g @fionoble/image-gen-cli
```

Or use without installing:

```bash
npx @fionoble/image-gen-cli -p "A cat in a spacesuit" -o cat.png
```

### Prerequisites

- Node.js 18+
- An [OpenAI API key](https://platform.openai.com/api-keys) set as `OPENAI_API_KEY`

```bash
export OPENAI_API_KEY="sk-..."
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | **Required.** Your OpenAI API key. |
| `OPENAI_BASE_URL` | Custom API base URL (for proxies). |

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
| `--install-skill` | Install the Claude Code skill | - |
| `--uninstall-skill` | Remove the Claude Code skill | - |

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

Install the skill so Claude Code can generate images for you:

```bash
image-gen --install-skill
# or
npx @fionoble/image-gen-cli --install-skill
```

Once installed, the `/image-gen` skill is available in Claude Code. You can either:

- Invoke it directly: `/image-gen create a logo for my app`
- Or just ask naturally: "generate an image of a cat in space"

Claude will craft a detailed prompt, pick appropriate settings, generate the image, and display the result.

To remove the skill:

```bash
image-gen --uninstall-skill
```

## License

ISC
