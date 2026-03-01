#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const OpenAI = require("openai").default;

function printUsage() {
  console.log(`Usage: tts [options]

Generate speech from text using OpenAI's TTS API.

Options:
  -t, --text <text>          Text to speak (required unless -f is used)
  -f, --file <path>          Read text from a file instead
  -o, --output <path>        Output file (default: speech-<timestamp>.mp3)
  -v, --voice <voice>        Voice: alloy, ash, ballad, coral, echo, fable,
                             marin, nova, onyx, sage, shimmer, verse, cedar
                             (default: alloy)
  -m, --model <model>        Model: gpt-4o-mini-tts, tts-1, tts-1-hd
                             (default: gpt-4o-mini-tts)
  --format <fmt>             Output format: mp3, opus, aac, flac, wav, pcm
                             (default: mp3)
  --speed <n>                Speed 0.25-4.0 (default: 1.0)
  --instructions <text>      Voice style instructions (gpt-4o-mini-tts only)
  --install-skill            Install the Claude Code skill to ~/.claude/skills/
  --uninstall-skill          Remove the Claude Code skill
  -h, --help                 Show this help message

Environment:
  OPENAI_API_KEY             Required. Your OpenAI API key.

Examples:
  tts -t "Hello world"
  tts -f article.txt -v nova -o reading.mp3
  tts -t "Breaking news" --instructions "Speak like a news anchor" -o news.mp3
  npx @fionoble/tts-cli --install-skill
`);
}

function installSkill() {
  const os = require("os");
  const skillDir = path.join(os.homedir(), ".claude", "skills", "tts");
  const source = path.join(__dirname, "skill", "SKILL.md");

  if (!fs.existsSync(source)) {
    console.error("Error: SKILL.md not found in package. Try reinstalling.");
    process.exit(1);
  }

  fs.mkdirSync(skillDir, { recursive: true });
  fs.copyFileSync(source, path.join(skillDir, "SKILL.md"));
  console.log(`Claude Code skill installed to ${skillDir}/SKILL.md`);
}

function uninstallSkill() {
  const os = require("os");
  const skillDir = path.join(os.homedir(), ".claude", "skills", "tts");
  const skillFile = path.join(skillDir, "SKILL.md");

  if (fs.existsSync(skillFile)) {
    fs.unlinkSync(skillFile);
    fs.rmdirSync(skillDir);
    console.log("Claude Code skill removed.");
  } else {
    console.log("Skill not installed, nothing to remove.");
  }
}

const VALID_VOICES = [
  "alloy", "ash", "ballad", "coral", "echo", "fable",
  "marin", "nova", "onyx", "sage", "shimmer", "verse", "cedar",
];

const VALID_MODELS = ["gpt-4o-mini-tts", "tts-1", "tts-1-hd"];
const VALID_FORMATS = ["mp3", "opus", "aac", "flac", "wav", "pcm"];

function parseArgs(argv) {
  const args = {
    text: null,
    file: null,
    output: null,
    voice: "alloy",
    model: "gpt-4o-mini-tts",
    format: "mp3",
    speed: 1.0,
    instructions: null,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "-t":
      case "--text":
        args.text = argv[++i];
        break;
      case "-f":
      case "--file":
        args.file = argv[++i];
        break;
      case "-o":
      case "--output":
        args.output = argv[++i];
        break;
      case "-v":
      case "--voice":
        args.voice = argv[++i];
        break;
      case "-m":
      case "--model":
        args.model = argv[++i];
        break;
      case "--format":
        args.format = argv[++i];
        break;
      case "--speed":
        args.speed = parseFloat(argv[++i]);
        break;
      case "--instructions":
        args.instructions = argv[++i];
        break;
      case "--install-skill":
        installSkill();
        process.exit(0);
      case "--uninstall-skill":
        uninstallSkill();
        process.exit(0);
      case "-h":
      case "--help":
        printUsage();
        process.exit(0);
      default:
        console.error(`Unknown option: ${arg}`);
        process.exit(1);
    }
  }

  return args;
}

function resolveOutputPath(output, format) {
  if (output) {
    return path.resolve(output);
  }
  const timestamp = Date.now();
  const ext = format === "pcm" ? "pcm" : format;
  return path.resolve(`speech-${timestamp}.${ext}`);
}

async function main() {
  const args = parseArgs(process.argv);

  // Read text from file if -f was used
  if (args.file) {
    const filePath = path.resolve(args.file);
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      process.exit(1);
    }
    args.text = fs.readFileSync(filePath, "utf-8").trim();
  }

  if (!args.text) {
    console.error("Error: --text or --file is required");
    printUsage();
    process.exit(1);
  }

  if (!VALID_VOICES.includes(args.voice)) {
    console.error(`Error: Invalid voice "${args.voice}". Valid voices: ${VALID_VOICES.join(", ")}`);
    process.exit(1);
  }

  if (!VALID_MODELS.includes(args.model)) {
    console.error(`Error: Invalid model "${args.model}". Valid models: ${VALID_MODELS.join(", ")}`);
    process.exit(1);
  }

  if (!VALID_FORMATS.includes(args.format)) {
    console.error(`Error: Invalid format "${args.format}". Valid formats: ${VALID_FORMATS.join(", ")}`);
    process.exit(1);
  }

  if (args.speed < 0.25 || args.speed > 4.0) {
    console.error("Error: Speed must be between 0.25 and 4.0");
    process.exit(1);
  }

  if (args.instructions && args.model !== "gpt-4o-mini-tts") {
    console.error("Error: --instructions is only supported with the gpt-4o-mini-tts model");
    process.exit(1);
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error("Error: OPENAI_API_KEY environment variable is not set");
    process.exit(1);
  }

  const client = new OpenAI();
  const outputPath = resolveOutputPath(args.output, args.format);

  console.log(`Generating speech with voice "${args.voice}"...`);

  try {
    const params = {
      model: args.model,
      voice: args.voice,
      input: args.text,
      response_format: args.format,
      speed: args.speed,
    };

    if (args.instructions) {
      params.instructions = args.instructions;
    }

    const response = await client.audio.speech.create(params);

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(outputPath, buffer);
    console.log(`Saved: ${outputPath}`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    if (err.status) {
      console.error(`Status: ${err.status}`);
    }
    process.exit(1);
  }
}

main();
