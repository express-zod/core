import request from 'supertest'
import { z } from 'zod'

import { createApp, createRouter } from '../src/index.ts'
import type { RouteSchemas } from '../src/index.ts'
import { collectRoutes, mountRoutes } from '../src/registry.ts'

describe('runtime route registry', () => {
  it('records routes with their schemas', () => {
    const params = z.object({ id: z.coerce.number() })

    const app = createApp()
      .get('/users/:id', { params }, (_req, res) => {
        res.send('ok')
      })
      .post('/users', (_req, res) => {
        res.send('ok')
      })
      .use((_req, _res, next) => next())

    expect(app.registry).toMatchObject([
      { method: 'get', path: '/users/:id', schemas: { params } },
      { method: 'post', path: '/users' },
    ])
    expect(app.registry).toHaveLength(2)
  })

  it('prefixes mounted routers without mutating the child', () => {
    const users = createRouter()
      .get('/:id', { params: z.object({ id: z.coerce.number() }) }, (_req, res) => {
        res.send('ok')
      })
      .post('/', (_req, res) => {
        res.send('ok')
      })

    const app = createApp().use('/users', users).use('/admin', users)

    expect(app.registry.map(({ method, path }) => `${method} ${path}`)).toEqual([
      'get /users/:id',
      'post /users',
      'get /admin/:id',
      'post /admin',
    ])
    expect(users.registry.map(({ path }) => path)).toEqual(['/:id', '/'])
  })

  it('composes nested mount prefixes', () => {
    const posts = createRouter().get('/:postId', (_req, res) => {
      res.send('ok')
    })
    const api = createRouter().use('/v1', posts)
    const app = createApp().use('/api', api)

    expect(app.registry).toMatchObject([{ method: 'get', path: '/api/v1/:postId' }])
  })

  it('syncs routes registered after mounting', () => {
    const users = createRouter()
    const app = createApp().use('/users', users)

    users.get('/:id', (_req, res) => {
      res.send('ok')
    })

    expect(app.registry).toMatchObject([{ method: 'get', path: '/users/:id' }])
  })

  it('syncs late routes through nested mounts', () => {
    const posts = createRouter()
    const api = createRouter().use('/v1', posts)
    const app = createApp().use('/api', api)

    posts.get('/:postId', (_req, res) => {
      res.send('ok')
    })

    expect(app.registry).toMatchObject([{ method: 'get', path: '/api/v1/:postId' }])
  })

  it('ignores mount cycles', () => {
    const first = createRouter()
    const second = createRouter()

    first.use(second)
    second.use(first)
    first.get('/ping', (_req, res) => {
      res.send('ok')
    })

    expect(first.registry.map(({ path }) => path)).toEqual(['/ping'])
  })

  it('joins prefixes with paths that omit the leading slash', () => {
    const router = createRouter().get('users', (_req, res) => {
      res.send('ok')
    })
    const app = createApp().use('/api', router)

    expect(app.registry.map(({ path }) => path)).toEqual(['/api/users'])
  })

  it('accepts custom schema keys', async () => {
    const operation = { summary: 'demo' }

    const app = createApp().get(
      '/custom',
      { operation } as unknown as RouteSchemas,
      (_req, res) => {
        res.send('ok')
      },
    )

    expect(app.registry).toMatchObject([{ method: 'get', path: '/custom', schemas: { operation } }])

    const res = await request(app).get('/custom')

    expect(res.status).toBe(200)
  })

  it('treats an array of handlers as handlers', () => {
    const app = createApp()

    app.get('/array', [(req, res) => res.send(req.path), (_req, res) => res.send('ok')])

    expect(app.registry).toMatchObject([{ method: 'get', path: '/array' }])
  })

  it('treats an empty array as handlers', async () => {
    const app = createApp().get('/empty-array', [], (_req, res) => {
      res.send('ok')
    })

    expect(app.registry).toStrictEqual([{ method: 'get', path: '/empty-array' }])

    const res = await request(app).get('/empty-array')

    expect(res.status).toBe(200)
  })

  it('accepts an empty object in place of schemas', async () => {
    const app = createApp().get('/empty', {}, (_req, res) => {
      res.send('ok')
    })

    expect(app.registry).toStrictEqual([{ method: 'get', path: '/empty', schemas: {} }])

    const res = await request(app).get('/empty')

    expect(res.status).toBe(200)
  })

  it('ignores mount targets that are not objects', () => {
    const target: Record<string, never> = {}

    mountRoutes(target, 'not-a-target', '/api')
    mountRoutes(target, null, '/api')

    expect(collectRoutes(target)).toEqual([])
  })

  it('collects an empty list for targets without entries', () => {
    expect(collectRoutes({})).toEqual([])
  })

  it('keeps mounted routes working', async () => {
    const users = createRouter().get('/:id', (_req, res) => {
      res.json({ id: 'ok' })
    })
    const app = createApp().use('/users', users)

    const res = await request(app).get('/users/1')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ id: 'ok' })
  })
})
