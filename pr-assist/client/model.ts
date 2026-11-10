import type { PaseoApi } from "@getpaseo/client";

export type Workspace = Awaited<ReturnType<PaseoApi["workspaces"]["list"]>>["entries"][number];
export type Agent = Awaited<ReturnType<PaseoApi["agents"]["list"]>>["entries"][number]["agent"];

export function providerOf(agent: Pick<Agent, "provider">): string {
  return agent.provider.split("/")[0] ?? agent.provider;
}

export function failingChecks(workspace: Workspace | undefined) {
  const checks = workspace?.githubRuntime?.pullRequest?.checks ?? [];
  return checks.filter((check) => check.status === "failure");
}

export function hasConflicts(workspace: Workspace | undefined): boolean {
  const pr = workspace?.githubRuntime?.pullRequest;
  return !!pr && !pr.isMerged && pr.state.toUpperCase() === "OPEN" && pr.mergeable === "CONFLICTING";
}

/** Subagents carry their parent in a label; the snapshot has no parent field. */
export function isSubagent(agent: Pick<Agent, "labels">): boolean {
  return !!agent.labels?.["paseo.parent-agent-id"]?.trim();
}
