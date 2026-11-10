import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { RpcInput } from "@getpaseo/plugin";
import type { failedCheckLogsRpc } from "../shared/contracts";

const run = promisify(execFile);
const MAX_LINES_PER_JOB = 150;
const MAX_TOTAL_CHARS = 30_000;
const ACTIONS_JOB = /github\.com\/([^/]+)\/([^/]+)\/actions\/runs\/(\d+)\/job\/(\d+)/;
// The daemon may not inherit a login shell PATH, so include the usual gh locations.
const PATH = ["/opt/homebrew/bin", "/usr/local/bin", process.env.PATH ?? ""].join(":");

/** `gh run view --log-failed` lines are "job\tstep\ttimestamp message"; keep the message. */
function cleanLine(line: string): string {
  const parts = line.split("\t");
  const text = parts.length >= 3 ? parts.slice(2).join("\t") : line;
  return text.replace(/^﻿?\d{4}-\d{2}-\d{2}T[\d:.]+Z\s?/, "");
}

async function jobLog(cwd: string, url: string): Promise<string | null> {
  const match = ACTIONS_JOB.exec(url);
  if (!match) return null;
  const [, owner, repo, runId, jobId] = match;
  try {
    const { stdout } = await run(
      "gh",
      ["run", "view", runId, "--job", jobId, "--log-failed", "-R", `${owner}/${repo}`],
      { cwd, env: { ...process.env, PATH }, timeout: 30_000, maxBuffer: 32 * 1024 * 1024 },
    );
    const lines = stdout.split("\n").map(cleanLine).filter((line) => line.trim() !== "");
    return lines.slice(-MAX_LINES_PER_JOB).join("\n") || null;
  } catch (error) {
    console.error(`[pr-assist] gh run view failed for ${url}`, error);
    return null;
  }
}

export async function failedCheckLogs({ cwd, checks }: RpcInput<typeof failedCheckLogsRpc>) {
  let budget = MAX_TOTAL_CHARS;
  const sections = [];
  for (const check of checks) {
    let log = check.url && budget > 0 ? await jobLog(cwd, check.url) : null;
    if (log && log.length > budget) log = `…\n${log.slice(-budget)}`;
    if (log) budget -= log.length;
    sections.push({ name: check.name, url: check.url, log });
  }
  return { sections };
}
