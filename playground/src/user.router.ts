import { createRouter } from 'express-zod'
import { z } from 'zod'

import { authenticate, requestId } from './middleware.ts'

export const userRouter = createRouter()
  .inherit(requestId)
  .use(authenticate)
  .get('/users', (_req, res) => {
    res.json({ message: 'Hello /users' })
  })
  .get(
    '/users/:id',
    {
      params: z.object({
        id: z.coerce.number(),
      }),
      response: z.object({
        message: z.coerce.string(),
      }),
    },
    (req, res) => {
      res.json({ message: `Hello /users ${req.params.id}` })
    },
  )
  .get('/me', (req, res) => {
    res.json({ requestId: req.requestId, user: req.user })
  })
