import type { PluginScreenProps } from "@getpaseo/plugin/client";
import { useEffect, useMemo } from "react";
import { Text, View } from "react-native";

/** Button handlers get no navigation API, so they open this screen to reach an agent. */
export function JumpScreen({ params, navigation, theme, layout }: PluginScreenProps) {
  useEffect(() => {
    if (params.agentId && navigation) navigation.openAgent({ agentId: params.agentId });
  }, [params.agentId, navigation]);

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
      <Text style={styles.text}>Opening reviewer…</Text>
    </View>
  );
}
