/** Opt-in portfolio capture. Unset in tests and in the normal app, so real saves stay on their own keys. */
export function isDemoMode(): boolean {
  return process.env.EXPO_PUBLIC_SAVORA_DEMO === '1';
}
