Adds a "Next unread" button above the composer when another agent needs your attention, such as one that finished a turn, hit an error, or is waiting on a permission. Pressing it opens the agent that has been waiting longest. When several agents are waiting, the button shows how many.

The same jump is available from the Command Center as "Go to next unread agent".

An agent counts as unread when Paseo marks it as requiring attention. Subagents, internal agents and closed agents are ignored.

Requires Paseo 0.15.3 or later. There is nothing to configure.

The plugin reads the agent list on the selected host. It stores nothing, sends nothing to agents and makes no network requests.

Pressing the button briefly opens a small plugin screen that hands off to the agent, because composer buttons cannot navigate on their own. You may see it flash, and Back can return to it.
