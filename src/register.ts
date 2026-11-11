import { getMiddlewareSchemas } from './middleware.ts'
import { addMiddleware, addRoute, collectRoutes, ensureRegistry, mountRoutes } from './registry.ts'
import type { RouteMethod } from './types/http.ts'
import type { RouteSchemas } from './types/route.ts'
import { validate } from './validate.ts'

const ROUTE_METHODS = [
  'all',
  'connect',
  'delete',
  'get',
  'head',
  'options',
  'patch',
  'post',
  'put',
  'query',
  'trace',
] as const satisfies RouteMethod[]

export function registerRouteMethods<Target extends object>(target: Target): Target {
  ensureRegistry(target)

  const methods = target as unknown as Record<string, (...args: any[]) => any>

  for (const method of ROUTE_METHODS) {
    const original = methods[method]!.bind(target)

    methods[method] = (path: unknown, ...handlers: unknown[]) => {
      if (handlers.length === 0) return original(path)

      const [first, ...rest] = handlers
      if (isRouteSchemas(first)) {
        const result = original(path, validate(first), ...rest)
        addRoute(target, { method, path: String(path), schemas: first })
        return result
      }

      const result = original(path, ...handlers)
      addRoute(target, { method, path: String(path) })
      return result
    }
  }

  const use = methods.use!.bind(target)

  methods.use = (pathOrTarget: unknown, ...handlers: unknown[]) => {
    const result = use(pathOrTarget, ...handlers)

    const prefix = typeof pathOrTarget === 'string' ? pathOrTarget : ''
    const mounted = typeof pathOrTarget === 'string' ? handlers : [pathOrTarget, ...handlers]

    for (const candidate of mounted.flat(Infinity)) {
      mountRoutes(target, candidate, prefix)

      const schemas = getMiddlewareSchemas(candidate)
      if (schemas) addMiddleware(target, schemas, prefix)
    }

    return result
  }

  methods.onError = (...args: unknown[]) => {
    const path = typeof args[0] === 'string' ? (args.shift() as string) : undefined
    const handlers = args.flat(Infinity).map(normalizeErrorHandler)

    return path === undefined ? use(...handlers) : use(path, ...handlers)
  }

  // Type-only: the middleware is not registered on the Express stack.
  methods.inherit = () => target

  Object.defineProperty(target, 'registry', {
    configurable: true,
    get: () => collectRoutes(target),
  })

  return target
}

function normalizeErrorHandler(handler: unknown): unknown {
  if (typeof handler !== 'function' || handler.length === 4) return handler

  return (error: unknown, req: unknown, res: unknown, next: unknown) =>
    (handler as (...args: unknown[]) => unknown)(error, req, res, next)
}

function isRouteSchemas(value: unknown): value is RouteSchemas {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
