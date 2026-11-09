import { createRouter } from 'express-zod'
import { z } from 'zod'

export const userRouter = createRouter()
  .get('/users', (_, res) => {
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
