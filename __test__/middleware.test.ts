import request from 'supertest'

import { createApp, createRouter, defineMiddleware } from '../src/index.ts'

describe('inherit', () => {
  it('merges context without registering the middleware', async () => {
    let calls = 0
    const auth = defineMiddleware((_req, _res, next) => {
      calls += 1
      next()
    })

    const router = createRouter()
      .inherit(auth)
      .get('/ping', (_req, res) => {
        res.send('pong')
      })

    const app = createApp().use('/api', router)
    const res = await request(app).get('/api/ping')

    expect(res.status).toBe(200)
    expect(calls).toBe(0)
  })

  it('keeps middleware registered with use running', async () => {
    let calls = 0
    const auth = defineMiddleware((_req, _res, next) => {
      calls += 1
      next()
    })

    const app = createApp()
      .use(auth)
      .get('/ping', (_req, res) => {
        res.send('pong')
      })

    await request(app).get('/ping')

    expect(calls).toBe(1)
  })
})
