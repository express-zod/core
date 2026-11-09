import express from 'express'
import { createApp, type RoutesOf } from 'express-zod'

import { requestId, requireAdmin } from './middleware.ts'
import { userRouter } from './user.router.ts'

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
  .use('/api', userRouter)

app.listen(3000, () => {
  console.log('http://localhost:3000')
})

console.log(app.registry)

export type App = RoutesOf<typeof app>
