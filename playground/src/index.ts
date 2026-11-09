import express from 'express'
import { createApp, registerSchemaKey, type RoutesOf } from 'express-zod'

import { requestId, requireAdmin } from './middleware.ts'
import { userRouter } from './user.router.ts'

declare module 'express-zod' {
  interface RouteSchemas {
    doc?: { summary: string }
  }
}

registerSchemaKey('doc')

const app = createApp()
  .use(express.json())
  .use(requestId)
  .get('/', (req, res) => {
    res.json({ message: 'Hello /', requestId: req.requestId })
  })
  .use('/admin', requireAdmin)
  .get('/admin/dashboard', (req, res) => {
    res.json({ message: 'Hello /admin', requestId: req.requestId, isAdmin: req.isAdmin })
  })
  .get('/health', { doc: { summary: 'Health check' } }, (_req, res) => {
    res.send('ok')
  })
  .use('/api', userRouter)

app.listen(3000, () => {
  console.log('http://localhost:3000')
})

console.log(app.registry)

export type App = RoutesOf<typeof app>
