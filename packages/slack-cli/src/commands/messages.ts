import { Command } from "commander";
import { getClient, resolveChannelId } from "../client.ts";
import { success } from "../output.ts";
import { BadArgError } from "../errors.ts";

export function registerMessagesCommand(program: Command): void {
  const messages = program
    .command("messages")
    .description("Send, search, and manage messages");

  messages
    .command("send")
    .description("Post a message to a channel")
    .requiredOption("--channel <id|name>", "Channel ID or name")
    .requiredOption("--text <text>", "Message text")
    .option("--unfurl-links", "Unfurl links", false)
    .option("--unfurl-media", "Unfurl media", false)
    .action(
      async (opts: {
        channel: string;
        text: string;
        unfurlLinks: boolean;
        unfurlMedia: boolean;
      }) => {
        const client = getClient(program.opts().token);
        const channelId = await resolveChannelId(client, opts.channel);
        const res = await client.chat.postMessage({
          channel: channelId,
          text: opts.text,
          unfurl_links: opts.unfurlLinks,
          unfurl_media: opts.unfurlMedia,
        });
        success({
          channel: res.channel,
          ts: res.ts,
          message: res.message,
        });
      },
    );

  messages
    .command("reply")
    .description("Reply in a thread")
    .requiredOption("--channel <id|name>", "Channel ID or name")
    .requiredOption("--thread-ts <ts>", "Thread timestamp to reply to")
    .requiredOption("--text <text>", "Reply text")
    .option("--broadcast", "Also post to channel", false)
    .action(
      async (opts: {
        channel: string;
        threadTs: string;
        text: string;
        broadcast: boolean;
      }) => {
        const client = getClient(program.opts().token);
        const channelId = await resolveChannelId(client, opts.channel);
        const res = await client.chat.postMessage({
          channel: channelId,
          text: opts.text,
          thread_ts: opts.threadTs,
          reply_broadcast: opts.broadcast,
        });
        success({
          channel: res.channel,
          ts: res.ts,
          thread_ts: opts.threadTs,
          message: res.message,
        });
      },
    );

  messages
    .command("thread")
    .description("Read replies in a thread")
    .requiredOption("--channel <id|name>", "Channel ID or name")
    .requiredOption("--thread-ts <ts>", "Thread parent timestamp")
    .option("--limit <n>", "Number of replies", "20")
    .option("--before <ts>", "Replies before this timestamp")
    .option("--after <ts>", "Replies after this timestamp")
    .option("--cursor <cursor>", "Pagination cursor")
    .option("--inclusive", "Include messages at --before/--after boundaries", false)
    .action(
      async (opts: {
        channel: string;
        threadTs: string;
        limit: string;
        before?: string;
        after?: string;
        cursor?: string;
        inclusive: boolean;
      }) => {
        const client = getClient(program.opts().token);
        const channelId = await resolveChannelId(client, opts.channel);
        const res = await client.conversations.replies({
          channel: channelId,
          ts: opts.threadTs,
          limit: parseInt(opts.limit, 10),
          latest: opts.before,
          oldest: opts.after,
          inclusive: opts.inclusive,
          cursor: opts.cursor,
        });

        const data = (res.messages ?? []).map((m) => ({
          ts: m.ts,
          user: m.user,
          text: m.text,
          type: m.type,
          subtype: m.subtype,
          thread_ts: m.thread_ts,
          parent_user_id: m.parent_user_id,
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

  messages
    .command("search")
    .description("Search messages (requires xoxp- user token)")
    .requiredOption("--query <query>", "Search query")
    .option("--channel <name>", "Limit to channel (added to query)")
    .option("--from <user>", "Limit to user (added to query)")
    .option("--limit <n>", "Max results", "20")
    .action(
      async (opts: {
        query: string;
        channel?: string;
        from?: string;
        limit: string;
      }) => {
        const client = getClient(program.opts().token);
        let query = opts.query;
        if (opts.channel) query += ` in:${opts.channel}`;
        if (opts.from) query += ` from:${opts.from}`;

        const res = await client.search.messages({
          query,
          count: parseInt(opts.limit, 10),
        });

        const matches = res.messages?.matches ?? [];
        const data = matches.map((m: Record<string, unknown>) => ({
          ts: m.ts,
          channel: m.channel,
          user: m.user,
          username: m.username,
          text: m.text,
          permalink: m.permalink,
        }));

        success(data, {
          count: data.length,
          total: res.messages?.total ?? 0,
        });
      },
    );

  messages
    .command("update")
    .description("Edit a message")
    .requiredOption("--channel <id|name>", "Channel ID or name")
    .requiredOption("--ts <ts>", "Message timestamp")
    .requiredOption("--text <text>", "New text")
    .action(async (opts: { channel: string; ts: string; text: string }) => {
      const client = getClient(program.opts().token);
      const channelId = await resolveChannelId(client, opts.channel);
      const res = await client.chat.update({
        channel: channelId,
        ts: opts.ts,
        text: opts.text,
      });
      success({ channel: res.channel, ts: res.ts, text: opts.text });
    });

  messages
    .command("delete")
    .description("Delete a message")
    .requiredOption("--channel <id|name>", "Channel ID or name")
    .requiredOption("--ts <ts>", "Message timestamp")
    .action(async (opts: { channel: string; ts: string }) => {
      const client = getClient(program.opts().token);
      const channelId = await resolveChannelId(client, opts.channel);
      const res = await client.chat.delete({
        channel: channelId,
        ts: opts.ts,
      });
      success({ channel: res.channel, ts: res.ts, deleted: true });
    });
}
