import { Command, CommanderError } from "commander";
import { setOutputMode, error as outputError } from "./output.ts";
import { toCliError, RateLimitError, EXIT_BAD_ARG } from "./errors.ts";
import { registerAuthCommand } from "./commands/auth.ts";
import { registerChannelsCommand } from "./commands/channels.ts";
import { registerMessagesCommand } from "./commands/messages.ts";
import { registerUsersCommand } from "./commands/users.ts";
import { registerDmCommand } from "./commands/dm.ts";
import { registerReactionsCommand } from "./commands/reactions.ts";
import { registerFilesCommand } from "./commands/files.ts";

const program = new Command();

program
  .name("slack-cli")
  .description("Slack CLI — JSON-first command-line interface for the Slack API")
  .version("1.0.0")
  .option("--token <token>", "Slack API token (overrides $SLACK_TOKEN and config)")
  .option("--cookie <cookie>", "Browser 'd' cookie (required for xoxc- tokens, or set $SLACK_COOKIE)")
  .option("--pretty", "Pretty-print JSON output")
  .option("--raw", "Output raw API response data (no wrapper)")
  .option("--quiet", "Suppress non-essential output")
  .hook("preAction", (_thisCommand, _actionCommand) => {
    const opts = program.opts();
    if (opts.pretty) setOutputMode("pretty");
    else if (opts.raw) setOutputMode("raw");
    if (opts.quiet) process.env.SLACK_CLI_QUIET = "1";
    // Make global --cookie available to resolveCookie() via env
    if (opts.cookie && !process.env.SLACK_COOKIE) {
      process.env.SLACK_COOKIE = opts.cookie;
    }
  });

// Register all command groups
registerAuthCommand(program);
registerChannelsCommand(program);
registerMessagesCommand(program);
registerUsersCommand(program);
registerDmCommand(program);
registerReactionsCommand(program);
registerFilesCommand(program);

// Apply exitOverride recursively so commander throws instead of calling process.exit
// Redirect commander's own stderr to stdout for JSON-consuming callers
function applyOverrides(cmd: Command): void {
  cmd.exitOverride();
  cmd.configureOutput({
    writeErr: () => {}, // suppress — we output JSON errors in the catch block
  });
  for (const sub of cmd.commands) {
    applyOverrides(sub);
  }
}
applyOverrides(program);

try {
  await program.parseAsync(process.argv);
} catch (err: unknown) {
  if (err instanceof CommanderError) {
    // Help and version: commander already wrote output, just exit cleanly
    if (err.code === "commander.helpDisplayed" || err.code === "commander.version") {
      process.exit(0);
    }
    // Commander validation errors (missing required option, unknown option, etc.)
    outputError("bad_argument", err.message, EXIT_BAD_ARG);
    process.exit(EXIT_BAD_ARG);
  }

  const cliErr = toCliError(err);
  const retryAfter = cliErr instanceof RateLimitError ? cliErr.retryAfter : undefined;
  outputError(cliErr.slackError ?? "cli_error", cliErr.message, cliErr.exitCode, retryAfter);
  process.exit(cliErr.exitCode);
}
