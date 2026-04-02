export const EXIT_OK = 0;
export const EXIT_NO_TOKEN = 2;
export const EXIT_BAD_ARG = 3;
export const EXIT_API_ERROR = 4;
export const EXIT_NETWORK = 5;
export const EXIT_FILE_IO = 6;

export class CliError extends Error {
  constructor(
    message: string,
    public exitCode: number,
    public slackError?: string,
  ) {
    super(message);
    this.name = "CliError";
  }
}

export class NoTokenError extends CliError {
  constructor() {
    super(
      "No token configured. Run: slack-cli auth setup --token xoxb-...",
      EXIT_NO_TOKEN,
      "no_token",
    );
  }
}

export class BadArgError extends CliError {
  constructor(message: string) {
    super(message, EXIT_BAD_ARG, "bad_argument");
  }
}

export class ApiError extends CliError {
  constructor(slackError: string, message?: string) {
    super(message ?? `Slack API error: ${slackError}`, EXIT_API_ERROR, slackError);
  }
}

export class RateLimitError extends CliError {
  public retryAfter: number;
  constructor(retryAfter: number, message?: string) {
    super(
      message ?? `Rate limited by Slack. Retry after ${retryAfter}s`,
      EXIT_API_ERROR,
      "rate_limited",
    );
    this.retryAfter = retryAfter;
  }
}

export class NetworkError extends CliError {
  constructor(message: string) {
    super(message, EXIT_NETWORK, "network_error");
  }
}

export class FileIOError extends CliError {
  constructor(message: string) {
    super(message, EXIT_FILE_IO, "file_io_error");
  }
}

export function toCliError(err: unknown): CliError {
  if (err instanceof CliError) return err;

  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    // Slack WebClient rate limit errors
    if (e.code === "slack_webapi_rate_limited_error") {
      const retryAfter = typeof e.retryAfter === "number" ? e.retryAfter : 30;
      return new RateLimitError(retryAfter, String(e.message ?? "Rate limited"));
    }
    // Slack WebClient platform errors
    if (e.code === "slack_webapi_platform_error" && typeof e.data === "object") {
      const data = e.data as Record<string, unknown>;
      if (data.error === "ratelimited") {
        const retryAfter =
          typeof data.retry_after === "number" ? data.retry_after : 30;
        return new RateLimitError(retryAfter);
      }
      return new ApiError(
        String(data.error ?? "unknown"),
        String(e.message ?? data.error),
      );
    }
    if (
      e.code === "slack_webapi_request_error" ||
      e.code === "slack_webapi_http_error"
    ) {
      return new NetworkError(String(e.message ?? "Network error"));
    }
  }

  if (err instanceof Error) {
    if (err.message.includes("ENOENT") || err.message.includes("EACCES")) {
      return new FileIOError(err.message);
    }
    return new CliError(err.message, 1);
  }

  return new CliError(String(err), 1);
}
