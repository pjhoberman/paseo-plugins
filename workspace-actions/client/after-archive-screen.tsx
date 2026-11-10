import { type PluginScreenProps, usePaseo } from "@getpaseo/plugin/client";
import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import type { Workspace } from "./workspace";

/** Most recently active open workspace, preferring the archived one's project. */
function pickNext(entries: Workspace[], fromId: string, projectId: string | undefined) {
  const candidates = entries
    .filter((w) => w.id !== fromId && !w.archivingAt && !w.internal && !w.background)
    .sort((a, b) => (b.activityAt ?? "").localeCompare(a.activityAt ?? ""));
  return candidates.find((w) => w.projectId === projectId) ?? candidates[0] ?? null;
}

/**
 * Button handlers get no navigation API, so archiving opens this screen, which
 * moves on to another workspace instead of leaving "Workspace unavailable".
 */
export function AfterArchiveScreen({ params, navigation, theme, layout }: PluginScreenProps) {
  const paseo = usePaseo();
  const [message, setMessage] = useState("Workspace archived.");

  useEffect(() => {
    let cancelled = false;
    paseo.workspaces
      .list()
      .then(({ entries }) => {
        if (cancelled) return;
        const next = pickNext(entries, params.from ?? "", params.project);
        if (next && navigation) navigation.openWorkspace({ workspaceId: next.id });
        else setMessage("Workspace archived. No other workspaces are open.");
      })
      .catch((error) => {
        console.error("[workspace-actions] could not list workspaces", error);
      });
    return () => {
      cancelled = true;
    };
  }, [paseo, navigation, params.from, params.project]);

  const styles = useMemo(
    () => ({
      screen: {
        flex: 1,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        padding: layout.compact ? 16 : 24,
        backgroundColor: theme.colors.surface0,
      },
      text: { color: theme.colors.foregroundMuted },
    }),
    [theme, layout.compact],
  );

  return (
    <View style={styles.screen}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}
