import { WebClient } from "@slack/web-api";
import { readConfig } from "./config.ts";
import { NoTokenError, BadArgError, ApiError } from "./errors.ts";

let _client: WebClient | null = null;
let _resolvedToken: string | null = null;

interface TokenInfo {
  token: string;
  cookie?: string;
}

export function resolveToken(flagToken?: string): TokenInfo {
  if (flagToken) {
    return { token: flagToken, cookie: process.env.SLACK_COOKIE };
  }
  if (process.env.SLACK_TOKEN) {
    return { token: process.env.SLACK_TOKEN, cookie: process.env.SLACK_COOKIE };
  }
  const config = readConfig();
  if (config.token) {
    return { token: config.token, cookie: config.cookie };
  }
  throw new NoTokenError();
}

export function resolveCookie(flagCookie?: string): string | undefined {
  if (flagCookie) return flagCookie;
  if (process.env.SLACK_COOKIE) return process.env.SLACK_COOKIE;
  const config = readConfig();
  return config.cookie;
}

export function getClient(tokenOrFlag?: string, cookie?: string): WebClient {
  let token: string;
  let resolvedCookie: string | undefined;

  if (tokenOrFlag) {
    token = tokenOrFlag;
    resolvedCookie = cookie ?? resolveCookie();
  } else {
    const info = resolveToken();
    token = info.token;
    resolvedCookie = cookie ?? info.cookie;
  }

  const cacheKey = token + (resolvedCookie ?? "");
  if (_client && _resolvedToken === cacheKey) return _client;
  _resolvedToken = cacheKey;

  const headers: Record<string, string> = {};
  if (resolvedCookie) {
    // xoxc- tokens require the 'd' cookie
    headers.cookie = resolvedCookie.startsWith("d=")
      ? resolvedCookie
      : `d=${resolvedCookie}`;
  }

  _client = new WebClient(token, {
    headers,
  });
  return _client;
}

const CHANNEL_ID_RE = /^C[A-Z0-9]+$/;

export async function resolveChannelId(
  client: WebClient,
  input: string,
): Promise<string> {
  if (CHANNEL_ID_RE.test(input)) return input;

  const name = input.replace(/^#/, "");
  let cursor: string | undefined;
  do {
    const res = await client.conversations.list({
      types: "public_channel,private_channel",
      limit: 200,
      cursor,
    });
    const ch = res.channels?.find((c) => c.name === name);
    if (ch?.id) return ch.id;
    cursor = res.response_metadata?.next_cursor || undefined;
  } while (cursor);

  throw new BadArgError(`Channel not found: ${input}`);
}

const USER_ID_RE = /^U[A-Z0-9]+$/;

export async function resolveUserId(
  client: WebClient,
  input: string,
): Promise<string> {
  if (USER_ID_RE.test(input)) return input;

  if (input.includes("@") && input.includes(".")) {
    const res = await client.users.lookupByEmail({ email: input });
    if (res.user?.id) return res.user.id;
    throw new BadArgError(`User not found by email: ${input}`);
  }

  const handle = input.replace(/^@/, "");
  let cursor: string | undefined;
  do {
    const res = await client.users.list({ limit: 200, cursor });
    const user = res.members?.find(
      (m) => m.name === handle || m.profile?.display_name === handle,
    );
    if (user?.id) return user.id;
    cursor = res.response_metadata?.next_cursor || undefined;
  } while (cursor);

  throw new BadArgError(`User not found: ${input}`);
}

export async function openDmChannel(
  client: WebClient,
  userId: string,
): Promise<string> {
  const res = await client.conversations.open({ users: userId });
  if (!res.channel?.id) throw new ApiError("dm_open_failed", "Could not open DM channel");
  return res.channel.id;
}
