// Test-only resolve hook: lets Node load extensionless relative TypeScript imports, as Vite does.
export async function resolve(spec, ctx, next) {
  try {
    return await next(spec, ctx)
  } catch (e) {
    if (spec.startsWith('.') && !/\.[a-z]+$/.test(spec)) return next(`${spec}.ts`, ctx)
    throw e
  }
}
