// Transient UI choice, scoped to the signed-in workspace. Never synced/backed up.
const accepted = new Set<string>(),
  listeners = new Set<() => void>();
export const mediaConsent = (scope: string) => accepted.has(scope);
export function subscribeMediaConsent(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function acceptMediaConsent(scope: string) {
  accepted.add(scope);
  listeners.forEach((listener) => listener());
}
export function clearMediaConsent(scope: string) {
  accepted.delete(scope);
  listeners.forEach((listener) => listener());
}
