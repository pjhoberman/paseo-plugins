import type { ReviewerSettings } from "../shared/contracts";

type Listener = (settings: ReviewerSettings) => void;

let settings: ReviewerSettings = { reviewers: {}, reviewerModes: {} };
const listeners = new Set<Listener>();

export const settingsStore = {
  get: () => settings,
  set(next: ReviewerSettings) {
    settings = next;
    for (const listener of listeners) listener(next);
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
