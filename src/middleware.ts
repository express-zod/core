import type { NextFunction, Request, Response } from 'express'

import type { Middleware } from './types/middleware.ts'

export function defineMiddleware<Provides extends object = {}>(
  handler: (req: Request & Provides, res: Response, next: NextFunction) => unknown,
): Middleware<Provides> {
  return handler as Middleware<Provides>
}
