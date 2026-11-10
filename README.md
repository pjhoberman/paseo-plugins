# Paseo plugins

Plugins for [Paseo](https://paseo.sh).

| Plugin | What it does |
| --- | --- |
| [Next unread](next-unread/) | A "Next unread" button above the composer that jumps to the agent waiting longest for you. |
| [Workspace actions](workspace-actions/) | One-click archive and open-pull-request buttons in the workspace header, plus `/archive` and `/pr`. |
| [PR assist](pr-assist/) | Composer buttons to review the branch with a different model, resolve merge conflicts, and fix failing GitHub Actions checks. |

Each folder's `OVERVIEW.md` describes the plugin in detail. All require Paseo 0.15.3 or later.

## Install

```bash
paseo plugin add git:pjhoberman/paseo-plugins:next-unread
paseo plugin add git:pjhoberman/paseo-plugins:workspace-actions
paseo plugin add git:pjhoberman/paseo-plugins:pr-assist
```

PR assist's Fix CI button needs the GitHub CLI (`gh`) signed in on the daemon host.

## Develop

```bash
cd pr-assist
npm install
npm run typecheck
paseo plugin add "$PWD"
paseo plugin reload pr-assist
```

## License

MIT
