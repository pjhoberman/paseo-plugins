import { defineRpc, defineSettings } from "@getpaseo/plugin";
import { z } from "zod";

const reviewerSettingsSchema = z.object({
  /**
   * Reviewer per current provider, as "provider/model". An empty or missing entry
   * means automatic: Codex reviews everyone else's work, Claude reviews Codex's.
   */
  reviewers: z.record(z.string(), z.string()).default({}),
  /**
   * Permission mode per reviewer provider, such as "bypassPermissions" for Claude or
   * "full-access" for Codex. Keyed by the provider that runs the review, because mode
   * IDs belong to it. A missing entry uses the provider's default mode.
   */
  reviewerModes: z.record(z.string(), z.string()).default({}),
});

export type ReviewerSettings = z.infer<typeof reviewerSettingsSchema>;

export const reviewerSettings = defineSettings({
  id: "reviewers",
  scope: "host",
  version: 1,
  schema: reviewerSettingsSchema,
});

export const getSettingsRpc = defineRpc({
  name: "settings.get",
  input: z.object({}),
  output: z.object({
    reviewers: z.record(z.string(), z.string()),
    reviewerModes: z.record(z.string(), z.string()),
  }),
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
