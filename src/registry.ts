import type { RouteRecord, RouteSchemas } from './types/route.ts'

type MiddlewareEntry = { prefix: string; schemas: RouteSchemas }

type Entry =
  | { type: 'route'; record: RouteRecord }
  | { type: 'mount'; target: object; prefix: string }
  | { type: 'middleware'; schemas: RouteSchemas; prefix: string }

const registry = new WeakMap<object, Entry[]>()

export function collectRoutes(target: object): readonly RouteRecord[] {
  return collect(target, '', new Set())
}

export function ensureRegistry(target: object): void {
  entriesOf(target)
}

export function addRoute(target: object, record: RouteRecord): void {
  entriesOf(target).push({ type: 'route', record })
}

export function addMiddleware(target: object, schemas: RouteSchemas, prefix: string): void {
  entriesOf(target).push({ type: 'middleware', schemas, prefix })
}

export function mountRoutes(target: object, source: unknown, prefix: string): void {
  if ((typeof source !== 'object' && typeof source !== 'function') || source === null) return
  if (!registry.has(source)) return

  entriesOf(target).push({ type: 'mount', target: source, prefix })
}

function collect(
  target: object,
  prefix: string,
  seen: Set<object>,
  inherited: readonly MiddlewareEntry[] = [],
): RouteRecord[] {
  if (seen.has(target)) return []

  seen.add(target)

  const records: RouteRecord[] = []
  const middleware = [...inherited]

  for (const entry of registry.get(target) ?? []) {
    if (entry.type === 'route') {
      const path = joinPath(prefix, entry.record.path)
      const applied = middleware
        .filter(({ prefix: scoped }) => appliesTo(scoped, path))
        .map(({ schemas }) => schemas)

      records.push(
        applied.length ? { ...entry.record, path, middleware: applied } : { ...entry.record, path },
      )
    } else if (entry.type === 'mount') {
      records.push(...collect(entry.target, joinPath(prefix, entry.prefix), seen, middleware))
    } else {
      middleware.push({ prefix: joinPath(prefix, entry.prefix), schemas: entry.schemas })
    }
  }

  seen.delete(target)

  return records
}

function entriesOf(target: object): Entry[] {
  const entries = registry.get(target)
  if (entries) return entries

  const created: Entry[] = []
  registry.set(target, created)

  return created
}

function appliesTo(prefix: string, path: string): boolean {
  const normalized = normalizePrefix(prefix)
  if (normalized === '') return true

  return path === normalized || path.startsWith(`${normalized}/`)
}

function normalizePrefix(prefix: string): string {
  if (prefix === '' || prefix === '/') return ''

  return prefix.replace(/\/+$/, '')
}

function joinPath(prefix: string, path: string): string {
  if (prefix === '' || prefix === '/') return path

  const base = prefix.replace(/\/+$/, '')
  if (path === '' || path === '/') return base

  return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`
}
