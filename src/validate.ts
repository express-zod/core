import type { Request, RequestHandler } from 'express'
import type { ZodType } from 'zod'

import { ValidationError } from './error.ts'
import type { RouteSchemas } from './types/route.ts'

const LOCATIONS = ['params', 'query', 'body', 'headers'] as const

type SchemaInternals = {
  shape?: Record<string, unknown>
  in?: ZodType
  _zod?: { def?: { catchall?: { type?: string } } }
}

export function validate(schemas: RouteSchemas): RequestHandler {
  return async (req, _res, next) => {
    const entries = LOCATIONS.flatMap((location) => {
      const schema = schemas[location]
      if (!schema) return []

      const input = location === 'params' ? trimParams(req.params, schema) : req[location]
      return [{ location, result: schema.safeParseAsync(input) }]
    })
    const results = await Promise.all(
      entries.map(async (entry) => ({ location: entry.location, result: await entry.result })),
    )

    const parsed: Partial<Record<(typeof LOCATIONS)[number], unknown>> = {}

    for (const { location, result } of results) {
      if (!result.success) {
        next(new ValidationError(location, result.error))
        return
      }

      parsed[location] = result.data
    }

    if ('params' in parsed) Object.assign(req.params, parsed.params as Record<string, unknown>)
    if ('body' in parsed) req.body = parsed.body
    if ('headers' in parsed) req.headers = parsed.headers as typeof req.headers
    if ('query' in parsed) {
      Object.defineProperty(req, 'query', {
        value: parsed.query,
        writable: true,
        enumerable: true,
        configurable: true,
      })
    }

    next()
  }
}

function trimParams(params: Request['params'], schema: ZodType): unknown {
  const shape = strictShape(schema)
  if (!shape) return params

  const picked: Request['params'] = {}
  for (const key of Object.keys(shape)) {
    if (Object.hasOwn(params, key)) picked[key] = params[key] as string | string[]
  }
  return picked
}

function strictShape(schema: ZodType): Record<string, unknown> | undefined {
  const internals = schema as unknown as SchemaInternals

  if (internals.shape) {
    return internals._zod?.def?.catchall?.type === 'never' ? internals.shape : undefined
  }

  return internals.in ? strictShape(internals.in) : undefined
}
