import { type PluginButtonContentProps, usePaseo } from "@getpaseo/plugin/client";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { unsavedWork } from "./workspace";

export function makeConfirmArchive(onArchived: (workspaceId: string) => void) {
  return function ConfirmArchive(props: PluginButtonContentProps) {
    return <ConfirmArchiveBody {...props} onArchived={onArchived} />;
  };
}

function ConfirmArchiveBody(
  props: PluginButtonContentProps & { onArchived: (workspaceId: string) => void },
) {
  const { theme, close } = props;
  const workspaceId = props.workspaceId;
  const paseo = usePaseo();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const reasons = unsavedWork(paseo.workspaces.ref(workspaceId).current());
  const atRisk = reasons.length > 0;
  let archiveLabel = atRisk ? "Archive anyway" : "Archive";
  if (busy) archiveLabel = "Archiving…";

  const styles = useMemo(
    () => ({
      body: { gap: 12, maxWidth: 320 },
      title: { color: theme.colors.foreground, fontSize: 14, fontWeight: "600" as const },
      detail: { color: theme.colors.foregroundMuted, fontSize: 13 },
      error: { color: theme.colors.statusDanger, fontSize: 13 },
      row: { flexDirection: "row" as const, gap: 8, justifyContent: "flex-end" as const },
      button: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
      cancel: { backgroundColor: theme.colors.surface2 },
      danger: { backgroundColor: theme.colors.statusDanger },
      cancelText: { color: theme.colors.foreground, fontSize: 13 },
      dangerText: { color: theme.colors.surface0, fontSize: 13, fontWeight: "600" as const },
    }),
    [theme],
  );

  async function archive() {
    setBusy(true);
    setError(null);
    try {
      await paseo.workspaces.ref(workspaceId).archive();
      close();
      props.onArchived(workspaceId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setBusy(false);
    }
  }

  return (
    <View style={styles.body}>
      <Text style={styles.title}>Archive this workspace?</Text>
      <Text style={styles.detail}>
        {atRisk
          ? `It has ${reasons.join(" and ")}, which may be lost.`
          : "Its changes are all committed and pushed now."}
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          onPress={close}
          style={[styles.button, styles.cancel]}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={atRisk ? "Archive workspace anyway" : "Archive workspace"}
          disabled={busy}
          onPress={archive}
          style={[styles.button, styles.danger, busy ? { opacity: 0.6 } : null]}
        >
          <Text style={styles.dangerText}>{archiveLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}
