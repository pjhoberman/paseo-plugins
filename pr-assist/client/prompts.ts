import type { Workspace } from "./model";

function prLabel(workspace: Workspace): string {
  const number = workspace.githubRuntime?.pullRequest?.number;
  return number ? `PR #${number}` : "the pull request for this branch";
}

function baseBranch(workspace: Workspace): string {
  return workspace.githubRuntime?.pullRequest?.baseRefName ?? "the default branch";
}

export function reviewPrompt(workspace: Workspace, skill: string | null): string {
  const how = skill
    ? `Use the \`${skill}\` skill to do the review.`
    : "If a code review skill such as `ce-code-review` or `code-review` is available, use it; otherwise review the diff directly.";
  return [
    `Do an adversarial code review of the changes on this branch compared with \`${baseBranch(workspace)}\` (${prLabel(workspace)}).`,
    "Another model wrote this code. Assume it has mistakes and try to find them: correctness bugs, regressions, edge cases, security problems, and missing tests. Skip style nits.",
    how,
    "Report findings ranked by severity, each with file and line. Do not modify any files.",
  ].join("\n\n");
}

export function resolveConflictsPrompt(workspace: Workspace): string {
  const base = baseBranch(workspace);
  return [
    `${prLabel(workspace)} has merge conflicts with \`${base}\`.`,
    `Fetch origin, merge \`origin/${base}\` into this branch, and resolve the conflicts so both sides' intent is kept.`,
    "Run the relevant tests, then commit the merge and push. Tell me about any conflict where the right resolution was unclear.",
  ].join(" ");
}

export function fixChecksPrompt(
  workspace: Workspace,
  sections: { name: string; url: string | null; log: string | null }[],
): string {
  const body = sections
    .map(({ name, url, log }) => {
      const heading = `### ${name}${url ? `\n${url}` : ""}`;
      return log ? `${heading}\n\n\`\`\`\n${log}\n\`\`\`` : `${heading}\n\n(No log available; inspect the link.)`;
    })
    .join("\n\n");
  return [
    `CI is failing on ${prLabel(workspace)}. Fix the failures below, run the same checks locally where you can, then commit and push.`,
    body,
  ].join("\n\n");
}
