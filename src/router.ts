import { Router as createExpressRouter } from 'express'
import type { RouterOptions } from 'express'

import { registerRouteMethods } from './register.ts'
import type { Router } from './types/route.ts'

export function createRouter(options?: RouterOptions) {
  return registerRouteMethods(createExpressRouter(options)) as unknown as Router
}
