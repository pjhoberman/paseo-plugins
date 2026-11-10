import type { PaseoApi } from "@getpaseo/client";

export type Workspace = Awaited<ReturnType<PaseoApi["workspaces"]["list"]>>["entries"][number];

export function pullRequestUrl(workspace: Workspace | null | undefined): string | null {
  return workspace?.githubRuntime?.pullRequest?.url ?? null;
}

/** Human-readable reasons archiving would lose work; empty when it is safe. */
export function unsavedWork(workspace: Workspace | null | undefined): string[] {
  const git = workspace?.gitRuntime;
  if (!git) return [];
  const reasons: string[] = [];
  if (git.isDirty) reasons.push("uncommitted changes");
  const ahead = git.aheadOfOrigin ?? 0;
  if (ahead > 0) reasons.push(ahead === 1 ? "1 unpushed commit" : `${ahead} unpushed commits`);
  return reasons;
}

export async function loadWorkspace(paseo: PaseoApi, id: string): Promise<Workspace | null> {
  const handle = paseo.workspaces.ref(id);
  return handle.current() ?? (await handle.refresh());
}
