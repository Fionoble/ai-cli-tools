#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const OpenAI = require("openai").default;

function printUsage() {
  console.log(`Usage: image-gen [options]

Generate or edit images using OpenAI's gpt-image-1 model.

Options:
  -p, --prompt <text>       Image prompt (required)
  -i, --image <path>        Input image for editing (optional)
  -o, --output <path>       Output file path (default: generated-<timestamp>.png)
  -s, --size <size>         Image size: 1024x1024, 1024x1536, 1536x1024, auto (default: auto)
  -q, --quality <quality>   Quality: low, medium, high, auto (default: auto)
  -n, --count <n>           Number of images to generate (default: 1)
  -m, --model <model>       Model: gpt-image-1 (default: gpt-image-1)
  -h, --help                Show this help message

Environment:
  OPENAI_API_KEY            Required. Your OpenAI API key.

Examples:
  image-gen -p "A cat in a spacesuit"
  image-gen -p "Make the background blue" -i photo.png
  image-gen -p "A logo for a coffee shop" -s 1024x1024 -q high -o logo.png
`);
}

function parseArgs(argv) {
  const args = {
    prompt: null,
    image: null,
    output: null,
    size: "auto",
    quality: "auto",
    count: 1,
    model: "gpt-image-1",
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "-p":
      case "--prompt":
        args.prompt = argv[++i];
        break;
      case "-i":
      case "--image":
        args.image = argv[++i];
        break;
      case "-o":
      case "--output":
        args.output = argv[++i];
        break;
      case "-s":
      case "--size":
        args.size = argv[++i];
        break;
      case "-q":
      case "--quality":
        args.quality = argv[++i];
        break;
      case "-n":
      case "--count":
        args.count = parseInt(argv[++i], 10);
        break;
      case "-m":
      case "--model":
        args.model = argv[++i];
        break;
      case "-h":
      case "--help":
        printUsage();
        process.exit(0);
      default:
        if (!args.prompt) {
          args.prompt = arg;
        } else {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
    }
  }

  return args;
}

function resolveOutputPath(output, index, count) {
  if (output && count === 1) {
    return path.resolve(output);
  }
  const timestamp = Date.now();
  const base = output
    ? path.parse(output)
    : { dir: ".", name: `generated-${timestamp}`, ext: ".png" };
  if (count > 1) {
    return path.resolve(base.dir, `${base.name}-${index + 1}${base.ext || ".png"}`);
  }
  return path.resolve(base.dir, `${base.name}${base.ext || ".png"}`);
}

async function generateImage(client, args) {
  console.log(`Generating image with prompt: "${args.prompt}"`);

  const params = {
    model: args.model,
    prompt: args.prompt,
    n: args.count,
    size: args.size,
    quality: args.quality,
  };

  const result = await client.images.generate(params);

  const paths = [];
  for (let i = 0; i < result.data.length; i++) {
    const outputPath = resolveOutputPath(args.output, i, args.count);
    const imageBytes = Buffer.from(result.data[i].b64_json, "base64");
    fs.writeFileSync(outputPath, imageBytes);
    paths.push(outputPath);
    console.log(`Saved: ${outputPath}`);
  }
  return paths;
}

async function editImage(client, args) {
  const imagePath = path.resolve(args.image);
  if (!fs.existsSync(imagePath)) {
    console.error(`Input image not found: ${imagePath}`);
    process.exit(1);
  }

  console.log(`Editing image "${imagePath}" with prompt: "${args.prompt}"`);

  const imageFile = fs.createReadStream(imagePath);

  const params = {
    model: args.model,
    prompt: args.prompt,
    image: imageFile,
    n: args.count,
    size: args.size,
    quality: args.quality,
  };

  const result = await client.images.edit(params);

  const paths = [];
  for (let i = 0; i < result.data.length; i++) {
    const outputPath = resolveOutputPath(args.output, i, args.count);
    const imageBytes = Buffer.from(result.data[i].b64_json, "base64");
    fs.writeFileSync(outputPath, imageBytes);
    paths.push(outputPath);
    console.log(`Saved: ${outputPath}`);
  }
  return paths;
}

async function main() {
  const args = parseArgs(process.argv);

  if (!args.prompt) {
    console.error("Error: --prompt is required");
    printUsage();
    process.exit(1);
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error("Error: OPENAI_API_KEY environment variable is not set");
    process.exit(1);
  }

  const client = new OpenAI();

  try {
    if (args.image) {
      await editImage(client, args);
    } else {
      await generateImage(client, args);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    if (err.status) {
      console.error(`Status: ${err.status}`);
    }
    process.exit(1);
  }
}

main();
