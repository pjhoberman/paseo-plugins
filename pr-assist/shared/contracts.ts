import { defineRpc, defineSettings } from "@getpaseo/plugin";
import { z } from "zod";

/**
 * Reviewer per current provider, as "provider/model". An empty or missing entry
 * means automatic: Codex reviews everyone else's work, Claude reviews Codex's.
 */
export const reviewerSettings = defineSettings({
  id: "reviewers",
  scope: "host",
  version: 1,
  schema: z.object({
    reviewers: z.record(z.string(), z.string()).default({}),
  }),
});

export const getSettingsRpc = defineRpc({
  name: "settings.get",
  input: z.object({}),
  output: z.object({ reviewers: z.record(z.string(), z.string()) }),
});

export const failedCheckLogsRpc = defineRpc({
  name: "ci.failed-logs",
  input: z.object({
    cwd: z.string(),
    checks: z.array(z.object({ name: z.string(), url: z.string().nullable() })),
  }),
  output: z.object({
    sections: z.array(
      z.object({ name: z.string(), url: z.string().nullable(), log: z.string().nullable() }),
    ),
  }),
});
