Adds three buttons above the composer for common pull request chores.

**Review with another model.** Starts a new agent in the same workspace, on a different provider from the current agent, and asks it for an adversarial review of the branch against its base. By default Codex reviews other providers' work and Claude reviews Codex's. The reviewer uses a `ce-code-review` skill when its session has one, then a `code-review` skill, and otherwise reviews the diff directly. It is told not to change files.

**Resolve conflicts.** Appears when the pull request has merge conflicts. It asks the current agent to merge the base branch, resolve the conflicts, run the tests, commit and push.

**Fix CI.** Appears when checks on the pull request fail. It fetches the failed step logs of GitHub Actions jobs, keeps the last part of each, and sends them to the current agent with a request to fix, test, commit and push. Failed checks from other services are sent as links.

Resolve conflicts and Fix CI are disabled while the agent is working, so they never interrupt a turn.

## Setup

Requires Paseo 0.15.3 or later.

- Review needs a second provider enabled on the host. If the default reviewer is unavailable, the button reads "Review…" and opens the plugin's settings. There you can choose a reviewer for each provider, either a provider such as `claude` or a specific model such as `opencode/google-vertex/gemini-3.1-pro-preview`. Some providers offer models from several vendors, so choose a specific model if you want a different model family.
- Fix CI needs the GitHub CLI (`gh`) installed and signed in on the daemon host, with access to the repository.

## Data and permissions

- The plugin runs `gh run view --log-failed` on the daemon host, using your existing `gh` sign-in, to read logs of failed jobs.
- Those logs, the check names and links, and the branch names are put into prompts. Prompts go to the agent's provider like any message you type, so CI logs may contain anything your jobs print.
- Resolve conflicts and Fix CI ask the agent to commit and push to the pull request branch. The agent's usual permission settings apply.
- Reviewer choices are saved in the plugin's settings on the host. Nothing else is stored.

## Limitations

- Only GitHub pull requests and GitHub Actions logs are supported.
- Opening the new review agent briefly shows a small plugin screen, because composer buttons cannot navigate on their own. Back can return to it.
