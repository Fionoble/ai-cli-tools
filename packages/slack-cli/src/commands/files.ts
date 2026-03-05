import { Command } from "commander";
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { getClient, resolveChannelId } from "../client.ts";
import { success } from "../output.ts";
import { BadArgError, FileIOError } from "../errors.ts";

export function registerFilesCommand(program: Command): void {
  const files = program
    .command("files")
    .description("Upload, list, and manage files");

  files
    .command("list")
    .description("List files")
    .option("--channel <id|name>", "Filter by channel")
    .option("--user <id>", "Filter by user")
    .option("--limit <n>", "Max results", "20")
    .option("--cursor <cursor>", "Pagination cursor for next page")
    .action(
      async (opts: {
        channel?: string;
        user?: string;
        limit: string;
        cursor?: string;
      }) => {
        const client = getClient(program.opts().token);

        const params: Record<string, unknown> = {
          count: parseInt(opts.limit, 10),
        };
        if (opts.channel) {
          params.channel = await resolveChannelId(client, opts.channel);
        }
        if (opts.user) params.user = opts.user;
        if (opts.cursor) params.page = parseInt(opts.cursor, 10);

        const res = await client.files.list(params);
        const data = (res.files ?? []).map((f: Record<string, unknown>) => ({
          id: f.id,
          name: f.name,
          title: f.title,
          mimetype: f.mimetype,
          size: f.size,
          user: f.user,
          created: f.created,
          permalink: f.permalink,
        }));

        const paging = res.paging as Record<string, unknown> | undefined;
        const currentPage = Number(paging?.page ?? 1);
        const totalPages = Number(paging?.pages ?? 1);

        success(data, {
          count: data.length,
          has_more: currentPage < totalPages,
          ...(currentPage < totalPages
            ? { next_cursor: String(currentPage + 1) }
            : {}),
        });
      },
    );

  files
    .command("upload")
    .description("Upload a file")
    .requiredOption("--file <path>", "Path to file")
    .option("--channels <ids>", "Comma-separated channel IDs or names")
    .option("--title <title>", "File title")
    .option("--comment <text>", "Initial comment")
    .action(
      async (opts: {
        file: string;
        channels?: string;
        title?: string;
        comment?: string;
      }) => {
        const client = getClient(program.opts().token);

        let content: Buffer;
        try {
          content = readFileSync(opts.file);
        } catch (err) {
          throw new FileIOError(
            `Cannot read file: ${opts.file} — ${err instanceof Error ? err.message : err}`,
          );
        }

        let channelIds: string | undefined;
        if (opts.channels) {
          const resolved = await Promise.all(
            opts.channels
              .split(",")
              .map((c) => c.trim())
              .map((c) => resolveChannelId(client, c)),
          );
          channelIds = resolved.join(",");
        }

        const res = await client.files.uploadV2({
          file: content,
          filename: basename(opts.file),
          title: opts.title ?? basename(opts.file),
          channel_id: channelIds?.split(",")[0],
          initial_comment: opts.comment,
        });

        // uploadV2 returns different shapes; normalize
        const files = (res as Record<string, unknown>).files ?? [res.file];
        success(files);
      },
    );

  files
    .command("info")
    .description("Get file metadata")
    .requiredOption("--file <id>", "File ID")
    .action(async (opts: { file: string }) => {
      const client = getClient(program.opts().token);
      const res = await client.files.info({ file: opts.file });
      success(res.file);
    });

  files
    .command("delete")
    .description("Delete a file")
    .requiredOption("--file <id>", "File ID")
    .action(async (opts: { file: string }) => {
      const client = getClient(program.opts().token);
      await client.files.delete({ file: opts.file });
      success({ file: opts.file, deleted: true });
    });
}
