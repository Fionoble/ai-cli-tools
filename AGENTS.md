# AGENTS.md

## Project Overview

Monorepo of AI-powered CLI tools published under the `@fionoble` npm scope. Each package wraps an external AI API (currently OpenAI) and doubles as a Claude Code skill.

## Repo Structure

```
ai-cli-tools/
├── packages/          ← each subdirectory is an independent CLI tool
│   ├── fcd/           ← @fionoble/fcd (shell function, not a Node.js CLI)
│   ├── image-gen-cli/ ← @fionoble/image-gen-cli
│   ├── issue-watcher/ ← @fionoble/issue-watcher (GitHub issue → PR automation)
│   └── tts-cli/       ← @fionoble/tts-cli
├── install.sh         ← links all CLIs globally + installs Claude Code skills
├── pnpm-workspace.yaml
└── package.json       ← root (private, no publishable code here)
```

## Conventions

### Package structure

Every package follows this layout:

```
packages/<name>/
├── index.js           ← single-file CLI entry point (CommonJS, #!/usr/bin/env node)
├── package.json       ← scoped to @fionoble, "type": "commonjs"
├── skill/SKILL.md     ← Claude Code skill definition
└── README.md
```

**Note:** Not all packages are Node.js CLIs. `fcd` is a pure shell function sourced into the user's shell — it has no `index.js`, no bin entry, and no Node.js dependencies.

### Key patterns

- **Single-file CLIs**: each tool is one `index.js` with no build step. Keep it that way.
- **CommonJS**: all packages use `"type": "commonjs"` with `require()`.
- **No frameworks**: argument parsing is hand-rolled (no yargs/commander). Follow the existing flag-parsing style.
- **Dual bin names**: each package exposes two bin aliases — a short name (e.g. `tts`) and a long name (e.g. `tts-cli`) for npx compatibility.
- **Skill install/uninstall**: every CLI supports `--install-skill` and `--uninstall-skill` flags that copy/remove `skill/SKILL.md` to/from `~/.claude/skills/<name>/`.
- **Environment variables**: tools use `OPENAI_API_KEY` (required) and `OPENAI_BASE_URL` (optional). New tools wrapping OpenAI should follow the same pattern.
- **Node.js 18+**: minimum version requirement.

### Adding a new package

1. Create `packages/<name>/` with `index.js`, `package.json`, `skill/SKILL.md`, and `README.md`.
2. Follow the existing package.json shape — `@fionoble` scope, dual bin names, `"files"` array including `index.js` and `skill/SKILL.md`.
3. Add the `--install-skill` / `--uninstall-skill` handlers (copy the pattern from an existing package).
4. Update `install.sh` to link the new CLI and copy its skill.
5. Keep the CLI as a single `index.js` file unless complexity genuinely demands splitting.

### Skill files (SKILL.md)

Skill files have YAML frontmatter with `name`, `description`, and `allowed-tools`, followed by markdown documentation. They should include:
- Tool location (global command + npx fallback)
- All CLI flags in a table
- Environment variable requirements
- Instructions for Claude on how to use the tool well
- Practical examples

### Publishing

Packages are published individually to npm via `pnpm publish` from within each package directory.

## Dependencies

- **pnpm** for workspace management
- **openai** SDK (^6.25.0) is the only runtime dependency currently
