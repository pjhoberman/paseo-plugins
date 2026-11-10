import type { PluginServerContext } from "@getpaseo/plugin/server";
import { failedCheckLogs } from "./server/ci-logs";
import { failedCheckLogsRpc, getSettingsRpc, reviewerSettings } from "./shared/contracts";

export default function contribute(server: PluginServerContext) {
  const settings = server.registerSettings(reviewerSettings);
  server.handle(getSettingsRpc, async () => {
    const current = await settings.read();
    return { reviewers: current.status === "ready" ? current.values.reviewers : {} };
  });
  server.handle(failedCheckLogsRpc, failedCheckLogs);
  return () => {};
}
