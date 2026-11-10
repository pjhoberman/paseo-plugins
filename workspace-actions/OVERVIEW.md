Adds two buttons to each workspace header: one opens the workspace's pull request, and one archives the workspace without going through the menu.

The pull request button appears only when Paseo has found a GitHub pull request for the workspace branch, and opens it in your browser. The archive button archives immediately when the workspace is clean. When the workspace has uncommitted changes or commits not pushed to its upstream, it asks for confirmation first. After archiving, Paseo opens the most recently active remaining workspace, preferring one in the same project.

The same actions are available as `/pr` and `/archive` in the composer, and as "Open pull request" and "Archive this workspace" in the Command Center. `/archive` and the Command Center refuse to archive a workspace with unsaved work. Use `/archive force` or the header button to confirm.

Requires Paseo 0.15.3 or later. There is nothing to configure.

The plugin reads the git and GitHub status Paseo already tracks for each workspace. It stores nothing and makes no network requests of its own. Archiving works the same as archiving from the workspace menu.
