import type { PaseoAgentHandle, PaseoApi } from "@getpaseo/client";

const LABELS: Record<string, string> = { claude: "Claude", codex: "Codex", opencode: "OpenCode" };

export function providerLabel(provider: string): string {
  return LABELS[provider] ?? provider.charAt(0).toUpperCase() + provider.slice(1);
}

/** Reviewer spec ("provider" or "provider/model") for an agent on `current`, or null. */
export function resolveReviewer(
  current: string,
  configured: Record<string, string>,
  available: ReadonlySet<string>,
): string | null {
  const explicit = configured[current]?.trim();
  if (explicit) return explicit;
  if (current !== "codex" && available.has("codex")) return "codex";
  if (current === "codex" && available.has("claude")) return "claude";
  return null;
}

export function reviewerProvider(spec: string): string {
  return spec.split("/")[0] ?? spec;
}

/** Agent creation needs "provider/model"; a bare provider gets its first listed model. */
/** Providers that can start an agent on this host right now (enabled is not enough). */
export async function availableProviders(paseo: PaseoApi): Promise<Set<string>> {
  const { providers } = await paseo.providers.listAvailable();
  return new Set(providers.filter((p) => p.available).map((p) => p.provider));
}

export async function toProviderModel(paseo: PaseoApi, spec: string): Promise<string> {
  if (spec.includes("/")) return spec;
  const { models } = await paseo.providers.listModels(spec);
  const model = models?.find((m) => m.isDefault) ?? models?.[0];
  if (!model) throw new Error(`${providerLabel(spec)} has no models available.`);
  return `${spec}/${model.id}`;
}

const SKILL_PREFERENCE = [
  /(^|[:/])ce-code-review$/,
  /^code-review$/,
  /^code-review:code-review$/,
  /(^|[:/])code-review$/,
];

/** The best review skill the reviewer's live session loaded, or null. */
export async function detectReviewSkill(agent: PaseoAgentHandle): Promise<string | null> {
  try {
    const result = await Promise.race([
      agent.commands(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 15_000)),
    ]);
    if (!result || result.error) return null;
    const names = result.commands.map((command) => command.name);
    for (const pattern of SKILL_PREFERENCE) {
      const match = names.find((name) => pattern.test(name));
      if (match) return match;
    }
  } catch (error) {
    console.error("[pr-assist] could not list reviewer skills", error);
  }
  return null;
}
