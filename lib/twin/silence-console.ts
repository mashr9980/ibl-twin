/**
 * The ibl SDK logs the raw JWT, all three tokens, the signed-in email and
 * is_admin on every page load. That is a session disclosure in production.
 *
 * `compiler.removeConsole` cannot reach it: Next applies that transform to
 * first-party source only, and the SDK ships pre-compiled inside node_modules,
 * so the calls survive into the bundle. Overriding the methods at runtime is
 * the one fix that reaches third-party code without transpiling the whole SDK.
 *
 * error and warn are deliberately preserved so real failures still surface.
 * Imported for its side effect, first, before anything that logs.
 */
if (process.env.NODE_ENV === "production" && typeof window !== "undefined") {
  const noop = () => {};
  console.log = noop;
  console.debug = noop;
  console.info = noop;
  console.table = noop;
  console.dir = noop;
  console.group = noop;
  console.groupCollapsed = noop;
  console.trace = noop;
}

export {};
