import type { NextFunction, Request, Response } from 'express'

import type { Middleware } from './types/middleware.ts'
import type { RouteRequest, RouteSchemas } from './types/route.ts'
import { validate } from './validate.ts'

type Handler<Provides extends object = {}> = (
  req: Request & Provides,
  res: Response,
  next: NextFunction,
) => unknown

type SchemaHandler<Schemas extends RouteSchemas, Provides extends object = {}> = (
  req: RouteRequest<Schemas, string> & Provides,
  res: Response,
  next: NextFunction,
) => unknown

const schemasByMiddleware = new WeakMap<object, RouteSchemas>()

export function defineMiddleware<Provides extends object = {}>(
  handler: Handler<Provides>,
): Middleware<Provides> & {
  <Schemas extends RouteSchemas>(schemas: Schemas): Middleware<Provides, Schemas>
}
export function defineMiddleware<Schemas extends RouteSchemas>(
  schemas: Schemas,
): Middleware<{}, Schemas> & {
  <Provides extends object = {}>(
    handler: SchemaHandler<Schemas, Provides>,
  ): Middleware<Provides, Schemas>
}
export function defineMiddleware<Schemas extends RouteSchemas>(
  schemas: Schemas,
  handler: SchemaHandler<Schemas>,
): Middleware<{}, Schemas>
export function defineMiddleware<Schemas extends RouteSchemas>(
  handler: SchemaHandler<Schemas>,
  schemas: Schemas,
): Middleware<{}, Schemas>
export function defineMiddleware(
  first: RouteSchemas | Handler,
  second?: RouteSchemas | Handler,
): any {
  if (typeof first === 'function') {
    return second ? createMiddleware(second as RouteSchemas, first) : handlerMiddleware(first)
  }

  return second ? createMiddleware(first, second as Handler) : schemasMiddleware(first)
}

export function getMiddlewareSchemas(handler: unknown): RouteSchemas | undefined {
  return schemasByMiddleware.get(handler as object)
}

function handlerMiddleware(handler: Handler) {
  const middleware = ((req: any, res?: Response, next?: NextFunction) => {
    if (!res || !next) {
      return createMiddleware(req as RouteSchemas, handler)
    }

    return handler(req, res, next)
  }) as Middleware<any>

  return middleware
}

function schemasMiddleware(schemas: RouteSchemas) {
  const middleware = ((req: any, res?: Response, next?: NextFunction) => {
    if (!res || !next) {
      return createMiddleware(schemas, req as Handler)
    }

    return validate(schemas)(req, res, next)
  }) as Middleware<any>

  schemasByMiddleware.set(middleware, schemas)

  return middleware
}

function createMiddleware(schemas: RouteSchemas, handler: Handler) {
  const middleware = ((req: Request, res: Response, next: NextFunction) => {
    validate(schemas)(req, res, (error?: unknown) => {
      if (error) {
        next(error)
        return
      }

      handler(req, res, next)
    })
  }) as Middleware<any>

  schemasByMiddleware.set(middleware, schemas)

  return middleware
}
