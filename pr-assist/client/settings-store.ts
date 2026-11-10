type Listener = (reviewers: Record<string, string>) => void;

let reviewers: Record<string, string> = {};
const listeners = new Set<Listener>();

export const settingsStore = {
  get: () => reviewers,
  set(next: Record<string, string>) {
    reviewers = next;
    for (const listener of listeners) listener(next);
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
