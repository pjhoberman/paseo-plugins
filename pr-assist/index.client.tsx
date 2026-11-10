import type { PluginButtonRegistration, PluginClientContext } from "@getpaseo/plugin/client";
import { failedCheckLogsRpc, getSettingsRpc } from "./shared/contracts";
import { JumpScreen } from "./client/jump-screen";
import {
  type Agent,
  type Workspace,
  failingChecks,
  hasConflicts,
  isSubagent,
  providerOf,
} from "./client/model";
import { fixChecksPrompt, resolveConflictsPrompt, reviewPrompt } from "./client/prompts";
import {
  availableProviders,
  detectReviewSkill,
  providerLabel,
  resolveReviewer,
  reviewerProvider,
  toProviderModel,
} from "./client/reviewer";
import { SettingsScreen } from "./client/settings-screen";
import { settingsStore } from "./client/settings-store";

const JUMP_SCREEN = "open-agent";
const SETTINGS_SCREEN = "reviewers";

interface Pills {
  review: PluginButtonRegistration;
  conflicts: PluginButtonRegistration;
  checks: PluginButtonRegistration;
  signature: string;
}

export default function contribute(client: PluginClientContext) {
  const { paseo } = client;
  const agents = new Map<string, Agent>();
  const workspaces = new Map<string, Workspace>();
  const pills = new Map<string, Pills>();
  let available = new Set<string>();
  const lifetime = new AbortController();

  client.addScreen({ id: JUMP_SCREEN, title: "Review", Component: JumpScreen });
  client.addSettingsScreen({
    id: SETTINGS_SCREEN,
    title: "Reviewers",
    icon: "ScanSearch",
    Component: SettingsScreen,
  });

  const reviewerFor = (agent: Agent) =>
    resolveReviewer(providerOf(agent), settingsStore.get(), available);

  async function startReview(agentId: string) {
    const agent = agents.get(agentId);
    const workspace = agent?.workspaceId ? workspaces.get(agent.workspaceId) : undefined;
    if (!agent || !workspace) throw new Error("This agent's workspace is not loaded yet.");
    const spec = reviewerFor(agent);
    if (!spec) return client.openSettings(SETTINGS_SCREEN);
    const label = providerLabel(reviewerProvider(spec));
    const reviewer = await paseo.workspaces.ref(workspace.id).agents.create({
      config: { provider: await toProviderModel(paseo, spec) },
      title: `Adversarial review (${label})`,
    });
    client.openScreen({ screenId: JUMP_SCREEN, params: { agentId: reviewer.id } });
    const skill = await detectReviewSkill(reviewer);
    await reviewer.send(reviewPrompt(workspace, skill));
  }

  async function resolveConflicts(agentId: string) {
    const agent = agents.get(agentId);
    const workspace = agent?.workspaceId ? workspaces.get(agent.workspaceId) : undefined;
    if (!workspace) throw new Error("This agent's workspace is not loaded yet.");
    await paseo.agents.ref(agentId).send(resolveConflictsPrompt(workspace));
  }

  async function fixChecks(agentId: string) {
    const agent = agents.get(agentId);
    const workspace = agent?.workspaceId ? workspaces.get(agent.workspaceId) : undefined;
    if (!workspace) throw new Error("This agent's workspace is not loaded yet.");
    const checks = failingChecks(workspace).map(({ name, url }) => ({ name, url }));
    if (checks.length === 0) throw new Error("No failing checks found.");
    const cwd = workspace.workspaceDirectory ?? workspace.projectRootPath;
    const { sections } = await client.rpc(failedCheckLogsRpc, { cwd, checks });
    await paseo.agents.ref(agentId).send(fixChecksPrompt(workspace, sections));
  }

  const describe = (agent: Agent, workspace: Workspace | undefined) => {
    const spec = reviewerFor(agent);
    const failing = failingChecks(workspace).length;
    const busy = agent.status === "running";
    const isGit = workspace?.projectKind === "git";
    return {
      signature: JSON.stringify([spec, failing, busy, isGit, hasConflicts(workspace)]),
      review: {
        title: spec ? `Adversarial review with ${spec}` : "Choose a reviewer model",
        icon: "ScanSearch",
        label: spec ? `Review with ${providerLabel(reviewerProvider(spec))}` : "Review…",
        visible: isGit,
        behavior: { kind: "action" as const, onPress: () => startReview(agent.id) },
      },
      conflicts: {
        title: busy ? "Resolve conflicts (wait for the agent to finish)" : "Ask the agent to resolve merge conflicts",
        icon: "GitMerge",
        label: "Resolve conflicts",
        visible: hasConflicts(workspace),
        disabled: busy,
        behavior: { kind: "action" as const, onPress: () => resolveConflicts(agent.id) },
      },
      checks: {
        title: busy ? "Fix CI (wait for the agent to finish)" : "Send failing CI logs to the agent",
        icon: "Wrench",
        label: failing > 1 ? `Fix CI (${failing})` : "Fix CI",
        visible: failing > 0,
        disabled: busy,
        behavior: { kind: "action" as const, onPress: () => fixChecks(agent.id) },
      },
    };
  };

  const removePills = (agentId: string) => {
    const entry = pills.get(agentId);
    if (!entry) return;
    entry.review.remove();
    entry.conflicts.remove();
    entry.checks.remove();
    pills.delete(agentId);
  };

  const sync = () => {
    if (lifetime.signal.aborted) return;
    for (const id of [...pills.keys()]) if (!agents.has(id)) removePills(id);
    for (const agent of agents.values()) {
      if (!agent.workspaceId || isSubagent(agent) || agent.internal || agent.status === "closed") {
        removePills(agent.id);
        continue;
      }
      const next = describe(agent, workspaces.get(agent.workspaceId));
      const existing = pills.get(agent.id);
      if (existing) {
        if (existing.signature === next.signature) continue;
        existing.signature = next.signature;
        existing.review.update(next.review);
        existing.conflicts.update(next.conflicts);
        existing.checks.update(next.checks);
        continue;
      }
      const target = { workspaceId: agent.workspaceId, agentId: agent.id };
      pills.set(agent.id, {
        signature: next.signature,
        review: client.addComposerPill({ id: "review", ...target, button: next.review }),
        conflicts: client.addComposerPill({ id: "resolve-conflicts", ...target, button: next.conflicts }),
        checks: client.addComposerPill({ id: "fix-ci", ...target, button: next.checks }),
      });
    }
  };

  const stopSettings = settingsStore.subscribe(sync);
  const fail = (what: string) => (error: unknown) => {
    if (!lifetime.signal.aborted) console.error(`[pr-assist] ${what} failed`, error);
  };

  client
    .rpc(getSettingsRpc, {})
    .then(({ reviewers }) => settingsStore.set(reviewers))
    .catch(fail("loading settings"));
  availableProviders(paseo)
    .then((providers) => {
      available = providers;
      sync();
    })
    .catch(fail("listing providers"));

  void paseo.agents
    .list({ subscribe: {}, signal: lifetime.signal })
    .then(({ subscription }) => {
      subscription.subscribe({
        snapshot: ({ entries }) => {
          agents.clear();
          for (const { agent } of entries) agents.set(agent.id, agent);
          sync();
        },
        update: (message) => {
          if (message.type !== "agent_update") return;
          const update = message.payload;
          if (update.kind === "upsert") agents.set(update.agent.id, update.agent);
          else agents.delete(update.agentId);
          sync();
        },
      });
      return undefined;
    })
    .catch(fail("agent observation"));

  void paseo.workspaces
    .list({ subscribe: {} })
    .then(({ subscription }) => {
      if (lifetime.signal.aborted) return void subscription.release();
      lifetime.signal.addEventListener("abort", () => void subscription.release());
      subscription.subscribe({
        snapshot: ({ entries }) => {
          workspaces.clear();
          for (const workspace of entries) workspaces.set(workspace.id, workspace);
          sync();
        },
        update: (message) => {
          if (message.type !== "workspace_update") return;
          const update = message.payload;
          if (update.kind === "upsert") workspaces.set(update.workspace.id, update.workspace);
          else workspaces.delete(update.id);
          sync();
        },
      });
      return undefined;
    })
    .catch(fail("workspace observation"));

  return () => {
    lifetime.abort();
    stopSettings();
    for (const id of [...pills.keys()]) removePills(id);
  };
}
