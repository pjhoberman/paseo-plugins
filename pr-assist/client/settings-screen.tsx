import { type PluginSurfaceProps, usePaseo, useSettings } from "@getpaseo/plugin/client";
import {
  SettingsAction,
  SettingsCard,
  SettingsInput,
  SettingsSection,
} from "@getpaseo/plugin/client/ui";
import { useEffect, useRef, useState } from "react";
import { Text } from "react-native";
import { reviewerSettings } from "../shared/contracts";
import { availableProviders, providerLabel, resolveReviewer } from "./reviewer";
import { settingsStore } from "./settings-store";

function autoLabel(provider: string, available: ReadonlySet<string>): string {
  const auto = resolveReviewer(provider, {}, available);
  return auto ? `Automatic: ${providerLabel(auto)}` : "Not set";
}

export function SettingsScreen({ theme }: PluginSurfaceProps) {
  const paseo = usePaseo();
  const settings = useSettings(reviewerSettings);
  const [providers, setProviders] = useState<string[]>([]);
  const [available, setAvailable] = useState<ReadonlySet<string>>(new Set());
  const drafts = useRef<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    paseo.providers
      .snapshot()
      .then(({ entries }) => setProviders(entries.filter((e) => e.enabled).map((e) => e.provider)))
      .catch((error) => console.error("[pr-assist] provider snapshot failed", error));
    availableProviders(paseo)
      .then(setAvailable)
      .catch((error) => console.error("[pr-assist] provider list failed", error));
  }, [paseo]);

  if (settings.status !== "ready") {
    return <Text style={{ color: theme.colors.foregroundMuted }}>Loading…</Text>;
  }

  async function save() {
    if (settings.status !== "ready") return;
    const reviewers = { ...settings.values.reviewers, ...drafts.current };
    for (const key of Object.keys(reviewers)) if (!reviewers[key]?.trim()) delete reviewers[key];
    if (await settings.save({ reviewers }, settings.revision)) {
      settingsStore.set(reviewers);
      setSaved(true);
    }
  }

  return (
    <SettingsSection
      title="Adversarial review"
      info='Which model reviews each provider’s work. Use "provider" or "provider/model", e.g. codex or opencode/google-vertex/gemini-3.1-pro-preview. Leave empty for automatic.'
    >
      <SettingsCard>
        {providers.map((provider) => (
          <SettingsInput
            key={provider}
            label={`${providerLabel(provider)} agents`}
            initialValue={settings.values.reviewers[provider] ?? ""}
            placeholder={autoLabel(provider, available)}
            onChangeText={(text) => {
              drafts.current[provider] = text;
              setSaved(false);
            }}
          />
        ))}
        <SettingsAction
          label={saved ? "Saved" : "Save reviewers"}
          error={settings.saveError ? String(settings.saveError) : undefined}
          actionLabel="Save"
          disabled={settings.saving}
          onPress={save}
        />
      </SettingsCard>
    </SettingsSection>
  );
}
