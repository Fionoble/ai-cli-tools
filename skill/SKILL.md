---
name: image-gen
description: Generate or edit images using OpenAI's gpt-image-1 model. Use when the user asks to generate, create, or edit images using AI.
allowed-tools: Bash, Read
---

# image-gen

Generate or edit images using OpenAI's gpt-image-1 model via the `image-gen` CLI tool.

## Tool Location

Run with `image-gen` (if globally installed via `npm link`) or `npx image-gen-cli`.

## Usage

```
image-gen [options]
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `-p, --prompt <text>` | Image prompt (required) | - |
| `-i, --image <path>` | Input image path for editing | - |
| `-o, --output <path>` | Output file path | `generated-<timestamp>.png` |
| `-s, --size <size>` | `1024x1024`, `1024x1536`, `1536x1024`, `auto` | `auto` |
| `-q, --quality <quality>` | `low`, `medium`, `high`, `auto` | `auto` |
| `-n, --count <n>` | Number of images | `1` |
| `-m, --model <model>` | OpenAI model | `gpt-image-1` |

### Environment

Requires `OPENAI_API_KEY` to be set in the environment.

## Instructions

When the user asks you to generate or edit an image:

1. **Craft a detailed prompt** from the user's request. Good prompts are specific about style, composition, colors, lighting, and mood. Expand brief requests into rich descriptions.

2. **Choose appropriate settings:**
   - Use `-q high` for logos, artwork, or when quality matters
   - Use `-q low` for quick drafts or iterations
   - Use `-s 1024x1536` for portraits/vertical images
   - Use `-s 1536x1024` for landscapes/horizontal images
   - Use `-s 1024x1024` for square images (icons, profile pictures, logos)

3. **For image editing** (`-i` flag): When the user provides an existing image and wants modifications, use the edit mode. The input image must be a valid PNG file.

4. **Output path**: Always use `-o` to save to a descriptive filename in the current working directory unless the user specifies otherwise.

5. **After generation**: Read and display the generated image to the user using the Read tool so they can see the result. Ask if they want any changes.

## Examples

Generate a new image:
```bash
image-gen -p "A watercolor painting of a serene Japanese garden with cherry blossoms, koi pond, and a small wooden bridge, soft morning light" -q high -s 1536x1024 -o japanese-garden.png
```

Edit an existing image:
```bash
image-gen -p "Change the sky to a dramatic sunset with orange and purple clouds" -i photo.png -q high -o photo-sunset.png
```

Generate a logo:
```bash
image-gen -p "Minimalist logo for a coffee shop called 'Bean & Brew', clean lines, modern design, coffee cup icon" -q high -s 1024x1024 -o logo.png
```
