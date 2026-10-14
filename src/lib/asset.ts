/** Resolves a public asset path against the build base, so the app works on any host path. */
export function asset(path: string): string {
  if (/^(https?:|data:|blob:)/.test(path)) return path
  return import.meta.env.BASE_URL + path.replace(/^\//, '')
}
