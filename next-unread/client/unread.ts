/** Minimal agent fields this plugin reads from the agent directory. */
export interface UnreadAgent {
  id: string;
  workspaceId?: string | null;
  status: string;
  requiresAttention?: boolean;
  labels?: Record<string, string>;
  internal?: boolean;
  lastActivityAt?: string;
  title?: string | null;
}

export function isUnread(agent: UnreadAgent): boolean {
  return (
    agent.requiresAttention === true &&
    agent.status !== "closed" &&
    !agent.internal &&
    // Subagents carry their parent in a label; the snapshot has no parent field.
    !agent.labels?.["paseo.parent-agent-id"]?.trim()
  );
}

/** Unread agents other than `currentId`, oldest waiting first. */
export function unreadExcept(agents: Iterable<UnreadAgent>, currentId: string): UnreadAgent[] {
  const result: UnreadAgent[] = [];
  for (const agent of agents) {
    if (agent.id !== currentId && isUnread(agent)) result.push(agent);
  }
  return result.sort((a, b) => (a.lastActivityAt ?? "").localeCompare(b.lastActivityAt ?? ""));
}
