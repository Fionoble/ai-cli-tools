import { mkdirSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { FileIOError } from "./errors.ts";

export interface Config {
  token?: string;
  cookie?: string;
  team_id?: string;
  team_name?: string;
  user_id?: string;
  user_name?: string;
  client_id?: string;
  client_secret?: string;
}

const CONFIG_DIR = join(homedir(), ".config", "slack-cli");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export function readConfig(): Config {
  try {
    const raw = readFileSync(CONFIG_FILE, "utf-8");
    return JSON.parse(raw) as Config;
  } catch {
    return {};
  }
}

export function writeConfig(config: Config): void {
  try {
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + "\n", {
      mode: 0o600,
    });
    chmodSync(CONFIG_FILE, 0o600);
  } catch (err) {
    throw new FileIOError(
      `Failed to write config to ${CONFIG_FILE}: ${err instanceof Error ? err.message : err}`,
    );
  }
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}
