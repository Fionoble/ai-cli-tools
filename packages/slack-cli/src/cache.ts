import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const CACHE_DIR = join(homedir(), ".config", "slack-cli");
const CACHE_FILE = join(CACHE_DIR, "cache.json");
const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CacheEntry {
  id: string;
  ts: number;
}

interface CacheData {
  [key: string]: CacheEntry;
}

let _cache: CacheData | null = null;

function readCache(): CacheData {
  if (_cache) return _cache;
  try {
    const raw = readFileSync(CACHE_FILE, "utf-8");
    _cache = JSON.parse(raw) as CacheData;
    return _cache!;
  } catch {
    _cache = {};
    return _cache;
  }
}

function writeCache(data: CacheData): void {
  try {
    mkdirSync(CACHE_DIR, { recursive: true, mode: 0o700 });
    writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2) + "\n", {
      mode: 0o600,
    });
  } catch {
    // Cache write failures are non-fatal — silently ignore
  }
}

export function getCachedId(
  type: "channel" | "user",
  key: string,
  ttlMs: number = DEFAULT_TTL_MS,
): string | null {
  const cache = readCache();
  const entry = cache[`${type}:${key}`];
  if (entry && Date.now() - entry.ts < ttlMs) return entry.id;
  return null;
}

export function setCachedId(
  type: "channel" | "user",
  key: string,
  id: string,
): void {
  const cache = readCache();
  cache[`${type}:${key}`] = { id, ts: Date.now() };
  _cache = cache;
  writeCache(cache);
}

/**
 * Bulk-cache multiple entries at once (e.g. from a list call).
 * Each entry maps a lookup key to an ID.
 */
export function bulkCache(
  type: "channel" | "user",
  entries: Array<{ key: string; id: string }>,
): void {
  const cache = readCache();
  const now = Date.now();
  for (const { key, id } of entries) {
    cache[`${type}:${key}`] = { id, ts: now };
  }
  _cache = cache;
  writeCache(cache);
}

export function clearCache(): void {
  _cache = {};
  writeCache({});
}
