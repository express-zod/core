import type { RouteRecord } from './types/route.ts'

type Entry =
  | { type: 'route'; record: RouteRecord }
  | { type: 'mount'; target: object; prefix: string }

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

export function mountRoutes(target: object, source: unknown, prefix: string): void {
  if ((typeof source !== 'object' && typeof source !== 'function') || source === null) return
  if (!registry.has(source)) return

  entriesOf(target).push({ type: 'mount', target: source, prefix })
}

function collect(target: object, prefix: string, seen: Set<object>): RouteRecord[] {
  if (seen.has(target)) return []

  seen.add(target)

  const records: RouteRecord[] = []

  for (const entry of registry.get(target) ?? []) {
    if (entry.type === 'route') {
      records.push({ ...entry.record, path: joinPath(prefix, entry.record.path) })
    } else {
      records.push(...collect(entry.target, joinPath(prefix, entry.prefix), seen))
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

function joinPath(prefix: string, path: string): string {
  if (prefix === '' || prefix === '/') return path

  const base = prefix.replace(/\/+$/, '')
  if (path === '' || path === '/') return base

  return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`
}
