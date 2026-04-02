import { createServer, type Server, type IncomingMessage, type ServerResponse } from "node:http";
import { URL } from "node:url";
import { BadArgError, NetworkError } from "./errors.ts";

// Default scopes that cover all slack-cli functionality
const DEFAULT_SCOPES = [
  "channels:history",
  "channels:read",
  "channels:write",
  "chat:write",
  "files:read",
  "files:write",
  "groups:history",
  "groups:read",
  "groups:write",
  "im:history",
  "im:read",
  "im:write",
  "mpim:history",
  "mpim:read",
  "mpim:write",
  "reactions:read",
  "reactions:write",
  "search:read",
  "users:read",
  "users:read.email",
].join(",");

interface OAuthResult {
  access_token: string;
  token_type: string;
  scope: string;
  team: { id: string; name: string };
  authed_user: {
    id: string;
    access_token: string;
    token_type: string;
    scope: string;
  };
}

const SUCCESS_HTML = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>slack-cli</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; display: flex;
    justify-content: center; align-items: center; height: 100vh; margin: 0;
    background: #1a1a2e; color: #e0e0e0; }
  .card { text-align: center; padding: 2rem 3rem; background: #16213e;
    border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.3); }
  h1 { color: #4ecca3; margin-bottom: 0.5rem; }
  p { color: #a0a0b0; }
</style>
</head>
<body><div class="card">
  <h1>&#10003; Authenticated</h1>
  <p>You can close this tab and return to your terminal.</p>
</div></body>
</html>`;

const ERROR_HTML = (msg: string) => `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>slack-cli — error</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; display: flex;
    justify-content: center; align-items: center; height: 100vh; margin: 0;
    background: #1a1a2e; color: #e0e0e0; }
  .card { text-align: center; padding: 2rem 3rem; background: #16213e;
    border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.3); }
  h1 { color: #e74c3c; margin-bottom: 0.5rem; }
  p { color: #a0a0b0; }
  code { background: #0f3460; padding: 0.2em 0.5em; border-radius: 4px; }
</style>
</head>
<body><div class="card">
  <h1>&#10007; Authentication Failed</h1>
  <p><code>${msg}</code></p>
  <p>Return to your terminal for details.</p>
</div></body>
</html>`;

/**
 * Start a local HTTP server, open the browser to Slack's OAuth authorize page,
 * wait for the callback with the auth code, exchange it for a token.
 */
export async function runOAuthFlow(
  clientId: string,
  clientSecret: string,
  opts?: { team?: string; scopes?: string },
): Promise<OAuthResult> {
  const scopes = opts?.scopes ?? DEFAULT_SCOPES;

  return new Promise<OAuthResult>((resolve, reject) => {
    let server: Server;
    let settled = false;

    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
      // Give the browser a moment to receive the response before closing
      setTimeout(() => server.close(), 500);
    };

    server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url ?? "/", `http://localhost`);

      if (url.pathname !== "/callback") {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      const error = url.searchParams.get("error");
      if (error) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(ERROR_HTML(error));
        settle(() => reject(new BadArgError(`OAuth denied: ${error}`)));
        return;
      }

      const code = url.searchParams.get("code");
      if (!code) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(ERROR_HTML("No authorization code received"));
        settle(() => reject(new BadArgError("No authorization code in callback")));
        return;
      }

      // Exchange code for token
      try {
        const tokenRes = await exchangeCode(clientId, clientSecret, code, getRedirectUri(server));
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(SUCCESS_HTML);
        settle(() => resolve(tokenRes));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(ERROR_HTML(msg));
        settle(() => reject(err));
      }
    });

    // Listen on a random available port
    server.listen(0, "127.0.0.1", () => {
      const redirectUri = getRedirectUri(server);
      const authorizeUrl = buildAuthorizeUrl(clientId, redirectUri, scopes, opts?.team);

      process.stderr.write(`\nOpening browser to authorize with Slack...\n`);
      process.stderr.write(`If the browser doesn't open, visit:\n${authorizeUrl}\n\n`);
      process.stderr.write(`Waiting for authorization...\n`);

      openBrowser(authorizeUrl);
    });

    server.on("error", (err) => {
      settle(() => reject(new NetworkError(`Local server error: ${err.message}`)));
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      settle(() => reject(new BadArgError("OAuth flow timed out after 5 minutes")));
    }, 5 * 60 * 1000);
  });
}

function getRedirectUri(server: Server): string {
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("Server not bound");
  return `http://127.0.0.1:${addr.port}/callback`;
}

function buildAuthorizeUrl(
  clientId: string,
  redirectUri: string,
  scopes: string,
  team?: string,
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    user_scope: scopes,
    redirect_uri: redirectUri,
  });
  if (team) params.set("team", team);
  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

async function exchangeCode(
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string,
): Promise<OAuthResult> {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  });

  const res = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    throw new NetworkError(`Token exchange failed: HTTP ${res.status}`);
  }

  const data = (await res.json()) as Record<string, unknown>;
  if (!data.ok) {
    throw new BadArgError(`Token exchange failed: ${data.error ?? "unknown error"}`);
  }

  return data as unknown as OAuthResult;
}

function openBrowser(url: string): void {
  const { execSync } = require("node:child_process");
  try {
    switch (process.platform) {
      case "darwin":
        execSync(`open ${JSON.stringify(url)}`);
        break;
      case "linux":
        execSync(`xdg-open ${JSON.stringify(url)}`);
        break;
      case "win32":
        execSync(`start "" ${JSON.stringify(url)}`);
        break;
    }
  } catch {
    // Browser open failed — user can copy the URL from stderr
  }
}
