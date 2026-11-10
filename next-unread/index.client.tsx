import type { PluginButtonRegistration, PluginClientContext } from "@getpaseo/plugin/client";
import { JumpScreen } from "./client/jump-screen";
import { type UnreadAgent, unreadExcept } from "./client/unread";

const JUMP_SCREEN = "jump";

export default function contribute(client: PluginClientContext) {
  client.addScreen({ id: JUMP_SCREEN, title: "Next unread", Component: JumpScreen });

  const agents = new Map<string, UnreadAgent>();
  const pills = new Map<string, PluginButtonRegistration>();
  const lifetime = new AbortController();

  const jumpFrom = (currentId: string) => {
    const [next] = unreadExcept(agents.values(), currentId);
    if (next) client.openScreen({ screenId: JUMP_SCREEN, params: { agentId: next.id } });
  };

  const pillButton = (agentId: string) => {
    const count = unreadExcept(agents.values(), agentId).length;
    return {
      title: count === 1 ? "Go to next unread agent" : `Go to next unread agent (${count} waiting)`,
      icon: "ChevronRight",
      label: count > 1 ? `Next unread (${count})` : "Next unread",
      visible: count > 0,
      behavior: { kind: "action" as const, onPress: () => jumpFrom(agentId) },
    };
  };

  const sync = () => {
    if (lifetime.signal.aborted) return;
    for (const [id, pill] of pills) {
      if (!agents.has(id)) {
        pill.remove();
        pills.delete(id);
      }
    }
    for (const agent of agents.values()) {
      if (!agent.workspaceId || agent.labels?.["paseo.parent-agent-id"]) continue;
      const existing = pills.get(agent.id);
      if (existing) {
        existing.update(pillButton(agent.id));
      } else {
        pills.set(
          agent.id,
          client.addComposerPill({
            id: "next-unread",
            workspaceId: agent.workspaceId,
            agentId: agent.id,
            button: pillButton(agent.id),
          }),
        );
      }
    }
  };

  client.addCommandCenterItem({
    id: "next-unread",
    title: "Go to next unread agent",
    icon: "ChevronRight",
    keywords: ["unread", "attention", "next", "jump"],
    context: "global",
    onSelect() {
      jumpFrom("");
    },
  });

  void client.paseo.agents
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
    .catch((error) => {
      if (!lifetime.signal.aborted) console.error("[next-unread] agent observation failed", error);
    });

  return () => {
    lifetime.abort();
    for (const pill of pills.values()) pill.remove();
    pills.clear();
  };
}
