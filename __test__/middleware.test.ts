import request from 'supertest'
import { z } from 'zod'

import { createApp, createRouter, defineMiddleware } from '../src/index.ts'

describe('middleware schemas', () => {
  it('validates the request against declared schemas', async () => {
    const auth = defineMiddleware({ headers: z.object({ authorization: z.string().min(1) }) })(
      (_req, _res, next) => next(),
    )

    const app = createApp()
      .use(auth)
      .get('/ping', (_req, res) => {
        res.send('pong')
      })

    expect(app.registry[0]!.middleware).toHaveLength(1)

    const ok = await request(app).get('/ping').set('authorization', 'token')
    const missing = await request(app).get('/ping')
    const empty = await request(app).get('/ping').set('authorization', '')

    expect(ok.status).toBe(200)
    expect(missing.status).toBe(400)
    expect(empty.status).toBe(400)
  })

  it('accepts schemas without a handler', async () => {
    const auth = defineMiddleware({ headers: z.object({ authorization: z.string() }) })

    const app = createApp()
      .use(auth)
      .get('/ping', (_req, res) => {
        res.send('pong')
      })

    const ok = await request(app).get('/ping').set('authorization', 'token')
    const missing = await request(app).get('/ping')

    expect(ok.status).toBe(200)
    expect(missing.status).toBe(400)
  })

  it('accepts schemas and a handler in one call', async () => {
    const auth = defineMiddleware(
      { headers: z.object({ authorization: z.string() }) },
      (req, _res, next) => {
        req.headers.authorization = `${req.headers.authorization}!`
        next()
      },
    )

    const app = createApp()
      .use(auth)
      .get('/ping', (req, res) => {
        res.json({ authorization: req.headers.authorization })
      })

    const res = await request(app).get('/ping').set('authorization', 'token')

    expect(res.body).toEqual({ authorization: 'token!' })
  })

  it('accepts a handler before schemas', async () => {
    const auth = defineMiddleware(
      (req, _res, next) => {
        req.headers.authorization = `${req.headers.authorization}!`
        next()
      },
      { headers: z.object({ authorization: z.string() }) },
    )

    const app = createApp()
      .use(auth)
      .get('/ping', (req, res) => {
        res.json({ authorization: req.headers.authorization })
      })

    const res = await request(app).get('/ping').set('authorization', 'token')

    expect(res.body).toEqual({ authorization: 'token!' })
  })

  it('collects schemas after a handler', async () => {
    const auth = defineMiddleware<{ user: { id: number } }>((req, _res, next) => {
      req.user = { id: 1 }
      next()
    })({ headers: z.object({ authorization: z.string() }) })

    const app = createApp()
      .use(auth)
      .get('/me', (req, res) => {
        res.json({ user: req.user, authorization: req.headers.authorization })
      })

    const res = await request(app).get('/me').set('authorization', 'token')

    expect(res.body).toEqual({ user: { id: 1 }, authorization: 'token' })
  })

  it('infers schemas when the context is explicit', async () => {
    const auth = defineMiddleware({ headers: z.object({ authorization: z.string() }) })<{
      user: { id: number }
    }>((req, _res, next) => {
      req.user = { id: 7 }
      next()
    })

    const app = createApp()
      .use(auth)
      .get('/me', (req, res) => {
        res.json({ user: req.user, authorization: req.headers.authorization })
      })

    const res = await request(app).get('/me').set('authorization', 'token')

    expect(res.body).toEqual({ user: { id: 7 }, authorization: 'token' })
  })

  it('exposes parsed input to later handlers', async () => {
    const auth = defineMiddleware({
      headers: z.object({
        authorization: z.string().transform((value) => value.toUpperCase()),
      }),
    })((_req, _res, next) => next())

    const app = createApp()
      .use(auth)
      .get('/ping', (req, res) => {
        res.json({ authorization: req.headers.authorization })
      })

    const res = await request(app).get('/ping').set('authorization', 'token')

    expect(res.body).toEqual({ authorization: 'TOKEN' })
  })
})

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

  it('records middleware schemas for matching routes', () => {
    const auth = defineMiddleware({ headers: z.object({ authorization: z.string() }) })(
      (_req, _res, next) => next(),
    )

    const router = createRouter()
      .use(auth)
      .get('/', (_req, res) => {
        res.send('ok')
      })

    const app = createApp()
      .use('/admin', auth)
      .get('/admin', (_req, res) => {
        res.send('ok')
      })
      .get('/public', (_req, res) => {
        res.send('ok')
      })
      .use('/api', router)

    expect(app.registry[0]!.middleware).toHaveLength(1)
    expect(app.registry[1]!.middleware).toBeUndefined()
    expect(app.registry[2]!.middleware).toHaveLength(1)
    expect(app.registry[2]!.path).toBe('/api')
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
