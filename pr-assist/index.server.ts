import type { PluginServerContext } from "@getpaseo/plugin/server";
import { failedCheckLogs } from "./server/ci-logs";
import { failedCheckLogsRpc, getSettingsRpc, reviewerSettings } from "./shared/contracts";

export default function contribute(server: PluginServerContext) {
  const settings = server.registerSettings(reviewerSettings);
  server.handle(getSettingsRpc, async () => {
    const current = await settings.read();
    if (current.status !== "ready") return { reviewers: {}, reviewerModes: {} };
    const { reviewers, reviewerModes } = current.values;
    return { reviewers, reviewerModes };
  });
  server.handle(failedCheckLogsRpc, failedCheckLogs);
  return () => {};
}
