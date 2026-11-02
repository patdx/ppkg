/** Internal diagnostics are opt-in; normal output stays task-focused. */
export function debug(...messages: unknown[]): void {
  if (process.env.PPKG_VERBOSE === '1') console.error(...messages)
}
