import { createApp, createRouter, defineMiddleware } from 'express-zod'
import { z } from 'zod'

const auth = defineMiddleware<{ user: { id: number } }>((_req, _res, next) => next())
const admin = defineMiddleware<{ admin: boolean }>((_req, _res, next) => next())

export const users = createRouter()
  .use(auth)
  .get('/:id', { params: z.object({ id: z.coerce.number() }) }, (req, res) => {
    res.json({ id: req.params.id, user: req.user.id })
  })

export const app = createApp()
  .use('/admin', admin)
  .use('/users', users)
  .get('/health', (_req, res) => {
    res.send('ok')
  })
