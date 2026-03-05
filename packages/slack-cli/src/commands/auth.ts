import { Command } from "commander";
import { readConfig, writeConfig, getConfigPath } from "../config.ts";
import { getClient, resolveToken, resolveCookie } from "../client.ts";
import { success } from "../output.ts";
import { BadArgError } from "../errors.ts";

export function registerAuthCommand(program: Command): void {
  const auth = program.command("auth").description("Manage authentication");

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
