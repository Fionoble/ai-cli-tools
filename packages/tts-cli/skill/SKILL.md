---
name: tts
description: Generate speech from text using OpenAI's TTS API. Use when the user asks to generate speech, read text aloud, or create audio from text.
allowed-tools: Bash, Read
---

# tts

Generate speech from text using OpenAI's TTS API via the `tts` CLI tool.

## Tool Location

Run with `tts` (if globally installed via `npm link`) or `npx @fionoble/tts-cli`.

## Usage

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

### Environment

Requires `OPENAI_API_KEY` to be set in the environment.

## Instructions

When the user asks you to generate speech, read text aloud, or create audio:

1. **Choose a voice** based on the use case:
   - `alloy` — neutral, balanced (good default)
   - `nova` — warm, friendly (conversational, narration)
   - `echo` — smooth, clear (podcasts, presentations)
   - `fable` — expressive, dynamic (storytelling)
   - `onyx` — deep, authoritative (announcements, serious content)
   - `shimmer` — bright, upbeat (marketing, cheerful content)
   - `sage` — calm, measured (educational, instructional)
   - `coral` — warm, natural (general purpose)
   - `ash`, `ballad`, `marin`, `verse`, `cedar` — additional options

2. **Choose a model:**
   - `gpt-4o-mini-tts` — best quality, supports `--instructions` for voice styling (default, recommended)
   - `tts-1` — fastest, lower quality (good for quick drafts)
   - `tts-1-hd` — higher quality than tts-1 but slower

3. **Choose a format:**
   - `mp3` — general use, widely compatible (default)
   - `wav` — uncompressed, best for audio editing
   - `opus` — efficient streaming format
   - `aac` — good for mobile/Apple devices
   - `flac` — lossless compression

4. **Use `--instructions`** (gpt-4o-mini-tts only) to control voice style:
   - "Speak like a news anchor, clear and authoritative"
   - "Whisper softly and gently"
   - "Sound excited and enthusiastic"
   - "Read in a calm, meditative tone"

5. **For long text**, use `-f` to read from a file rather than passing text inline.

6. **Output path**: Always use `-o` to save to a descriptive filename in the current working directory unless the user specifies otherwise.

## Examples

Generate simple speech:
```bash
tts -t "Hello, welcome to the presentation" -v nova -o welcome.mp3
```

Read a file aloud with style instructions:
```bash
tts -f notes.txt -v sage --instructions "Read in a calm, professional tone" -o notes-audio.mp3
```

Create a narration:
```bash
tts -t "Once upon a time, in a land far away..." -v fable --instructions "Speak like a storyteller, with dramatic pauses" -o story.mp3
```

Quick draft (fast model):
```bash
tts -t "Testing one two three" -m tts-1 -o test.mp3
```

High-quality WAV for editing:
```bash
tts -f script.txt -v echo --format wav -o recording.wav
```
