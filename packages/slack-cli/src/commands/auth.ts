import { Command } from "commander";
import { readConfig, writeConfig, getConfigPath } from "../config.ts";
import { getClient, resolveToken, resolveCookie } from "../client.ts";
import { success } from "../output.ts";
import { BadArgError } from "../errors.ts";
import { runOAuthFlow } from "../oauth.ts";

export function registerAuthCommand(program: Command): void {
  const auth = program.command("auth").description("Manage authentication (runs 'login' by default)");

  auth
    .command("setup")
    .description("Configure Slack API token")
    .argument("[token]", "Slack API token (xoxb-..., xoxp-..., or xoxc-...)")
    .option(
      "--cookie <cookie>",
      "Browser 'd' cookie value (required for xoxc- tokens)",
    )
    .action(async (argToken?: string, opts?: { cookie?: string }) => {
      // Resolution: positional arg > global --token flag > stdin
      let token = argToken ?? program.opts().token;

      if (!token) {
        if (!process.stdin.isTTY) {
          const chunks: Buffer[] = [];
          for await (const chunk of process.stdin) {
            chunks.push(chunk as Buffer);
          }
          token = Buffer.concat(chunks).toString().trim();
        }
      }

      if (!token) {
        if (process.stdin.isTTY) {
          process.stderr.write("Enter Slack token: ");
          const chunks: Buffer[] = [];
          for await (const chunk of process.stdin) {
            chunks.push(chunk as Buffer);
            break;
          }
          token = Buffer.concat(chunks).toString().trim();
        }
      }

      if (!token) {
        throw new BadArgError(
          "No token provided. Use: slack-cli auth setup <token>, or pipe via stdin.",
        );
      }

      const cookie = opts?.cookie ?? process.env.SLACK_COOKIE;

      // xoxc- tokens require a cookie
      if (token.startsWith("xoxc-") && !cookie) {
        throw new BadArgError(
          "xoxc- tokens require a cookie. Use --cookie <value> or set $SLACK_COOKIE.\n" +
            "To find your cookie: open Slack in browser → DevTools → Application → Cookies → copy the 'd' value.",
        );
      }

      const client = getClient(token, cookie);
      const res = await client.auth.test();

      const config = readConfig();
      config.token = token;
      config.cookie = cookie;
      config.team_id = res.team_id;
      config.team_name = res.team;
      config.user_id = res.user_id;
      config.user_name = res.user;
      writeConfig(config);

      success({
        message: "Token saved",
        config_path: getConfigPath(),
        team: res.team,
        user: res.user,
        token_type: token.startsWith("xoxc-")
          ? "xoxc (cookie)"
          : token.startsWith("xoxb-")
            ? "xoxb (bot)"
            : token.startsWith("xoxp-")
              ? "xoxp (user)"
              : "unknown",
      });
    });

  auth
    .command("login")
    .description("Authenticate via browser (OAuth 2.0)")
    .option("--client-id <id>", "Slack app client ID (or $SLACK_CLIENT_ID)")
    .option("--client-secret <secret>", "Slack app client secret (or $SLACK_CLIENT_SECRET)")
    .option("--team <team_id>", "Pre-select a workspace")
    .option("--scopes <scopes>", "Comma-separated OAuth scopes (advanced)")
    .option("--no-save-app", "Don't persist client_id/client_secret to config")
    .action(
      async (opts: {
        clientId?: string;
        clientSecret?: string;
        team?: string;
        scopes?: string;
        saveApp: boolean;
      }) => {
        const config = readConfig();

        const clientId =
          opts.clientId ?? process.env.SLACK_CLIENT_ID ?? config.client_id;
        const clientSecret =
          opts.clientSecret ?? process.env.SLACK_CLIENT_SECRET ?? config.client_secret;

        if (!clientId || !clientSecret) {
          throw new BadArgError(
            "Missing Slack app credentials.\n\n" +
              "To use browser login you need a Slack app with a redirect URL of http://127.0.0.1:<port>/callback.\n\n" +
              "Quick setup:\n" +
              "  1. Visit https://api.slack.com/apps and create (or pick) an app\n" +
              "  2. Under OAuth & Permissions → Redirect URLs, add: http://127.0.0.1/callback\n" +
              "     (Slack allows any port on 127.0.0.1 when the host matches)\n" +
              "  3. Copy the Client ID and Client Secret from Basic Information\n" +
              "  4. Run:\n" +
              "       slack-cli auth login --client-id <id> --client-secret <secret>\n" +
              "     Or set SLACK_CLIENT_ID and SLACK_CLIENT_SECRET env vars.\n" +
              "\n" +
              "Credentials are saved to config so you only need to provide them once.",
          );
        }

        // Persist app credentials for future logins
        if (opts.saveApp && (opts.clientId || opts.clientSecret)) {
          config.client_id = clientId;
          config.client_secret = clientSecret;
          writeConfig(config);
        }

        const result = await runOAuthFlow(clientId, clientSecret, {
          team: opts.team,
          scopes: opts.scopes,
        });

        // Use the user token (authed_user.access_token) for xoxp- scoped operations
        const token = result.authed_user?.access_token ?? result.access_token;
        const tokenType = token.startsWith("xoxp-")
          ? "xoxp (user)"
          : token.startsWith("xoxb-")
            ? "xoxb (bot)"
            : "unknown";

        // Verify the token
        const client = getClient(token);
        const authRes = await client.auth.test();

        // Save to config
        const updated = readConfig();
        updated.token = token;
        updated.cookie = undefined; // OAuth tokens don't need cookies
        updated.team_id = authRes.team_id ?? result.team?.id;
        updated.team_name = authRes.team ?? result.team?.name;
        updated.user_id = authRes.user_id ?? result.authed_user?.id;
        updated.user_name = authRes.user;
        // Preserve app credentials
        updated.client_id = clientId;
        updated.client_secret = clientSecret;
        writeConfig(updated);

        success({
          message: "Authenticated via browser",
          config_path: getConfigPath(),
          team: updated.team_name,
          user: updated.user_name,
          token_type: tokenType,
          scopes: result.authed_user?.scope ?? result.scope,
        });
      },
    );

  auth
    .command("test")
    .description("Verify configured token")
    .action(async () => {
      const info = resolveToken(program.opts().token);
      const client = getClient(info.token, info.cookie);
      const res = await client.auth.test();

      success({
        url: res.url,
        team: res.team,
        team_id: res.team_id,
        user: res.user,
        user_id: res.user_id,
        bot_id: res.bot_id,
        is_enterprise_install: res.is_enterprise_install,
      });
    });

  auth
    .command("whoami")
    .description("Show current identity")
    .action(async () => {
      const info = resolveToken(program.opts().token);
      const client = getClient(info.token, info.cookie);
      const res = await client.auth.test();

      success({
        user: res.user,
        user_id: res.user_id,
        team: res.team,
        team_id: res.team_id,
        url: res.url,
      });
    });
}
