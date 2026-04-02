import { Command } from "commander";
import { getClient, resolveUserId } from "../client.ts";
import { success } from "../output.ts";
import { bulkCache } from "../cache.ts";

export function registerUsersCommand(program: Command): void {
  const users = program
    .command("users")
    .description("Look up workspace members");

  users
    .command("list")
    .description("List workspace members")
    .option("--limit <n>", "Max results per page", "100")
    .option("--cursor <cursor>", "Pagination cursor")
    .action(async (opts: { limit: string; cursor?: string }) => {
      const client = getClient(program.opts().token);
      const res = await client.users.list({
        limit: parseInt(opts.limit, 10),
        cursor: opts.cursor,
      });

      const members = res.members ?? [];

      // Bulk-cache all returned users for future handle/email resolution
      const cacheEntries: Array<{ key: string; id: string }> = [];
      for (const m of members) {
        if (!m.id) continue;
        if (m.name) cacheEntries.push({ key: m.name, id: m.id });
        if (m.profile?.display_name) cacheEntries.push({ key: m.profile.display_name, id: m.id });
        if (m.profile?.email) cacheEntries.push({ key: m.profile.email, id: m.id });
      }
      bulkCache("user", cacheEntries);

      const data = members.map((m) => ({
        id: m.id,
        name: m.name,
        real_name: m.real_name,
        display_name: m.profile?.display_name,
        email: m.profile?.email,
        is_bot: m.is_bot,
        is_admin: m.is_admin,
        is_owner: m.is_owner,
        deleted: m.deleted,
        tz: m.tz,
      }));

      const nextCursor = res.response_metadata?.next_cursor;
      success(data, {
        count: data.length,
        ...(nextCursor ? { next_cursor: nextCursor, has_more: true } : { has_more: false }),
      });
    });

  users
    .command("info")
    .description("Get user profile")
    .requiredOption("--user <id|handle|email>", "User ID, handle, or email")
    .action(async (opts: { user: string }) => {
      const client = getClient(program.opts().token);
      const userId = await resolveUserId(client, opts.user);
      const res = await client.users.info({ user: userId });
      success(res.user);
    });

  users
    .command("lookup")
    .description("Find user by email")
    .requiredOption("--email <email>", "Email address")
    .action(async (opts: { email: string }) => {
      const client = getClient(program.opts().token);
      const res = await client.users.lookupByEmail({ email: opts.email });
      success(res.user);
    });
}
