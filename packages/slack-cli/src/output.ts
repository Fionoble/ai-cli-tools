interface SuccessOutput {
  ok: true;
  data: unknown;
  metadata?: Record<string, unknown>;
}

interface ErrorOutput {
  ok: false;
  error: string;
  message: string;
  exit_code: number;
}

type Output = SuccessOutput | ErrorOutput;

let outputMode: "json" | "pretty" | "raw" = "json";

export function setOutputMode(mode: "json" | "pretty" | "raw"): void {
  outputMode = mode;
}

export function getOutputMode(): "json" | "pretty" | "raw" {
  return outputMode;
}

export function success(
  data: unknown,
  metadata?: Record<string, unknown>,
): void {
  if (outputMode === "raw") {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  const out: SuccessOutput = { ok: true, data };
  if (metadata && Object.keys(metadata).length > 0) {
    out.metadata = metadata;
  }

  if (outputMode === "pretty") {
    console.log(JSON.stringify(out, null, 2));
  } else {
    console.log(JSON.stringify(out));
  }
}

export function error(
  slackError: string,
  message: string,
  exitCode: number,
): void {
  const out: ErrorOutput = {
    ok: false,
    error: slackError,
    message,
    exit_code: exitCode,
  };

  if (outputMode === "pretty") {
    console.log(JSON.stringify(out, null, 2));
  } else {
    console.log(JSON.stringify(out));
  }
}

export function quiet(): boolean {
  return process.env.SLACK_CLI_QUIET === "1";
}
