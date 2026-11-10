import type { PluginScreenProps } from "@getpaseo/plugin/client";
import { useEffect, useMemo } from "react";
import { Text, View } from "react-native";

/**
 * Pill actions get no navigation API, so the pill opens this screen with the
 * target agent in params and the screen hands off to client navigation.
 */
export function JumpScreen({ params, navigation, theme, layout }: PluginScreenProps) {
  const agentId = params.agentId;
  useEffect(() => {
    if (agentId && navigation) navigation.openAgent({ agentId });
  }, [agentId, navigation]);

  const styles = useMemo(
    () => ({
      screen: {
        flex: 1,
        padding: layout.compact ? 16 : 24,
        backgroundColor: theme.colors.surface0,
      },
      text: { color: theme.colors.foregroundMuted },
    }),
    [theme, layout.compact],
  );

  return (
    <View style={styles.screen}>
      <Text style={styles.text}>
        {navigation ? "Opening agent…" : "This Paseo version cannot open agents from plugins."}
      </Text>
    </View>
  );
}
