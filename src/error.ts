import type { ZodError } from 'zod'

import type { RouteSchemas } from './types/route.ts'

export type ValidationLocation = keyof Pick<RouteSchemas, 'params' | 'query' | 'body' | 'headers'>

export class ValidationError extends Error {
  readonly status = 400
  readonly statusCode = 400
  readonly issues: ZodError['issues']

  constructor(
    readonly location: ValidationLocation,
    readonly zodError: ZodError,
  ) {
    super(`Invalid request ${location}`, { cause: zodError })
    this.name = 'ValidationError'
    this.issues = zodError.issues
  }
}
