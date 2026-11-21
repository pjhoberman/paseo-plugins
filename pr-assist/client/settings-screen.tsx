import { type PluginSurfaceProps, usePaseo, useSettings } from "@getpaseo/plugin/client";
import {
  SettingsAction,
  SettingsCard,
  SettingsInput,
  SettingsSection,
  SettingsSelect,
} from "@getpaseo/plugin/client/ui";
import { useEffect, useRef, useState } from "react";
import { Text } from "react-native";
import { reviewerSettings } from "../shared/contracts";
import type { PaseoApi } from "./model";
import { availableProviders, providerLabel, resolveReviewer } from "./reviewer";
import { settingsStore } from "./settings-store";

type ProviderEntry = Awaited<ReturnType<PaseoApi["providers"]["snapshot"]>>["entries"][number];

function autoLabel(provider: string, available: ReadonlySet<string>): string {
  const auto = resolveReviewer(provider, {}, available);
  return auto ? `Automatic: ${providerLabel(auto)}` : "Not set";
}

/** Mode choices for a reviewer provider. "" keeps the provider's default mode. */
function modeOptions(entry: ProviderEntry, current: string) {
  const modes = entry.modes ?? [];
  const fallback = modes.find((mode) => mode.id === entry.defaultModeId)?.label;
  const options = [
    { label: fallback ? `Default (${fallback})` : "Default", value: "" },
    ...modes.map((mode) => ({ label: mode.label, value: mode.id })),
  ];
  // Keep a saved mode visible even if the provider no longer lists it.
  if (current && !modes.some((mode) => mode.id === current)) {
    options.push({ label: current, value: current });
  }
  return options;
}

export function SettingsScreen({ theme }: PluginSurfaceProps) {
  const paseo = usePaseo();
  const settings = useSettings(reviewerSettings);
  const [providers, setProviders] = useState<ProviderEntry[]>([]);
  const [available, setAvailable] = useState<ReadonlySet<string>>(new Set());
  const drafts = useRef<Record<string, string>>({});
  const [modeDrafts, setModeDrafts] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let ready = false;
    const show = (entries: ProviderEntry[]) => setProviders(entries.filter((e) => e.enabled));
    paseo.providers
      .snapshot()
      .then(({ entries }) => {
        if (!ready) show(entries);
      })
      .catch((error) => console.error("[pr-assist] provider snapshot failed", error));
    // Modes arrive with the daemon's lazy provider discovery, so refresh once it finishes.
    paseo.providers
      .waitForReady()
      .then(({ entries }) => {
        ready = true;
        show(entries);
      })
      .catch((error) => console.error("[pr-assist] provider discovery failed", error));
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
    const reviewerModes = { ...settings.values.reviewerModes, ...modeDrafts };
    for (const key of Object.keys(reviewerModes)) if (!reviewerModes[key]) delete reviewerModes[key];
    if (await settings.save({ reviewers, reviewerModes }, settings.revision)) {
      settingsStore.set({ reviewers, reviewerModes });
      setSaved(true);
    }
  }

  return (
    <>
      <SettingsSection
        title="Adversarial review"
        info='Which model reviews each provider’s work. Use "provider" or "provider/model", e.g. codex or opencode/google-vertex/gemini-3.1-pro-preview. Leave empty for automatic.'
      >
        <SettingsCard>
          {providers.map(({ provider }) => (
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
        </SettingsCard>
      </SettingsSection>
      <SettingsSection
        title="Reviewer permissions"
        info="The permission mode a review agent starts in, set for the provider that runs the review. Default uses the mode a new agent gets on that provider."
      >
        <SettingsCard>
          {providers.map((entry) => {
            const value = modeDrafts[entry.provider] ?? settings.values.reviewerModes[entry.provider] ?? "";
            return (
              <SettingsSelect
                key={entry.provider}
                label={`${providerLabel(entry.provider)} reviewer`}
                value={value}
                options={modeOptions(entry, value)}
                onValueChange={(next) => {
                  setModeDrafts((current) => ({ ...current, [entry.provider]: next }));
                  setSaved(false);
                }}
              />
            );
          })}
          <SettingsAction
            label={saved ? "Saved" : "Save reviewers"}
            error={settings.saveError ? String(settings.saveError) : undefined}
            actionLabel="Save"
            disabled={settings.saving}
            onPress={save}
          />
        </SettingsCard>
      </SettingsSection>
    </>
  );
}
