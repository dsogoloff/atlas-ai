// No-op stub for `server-only` under vitest. Aliased in vitest.config.ts.
//
// In production, Next.js's bundler intercepts `import "server-only"` and
// resolves it via the `react-server` export condition (an empty no-op);
// the same import in a client bundle resolves to a throwing stub that
// breaks the build. Vitest doesn't run with the `react-server` condition,
// so it would otherwise hit the throwing stub. This file replaces the
// import with a true no-op for tests only.
export {};
