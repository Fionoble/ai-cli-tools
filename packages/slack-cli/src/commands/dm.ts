import { Command } from "commander";
import { getClient, resolveUserId, openDmChannel } from "../client.ts";
import { success } from "../output.ts";

export function registerDmCommand(program: Command): void {
  const dm = program
    .command("dm")
    .description("Direct messages");

  dm
    .command("open")
    .description("Open or find a DM channel with a user")
    .requiredOption("--user <id|handle|email>", "User ID, handle, or email")
    .action(async (opts: { user: string }) => {
      const client = getClient(program.opts().token);
      const userId = await resolveUserId(client, opts.user);
      const channelId = await openDmChannel(client, userId);
      success({ channel: channelId, user: userId });
    });

  dm
    .command("send")
    .description("Send a direct message")
    .requiredOption("--user <id|handle|email>", "User ID, handle, or email")
    .requiredOption("--text <text>", "Message text")
    .action(async (opts: { user: string; text: string }) => {
      const client = getClient(program.opts().token);
      const userId = await resolveUserId(client, opts.user);
      const channelId = await openDmChannel(client, userId);
      const res = await client.chat.postMessage({
        channel: channelId,
        text: opts.text,
      });
      success({
        channel: res.channel,
        ts: res.ts,
        user: userId,
        message: res.message,
      });
    });

  dm
    .command("history")
    .description("Read DM history with a user")
    .requiredOption("--user <id|handle|email>", "User ID, handle, or email")
    .option("--limit <n>", "Number of messages", "20")
    .option("--cursor <cursor>", "Pagination cursor")
    .action(async (opts: { user: string; limit: string; cursor?: string }) => {
      const client = getClient(program.opts().token);
      const userId = await resolveUserId(client, opts.user);
      const channelId = await openDmChannel(client, userId);
      const res = await client.conversations.history({
        channel: channelId,
        limit: parseInt(opts.limit, 10),
        cursor: opts.cursor,
      });

      const data = (res.messages ?? []).map((m) => ({
        ts: m.ts,
        user: m.user,
        text: m.text,
        type: m.type,
        thread_ts: m.thread_ts,
        reply_count: m.reply_count,
      }));

      const nextCursor = res.response_metadata?.next_cursor;
      success(data, {
        count: data.length,
        has_more: res.has_more ?? false,
        ...(nextCursor ? { next_cursor: nextCursor } : {}),
      });
    });
}
