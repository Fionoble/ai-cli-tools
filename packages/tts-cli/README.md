# @fionoble/tts-cli

A CLI tool for generating speech using OpenAI's TTS API. Comes with a [Claude Code](https://claude.com/claude-code) skill for seamless AI-assisted speech generation.

## Install

```bash
npm install -g @fionoble/tts-cli
```

Or use without installing:

```bash
npx @fionoble/tts-cli -t "Hello world" -o hello.mp3
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
| `TTS_VOICE` | Default voice. Overridden by `-v` flag. |
| `TTS_MODEL` | Default model. Overridden by `-m` flag. |
| `TTS_FORMAT` | Default output format. Overridden by `--format` flag. |
| `TTS_SPEED` | Default speed. Overridden by `--speed` flag. |

Example — set your preferred defaults in your shell profile:

```bash
export TTS_VOICE="nova"
export TTS_MODEL="tts-1-hd"
export TTS_FORMAT="wav"
```

Then just run `tts -t "Hello"` and it uses those defaults. Pass a flag to override for a single run.

## CLI Usage

```
tts [options]
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `-t, --text <text>` | Text to speak (required unless `-f`) | - |
| `-f, --file <path>` | Read text from a file | - |
| `-o, --output <path>` | Output file path | `speech-<timestamp>.mp3` |
| `-v, --voice <voice>` | Voice (see below) | `alloy` |
| `-m, --model <model>` | `gpt-4o-mini-tts`, `tts-1`, `tts-1-hd` | `gpt-4o-mini-tts` |
| `--format <fmt>` | `mp3`, `opus`, `aac`, `flac`, `wav`, `pcm` | `mp3` |
| `--speed <n>` | Speed 0.25–4.0 | `1.0` |
| `--instructions <text>` | Voice style instructions (gpt-4o-mini-tts only) | - |
| `--install-skill` | Install the Claude Code skill | - |
| `--uninstall-skill` | Remove the Claude Code skill | - |

### Voices

alloy, ash, ballad, coral, echo, fable, marin, nova, onyx, sage, shimmer, verse, cedar

### Examples

Generate speech:

```bash
tts -t "Hello world" -v nova -o hello.mp3
```

Read a file aloud:

```bash
tts -f article.txt -v sage --format wav -o article.wav
```

Use voice style instructions:

```bash
tts -t "Breaking news today" --instructions "Speak like a news anchor, clear and authoritative" -o news.mp3
```

## Claude Code Skill

Install the skill so Claude Code can generate speech for you:

```bash
tts --install-skill
# or
npx @fionoble/tts-cli --install-skill
```

Once installed, the `/tts` skill is available in Claude Code. You can either:

- Invoke it directly: `/tts say hello world`
- Or just ask naturally: "read this text aloud" or "generate speech for this paragraph"

To remove the skill:

```bash
tts --uninstall-skill
```

## License

ISC
