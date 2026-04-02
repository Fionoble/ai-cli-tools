import { Command } from "commander";
import { getClient, resolveChannelId } from "../client.ts";
import { success } from "../output.ts";
import { BadArgError } from "../errors.ts";
import { bulkCache } from "../cache.ts";

export function registerChannelsCommand(program: Command): void {
  const channels = program
    .command("channels")
    .description("Manage channels and conversations");

  channels
    .command("list")
    .description("List conversations")
    .option(
      "--type <types>",
      "Comma-separated: public_channel,private_channel,mpim,im",
      "public_channel,private_channel",
    )
    .option("--limit <n>", "Max results per page", "100")
    .option("--cursor <cursor>", "Pagination cursor")
    .action(async (opts: { type: string; limit: string; cursor?: string }) => {
      const client = getClient(program.opts().token);
      const res = await client.conversations.list({
        types: opts.type,
        limit: parseInt(opts.limit, 10),
        cursor: opts.cursor,
      });

      const channels = res.channels ?? [];

      // Bulk-cache all returned channels for future name resolution
      bulkCache(
        "channel",
        channels.filter((c) => c.name && c.id).map((c) => ({ key: c.name!, id: c.id! })),
      );

      const data = channels.map((c) => ({
        id: c.id,
        name: c.name,
        is_channel: c.is_channel,
        is_private: c.is_private,
        is_member: c.is_member,
        is_archived: c.is_archived,
        num_members: c.num_members,
        topic: c.topic?.value,
        purpose: c.purpose?.value,
      }));

      const nextCursor = res.response_metadata?.next_cursor;
      success(data, {
        count: data.length,
        ...(nextCursor ? { next_cursor: nextCursor, has_more: true } : { has_more: false }),
      });
    });

  channels
    .command("info")
    .description("Get channel details")
    .requiredOption("--channel <id|name>", "Channel ID or name")
    .action(async (opts: { channel: string }) => {
      const client = getClient(program.opts().token);
      const channelId = await resolveChannelId(client, opts.channel);
      const res = await client.conversations.info({ channel: channelId });
      success(res.channel);
    });

  channels
    .command("history")
    .description("Read channel message history")
    .requiredOption("--channel <id|name>", "Channel ID or name")
    .option("--limit <n>", "Number of messages", "20")
    .option("--before <ts>", "Messages before this timestamp")
    .option("--after <ts>", "Messages after this timestamp")
    .option("--cursor <cursor>", "Pagination cursor")
    .action(
      async (opts: {
        channel: string;
        limit: string;
        before?: string;
        after?: string;
        cursor?: string;
      }) => {
        const client = getClient(program.opts().token);
        const channelId = await resolveChannelId(client, opts.channel);
        const res = await client.conversations.history({
          channel: channelId,
          limit: parseInt(opts.limit, 10),
          latest: opts.before,
          oldest: opts.after,
          cursor: opts.cursor,
        });

        const data = (res.messages ?? []).map((m) => ({
          ts: m.ts,
          user: m.user,
          text: m.text,
          type: m.type,
          subtype: m.subtype,
          thread_ts: m.thread_ts,
          reply_count: m.reply_count,
          reactions: m.reactions,
        }));

        const nextCursor = res.response_metadata?.next_cursor;
        success(data, {
          count: data.length,
          has_more: res.has_more ?? false,
          ...(nextCursor ? { next_cursor: nextCursor } : {}),
        });
      },
    );

  channels
    .command("join")
    .description("Join a public channel")
    .requiredOption("--channel <id|name>", "Channel ID or name")
    .action(async (opts: { channel: string }) => {
      const client = getClient(program.opts().token);
      const channelId = await resolveChannelId(client, opts.channel);
      const res = await client.conversations.join({ channel: channelId });
      success({ channel: res.channel?.id, name: res.channel?.name, already_in_channel: res.already_in_channel });
    });
}
