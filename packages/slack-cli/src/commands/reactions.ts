import { Command } from "commander";
import { getClient, resolveChannelId } from "../client.ts";
import { success } from "../output.ts";

export function registerReactionsCommand(program: Command): void {
  const reactions = program
    .command("reactions")
    .description("Manage message reactions");

  reactions
    .command("add")
    .description("Add a reaction to a message")
    .requiredOption("--channel <id|name>", "Channel ID or name")
    .requiredOption("--ts <ts>", "Message timestamp")
    .requiredOption("--name <emoji>", "Reaction name (without colons)")
    .action(async (opts: { channel: string; ts: string; name: string }) => {
      const client = getClient(program.opts().token);
      const channelId = await resolveChannelId(client, opts.channel);
      await client.reactions.add({
        channel: channelId,
        timestamp: opts.ts,
        name: opts.name,
      });
      success({ channel: channelId, ts: opts.ts, reaction: opts.name, added: true });
    });

  reactions
    .command("remove")
    .description("Remove a reaction from a message")
    .requiredOption("--channel <id|name>", "Channel ID or name")
    .requiredOption("--ts <ts>", "Message timestamp")
    .requiredOption("--name <emoji>", "Reaction name (without colons)")
    .action(async (opts: { channel: string; ts: string; name: string }) => {
      const client = getClient(program.opts().token);
      const channelId = await resolveChannelId(client, opts.channel);
      await client.reactions.remove({
        channel: channelId,
        timestamp: opts.ts,
        name: opts.name,
      });
      success({ channel: channelId, ts: opts.ts, reaction: opts.name, removed: true });
    });

  reactions
    .command("get")
    .description("List reactions on a message")
    .requiredOption("--channel <id|name>", "Channel ID or name")
    .requiredOption("--ts <ts>", "Message timestamp")
    .action(async (opts: { channel: string; ts: string }) => {
      const client = getClient(program.opts().token);
      const channelId = await resolveChannelId(client, opts.channel);
      const res = await client.reactions.get({
        channel: channelId,
        timestamp: opts.ts,
        full: true,
      });

      const message = res.message as Record<string, unknown> | undefined;
      const reactions = (message?.reactions as Array<Record<string, unknown>>) ?? [];
      success({
        channel: channelId,
        ts: opts.ts,
        reactions: reactions.map((r) => ({
          name: r.name,
          count: r.count,
          users: r.users,
        })),
      });
    });
}
