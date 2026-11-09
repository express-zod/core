import express from 'express'
import { createApp, type RoutesOf } from 'express-zod'

import { userRouter } from './user.router.ts'

const app = createApp()
  .use(express.json())
  .get('/', (_, res) => {
    res.json({
      message: 'Hello /',
    })
  })
  .use('/api', userRouter)

app.listen(3000, () => {
  console.log('http://localhost:3000')
})

console.log(app.registry)

export type App = RoutesOf<typeof app>
