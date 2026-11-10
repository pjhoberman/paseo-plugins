import {
  type PluginButtonRegistration,
  type PluginClientContext,
  openExternalUrl,
} from "@getpaseo/plugin/client";
import type { PaseoApi } from "@getpaseo/client";
import { AfterArchiveScreen } from "./client/after-archive-screen";
import { makeConfirmArchive } from "./client/confirm-archive";
import { type Workspace, loadWorkspace, pullRequestUrl, unsavedWork } from "./client/workspace";

interface Buttons {
  pr: PluginButtonRegistration;
  archive: PluginButtonRegistration;
  /** Last rendered state; updates are skipped when unchanged so open popovers stay open. */
  signature: string;
}

function signature(workspace: Workspace): string {
  return JSON.stringify([
    pullRequestUrl(workspace),
    workspace.githubRuntime?.pullRequest?.number ?? null,
    unsavedWork(workspace),
    workspace.projectId,
  ]);
}

function prButton(workspace: Workspace) {
  const url = pullRequestUrl(workspace);
  const number = workspace.githubRuntime?.pullRequest?.number;
  return {
    title: number ? `Open pull request #${number}` : "Open pull request",
    icon: "GitPullRequest",
    visible: url !== null,
    behavior: {
      kind: "action" as const,
      onPress: async () => {
        if (url) await openExternalUrl(url);
      },
    },
  };
}

const AFTER_ARCHIVE_SCREEN = "archived";

/** Archive, then leave the dead workspace route for another workspace. */
async function archiveAndMoveOn(client: PluginClientContext, workspace: Workspace) {
  await client.paseo.workspaces.ref(workspace.id).archive();
  leaveArchived(client, workspace);
}

function leaveArchived(client: PluginClientContext, workspace: Pick<Workspace, "id" | "projectId">) {
  client.openScreen({
    screenId: AFTER_ARCHIVE_SCREEN,
    params: { from: workspace.id, project: workspace.projectId },
  });
}

function archiveButton(client: PluginClientContext, workspace: Workspace) {
  const reasons = unsavedWork(workspace);
  return {
    title: reasons.length > 0 ? `Archive workspace (${reasons.join(", ")})` : "Archive workspace",
    icon: "Archive",
    behavior:
      reasons.length > 0
        ? {
            kind: "popover" as const,
            Content: makeConfirmArchive(() => leaveArchived(client, workspace)),
          }
        : { kind: "action" as const, onPress: () => archiveAndMoveOn(client, workspace) },
  };
}

async function archiveFromCommand(
  client: PluginClientContext,
  workspaceId: string,
  force: boolean,
) {
  const workspace = await loadWorkspace(client.paseo, workspaceId);
  const reasons = unsavedWork(workspace);
  if (reasons.length > 0 && !force) {
    throw new Error(
      `Workspace has ${reasons.join(" and ")}. Use "/archive force" or the header button to confirm.`,
    );
  }
  await client.paseo.workspaces.ref(workspaceId).archive();
  leaveArchived(client, { id: workspaceId, projectId: workspace?.projectId ?? "" });
}

async function openPullRequest(paseo: PaseoApi, workspaceId: string) {
  const url = pullRequestUrl(await loadWorkspace(paseo, workspaceId));
  if (!url) throw new Error("This workspace has no pull request.");
  await openExternalUrl(url);
}

export default function contribute(client: PluginClientContext) {
  const { paseo } = client;
  client.addScreen({ id: AFTER_ARCHIVE_SCREEN, title: "Archived", Component: AfterArchiveScreen });
  const buttons = new Map<string, Buttons>();
  const lifetime = new AbortController();

  const removeButtons = (id: string) => {
    const entry = buttons.get(id);
    if (!entry) return;
    entry.pr.remove();
    entry.archive.remove();
    buttons.delete(id);
  };

  const upsert = (workspace: Workspace) => {
    if (lifetime.signal.aborted) return;
    if (workspace.archivingAt || workspace.internal) return removeButtons(workspace.id);
    const existing = buttons.get(workspace.id);
    const next = signature(workspace);
    if (existing) {
      if (existing.signature === next) return;
      existing.signature = next;
      existing.pr.update(prButton(workspace));
      existing.archive.update(archiveButton(client, workspace));
      return;
    }
    buttons.set(workspace.id, {
      pr: client.addHeaderButton({
        id: "open-pr",
        workspaceId: workspace.id,
        button: prButton(workspace),
      }),
      archive: client.addHeaderButton({
        id: "archive",
        workspaceId: workspace.id,
        button: archiveButton(client, workspace),
      }),
      signature: next,
    });
  };

  void paseo.workspaces
    .list({ subscribe: {} })
    .then(({ subscription }) => {
      if (lifetime.signal.aborted) return void subscription.release();
      lifetime.signal.addEventListener("abort", () => void subscription.release());
      subscription.subscribe({
        snapshot: ({ entries }) => {
          const seen = new Set(entries.map((workspace) => workspace.id));
          for (const id of [...buttons.keys()]) if (!seen.has(id)) removeButtons(id);
          for (const workspace of entries) upsert(workspace);
        },
        update: (message) => {
          if (message.type !== "workspace_update") return;
          const update = message.payload;
          if (update.kind === "upsert") upsert(update.workspace);
          else removeButtons(update.id);
        },
      });
      return undefined;
    })
    .catch((error) => {
      if (!lifetime.signal.aborted) console.error("[workspace-actions] observation failed", error);
    });

  client.addSlashCommand({
    name: "archive",
    description: "Archive this workspace",
    argumentHint: "[force]",
    context: "workspace",
    onSubmit: ({ workspace, args }) =>
      archiveFromCommand(client, workspace.id, args.trim().toLowerCase() === "force"),
  });
  client.addSlashCommand({
    name: "pr",
    description: "Open this workspace's pull request",
    argumentHint: "",
    context: "workspace",
    onSubmit: ({ workspace }) => openPullRequest(paseo, workspace.id),
  });
  client.addCommandCenterItem({
    id: "archive",
    title: "Archive this workspace",
    icon: "Archive",
    keywords: ["archive", "close", "done"],
    context: "workspace",
    onSelect: ({ workspace }) => archiveFromCommand(client, workspace.id, false),
  });
  client.addCommandCenterItem({
    id: "open-pr",
    title: "Open pull request",
    icon: "GitPullRequest",
    keywords: ["pr", "pull request", "github"],
    context: "workspace",
    onSelect: ({ workspace }) => openPullRequest(paseo, workspace.id),
  });

  return () => {
    lifetime.abort();
    for (const id of [...buttons.keys()]) removeButtons(id);
  };
}
