import { randomUUID } from 'node:crypto'

import { defineMiddleware } from 'express-zod'

export const requestId = defineMiddleware<{ requestId: string }>((req, _res, next) => {
  req.requestId = randomUUID()
  next()
})

export const authenticate = defineMiddleware<{ user: { id: number; name: string } }>(
  (req, res, next) => {
    if (!req.headers.authorization) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    req.user = { id: 1, name: 'demo' }
    next()
  },
)

export const requireAdmin = defineMiddleware<{ isAdmin: boolean }>((req, res, next) => {
  if (req.headers['x-role'] !== 'admin') {
    res.status(403).json({ message: 'Forbidden' })
    return
  }

  req.isAdmin = true
  next()
})
