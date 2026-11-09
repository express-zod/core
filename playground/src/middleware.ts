import { randomUUID } from 'node:crypto'

import { defineMiddleware } from 'express-zod'
import { z } from 'zod'

export const requestId = defineMiddleware<{ requestId: string }>((req, _res, next) => {
  req.requestId = randomUUID()
  next()
})

export const authenticate = defineMiddleware({
  headers: z.object({ authorization: z.string().min(1) }),
})<{ user: { id: number; name: string } }>((req, _res, next) => {
  void req.headers.authorization
  req.user = { id: 1, name: 'demo' }
  next()
})

export const requireAdmin = defineMiddleware({
  headers: z.object({ 'x-role': z.literal('admin') }),
})<{ isAdmin: boolean }>((req, _res, next) => {
  req.isAdmin = true
  next()
})

export const paginate = defineMiddleware((_req, _res, next) => {
  next()
})({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(10),
  }),
})
