import { z } from 'zod'

import {
  createApp,
  createRouter,
  defineMiddleware,
  type Middleware,
  type RoutesOf,
} from '../src/index.ts'

describe('middleware context', () => {
  it('infers context from global middleware', () => {
    const auth = defineMiddleware<{ user: { id: number } }>((req, _res, next) => {
      expectTypeOf(req.user).toEqualTypeOf<{ id: number }>()
      next()
    })

    const app = createApp()
      .use(auth)
      .get('/me', (req, res) => {
        expectTypeOf(req.user.id).toEqualTypeOf<number>()
        res.json(req.user)
      })
      .post('/users', { body: z.object({ name: z.string() }) }, (req, res) => {
        expectTypeOf(req.body.name).toEqualTypeOf<string>()
        expectTypeOf(req.user.id).toEqualTypeOf<number>()
        res.json(req.body.name)
      })

    type Routes = RoutesOf<typeof app>
    expectTypeOf<keyof Routes>().toEqualTypeOf<'get /me' | 'post /users'>()
  })

  it('accumulates multiple middleware contexts', () => {
    const auth = defineMiddleware<{ user: { id: number } }>((_req, _res, next) => next())
    const trace = defineMiddleware<{ traceId: string }>((_req, _res, next) => next())

    createApp()
      .use(auth)
      .use(trace)
      .get('/', (req, res) => {
        expectTypeOf(req.user.id).toEqualTypeOf<number>()
        expectTypeOf(req.traceId).toEqualTypeOf<string>()
        res.send('ok')
      })
  })

  it('keeps router middleware local', () => {
    const auth = defineMiddleware<{ user: { id: number } }>((_req, _res, next) => next())

    const users = createRouter()
      .use(auth)
      .get('/:id', (req, res) => {
        expectTypeOf(req.user.id).toEqualTypeOf<number>()
        res.json(req.params.id)
      })

    const app = createApp().use('/users', users)

    app.get('/open', (req, _res) => {
      // @ts-expect-error router context does not leak to the parent
      void req.user
    })
  })

  it('applies middleware only to routes registered after it', () => {
    const auth = defineMiddleware<{ user: { id: number } }>((_req, _res, next) => next())

    createApp()
      .get('/before', (req, _res) => {
        // @ts-expect-error context is not registered yet
        void req.user
      })
      .use(auth)
      .get('/after', (req, res) => {
        expectTypeOf(req.user.id).toEqualTypeOf<number>()
        res.send('ok')
      })
  })

  it('ignores plain express middleware', () => {
    const app = createApp().use((_req, _res, next) => next())

    app.get('/ping', (req, _res) => {
      // @ts-expect-error plain middleware provides no context
      void req.user
    })
  })

  it('applies middleware to matching path scopes', () => {
    const auth = defineMiddleware<{ admin: boolean }>((req, _res, next) => {
      req.admin = true
      next()
    })

    createApp()
      .use('/admin', auth)
      .get('/admin', (req, res) => {
        expectTypeOf(req.admin).toEqualTypeOf<boolean>()
        res.send('ok')
      })
      .get('/admin/users', (req, res) => {
        expectTypeOf(req.admin).toEqualTypeOf<boolean>()
        res.send('ok')
      })
      .get('/administrator', (req, _res) => {
        // @ts-expect-error scope must end at a path boundary
        void req.admin
      })
      .get('/users', (req, _res) => {
        // @ts-expect-error outside the scoped prefix
        void req.admin
      })
  })

  it('merges global and scoped middleware contexts', () => {
    const trace = defineMiddleware<{ traceId: string }>((_req, _res, next) => next())
    const admin = defineMiddleware<{ admin: boolean }>((_req, _res, next) => next())
    const role = defineMiddleware<{ role: string }>((_req, _res, next) => next())

    createApp()
      .use(trace)
      .use('/admin', admin)
      .use('/admin/users', role)
      .get('/admin/users', (req, res) => {
        expectTypeOf(req.traceId).toEqualTypeOf<string>()
        expectTypeOf(req.admin).toEqualTypeOf<boolean>()
        expectTypeOf(req.role).toEqualTypeOf<string>()
        res.send('ok')
      })
      .get('/admin', (req, res) => {
        expectTypeOf(req.traceId).toEqualTypeOf<string>()
        expectTypeOf(req.admin).toEqualTypeOf<boolean>()
        // @ts-expect-error role only applies under /admin/users
        void req.role
        res.send('ok')
      })
      .get('/public', (req, res) => {
        expectTypeOf(req.traceId).toEqualTypeOf<string>()
        // @ts-expect-error admin only applies under /admin
        void req.admin
        res.send('ok')
      })
  })

  it('merges middleware registered on the same prefix', () => {
    const first = defineMiddleware<{ first: number }>((_req, _res, next) => next())
    const second = defineMiddleware<{ second: string }>((_req, _res, next) => next())

    createApp()
      .use('/shared', first)
      .use('/shared', second)
      .get('/shared/:id', (req, res) => {
        expectTypeOf(req.first).toEqualTypeOf<number>()
        expectTypeOf(req.second).toEqualTypeOf<string>()
        res.json(req.params.id)
      })
  })

  it('normalizes root and trailing slash prefixes', () => {
    const auth = defineMiddleware<{ user: { id: number } }>((_req, _res, next) => next())

    createApp()
      .use('/', auth)
      .get('/any', (req, res) => {
        expectTypeOf(req.user.id).toEqualTypeOf<number>()
        res.send('ok')
      })
      .use('/api/', auth)
      .get('/api/users', (req, res) => {
        expectTypeOf(req.user.id).toEqualTypeOf<number>()
        res.send('ok')
      })
  })

  it('inherits middleware context without registering it', () => {
    const requestId = defineMiddleware<{ requestId: string }>((_req, _res, next) => next())
    const admin = defineMiddleware<{ admin: boolean }>((_req, _res, next) => next())

    const router = createRouter()
      .inherit(requestId)
      .inherit('/admin', admin)
      .get('/me', (req, res) => {
        expectTypeOf(req.requestId).toEqualTypeOf<string>()
        res.send('ok')
      })
      .get('/admin/dashboard', (req, res) => {
        expectTypeOf(req.requestId).toEqualTypeOf<string>()
        expectTypeOf(req.admin).toEqualTypeOf<boolean>()
        res.send('ok')
      })
      .get('/public', (req, res) => {
        expectTypeOf(req.requestId).toEqualTypeOf<string>()
        // @ts-expect-error admin only applies under /admin
        void req.admin
        res.send('ok')
      })

    const app = createApp().use('/api', router)

    app.get('/api/me', (req, res) => {
      // @ts-expect-error inherited context stays inside the router
      void req.requestId
      res.send('ok')
    })
  })

  it('infers schemas while the caller supplies context', () => {
    defineMiddleware({ headers: z.object({ authorization: z.string() }) })<{
      user: { id: number }
    }>((req, _res, next) => {
      expectTypeOf(req.user.id).toEqualTypeOf<number>()
      expectTypeOf(req.headers.authorization).toEqualTypeOf<string>()
      next()
    })
  })

  it('infers middleware types without generics', () => {
    const auth = defineMiddleware({ headers: z.object({ authorization: z.string() }) })((
      req,
      _res,
      next,
    ) => {
      expectTypeOf(req.headers.authorization).toEqualTypeOf<string>()
      // @ts-expect-error no context is declared
      void req.user
      next()
    })

    expectTypeOf(auth).toMatchTypeOf<Middleware<{}>>()

    const plain = defineMiddleware((req, _res, next) => {
      // @ts-expect-error no context is declared
      void req.user
      next()
    })

    expectTypeOf(plain).toMatchTypeOf<Middleware<{}>>()

    const curried = defineMiddleware({ query: z.object({ page: z.coerce.number() }) })((
      req,
      _res,
      next,
    ) => {
      expectTypeOf(req.query.page).toEqualTypeOf<number>()
      // @ts-expect-error no context is declared
      void req.user
      next()
    })

    expectTypeOf(curried).toMatchTypeOf<Middleware<{}>>()
  })

  it('exposes middleware schema output to route handlers', () => {
    const parsed = defineMiddleware({
      query: z.object({ page: z.coerce.number() }),
      headers: z.object({ authorization: z.string() }),
      body: z.object({ name: z.string() }),
    })((_req, _res, next) => next())

    createApp()
      .use(parsed)
      .get('/users', (req, _res) => {
        expectTypeOf(req.query.page).toEqualTypeOf<number>()
        expectTypeOf(req.headers.authorization).toEqualTypeOf<string>()
        expectTypeOf(req.headers.host).toEqualTypeOf<string | undefined>()
        expectTypeOf(req.body.name).toEqualTypeOf<string>()
      })
  })

  it('keeps the base request headers when a route declares headers', () => {
    createApp().get(
      '/headers',
      { headers: z.object({ authorization: z.string() }) },
      (req, _res) => {
        expectTypeOf(req.headers.authorization).toEqualTypeOf<string>()
        expectTypeOf(req.headers.host).toEqualTypeOf<string | undefined>()
      },
    )
  })

  it('lets route schemas override middleware schemas', () => {
    const parsed = defineMiddleware({
      query: z.object({ page: z.coerce.number() }),
      headers: z.object({ authorization: z.string() }),
    })((_req, _res, next) => next())

    createApp()
      .use(parsed)
      .get('/users', { query: z.object({ page: z.string() }) }, (req, _res) => {
        expectTypeOf(req.query.page).toEqualTypeOf<string>()
        expectTypeOf(req.headers.authorization).toEqualTypeOf<string>()
      })
  })

  it('scopes middleware schema output by prefix', () => {
    const parsed = defineMiddleware({ query: z.object({ page: z.coerce.number() }) })(
      (_req, _res, next) => next(),
    )

    createApp()
      .use('/admin', parsed)
      .get('/admin/users', (req, _res) => {
        expectTypeOf(req.query.page).toEqualTypeOf<number>()
      })
      .get('/public', (req, _res) => {
        expectTypeOf(req.query.page).not.toEqualTypeOf<number>()
      })
  })

  it('merges schemas from multiple middleware', () => {
    const withPage = defineMiddleware({ query: z.object({ page: z.coerce.number() }) })(
      (_req, _res, next) => next(),
    )
    const withLimit = defineMiddleware({ query: z.object({ limit: z.coerce.number() }) })(
      (_req, _res, next) => next(),
    )

    createApp()
      .use(withPage)
      .use(withLimit)
      .get('/', (req, _res) => {
        expectTypeOf(req.query.page).toEqualTypeOf<number>()
        expectTypeOf(req.query.limit).toEqualTypeOf<number>()
      })
  })

  it('accepts schemas and handlers in either order', () => {
    defineMiddleware({ headers: z.object({ authorization: z.string() }) }, (req, _res, next) => {
      expectTypeOf(req.headers.authorization).toEqualTypeOf<string>()
      next()
    })

    defineMiddleware(
      (req, _res, next) => {
        expectTypeOf(req.headers.authorization).toEqualTypeOf<string>()
        next()
      },
      { headers: z.object({ authorization: z.string() }) },
    )
  })

  it('accepts schemas without a handler', () => {
    createApp()
      .use(defineMiddleware({ query: z.object({ page: z.coerce.number() }) }))
      .get('/users', (req, _res) => {
        expectTypeOf(req.query.page).toEqualTypeOf<number>()
      })
  })

  it('collects context before schemas', () => {
    const auth = defineMiddleware<{ user: { id: number } }>((req, _res, next) => {
      req.user = { id: 1 }
      next()
    })({ headers: z.object({ authorization: z.string() }) })

    createApp()
      .use(auth)
      .get('/', (req, _res) => {
        expectTypeOf(req.user.id).toEqualTypeOf<number>()
        expectTypeOf(req.headers.authorization).toEqualTypeOf<string>()
      })
  })

  it('types the request from declarative middleware schemas', () => {
    defineMiddleware({
      headers: z.object({ authorization: z.string() }),
      query: z.object({ page: z.coerce.number() }),
    })((req, _res, next) => {
      expectTypeOf(req.headers.authorization).toEqualTypeOf<string>()
      expectTypeOf(req.query.page).toEqualTypeOf<number>()
      next()
    })
  })
})
