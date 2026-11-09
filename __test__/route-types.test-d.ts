import { z } from 'zod'

import { createApp, createRouter, type RoutesOf } from '../src/index.ts'

describe('route type collection', () => {
  it('collects chained routes with their param and body types', () => {
    const app = createApp()
      .get('/users/:id', { params: z.object({ id: z.coerce.number() }) }, (req, res) => {
        expectTypeOf(req.params.id).toEqualTypeOf<number>()
        res.json(req.params.id)
      })
      .post('/users', { body: z.object({ name: z.string() }) }, (req, res) => {
        expectTypeOf(req.body.name).toEqualTypeOf<string>()
        res.json(req.body.name)
      })

    type Routes = RoutesOf<typeof app>

    expectTypeOf<keyof Routes>().toEqualTypeOf<'get /users/:id' | 'post /users'>()
    expectTypeOf<Routes['get /users/:id']['params']>().toEqualTypeOf<{ id: number }>()
    expectTypeOf<Routes['post /users']['body']>().toEqualTypeOf<{ name: string }>()
  })

  it('merges declared params with params derived from the path', () => {
    const app = createApp().get(
      '/users/:id/posts/:postId',
      { params: z.object({ id: z.coerce.number() }) },
      (req, res) => {
        expectTypeOf(req.params).toEqualTypeOf<{ id: number; postId: string }>()
        res.json(req.params)
      },
    )

    type Routes = RoutesOf<typeof app>
    expectTypeOf<Routes['get /users/:id/posts/:postId']['params']>().toEqualTypeOf<{
      id: number
      postId: string
    }>()
  })

  it('infers params from the path when no schema is given', () => {
    const app = createApp().get('/files/*path', (req, res) => {
      expectTypeOf(req.params.path).toEqualTypeOf<string[]>()
      res.json(req.params.path)
    })

    type Routes = RoutesOf<typeof app>
    expectTypeOf<Routes['get /files/*path']['params']>().toEqualTypeOf<{ path: string[] }>()
  })

  it('prefixes routes mounted with use', () => {
    const users = createRouter()
      .get('/:id', { params: z.object({ id: z.coerce.number() }) }, (req, res) => {
        res.json(req.params.id)
      })
      .post('/', { body: z.object({ name: z.string() }) }, (req, res) => {
        res.json(req.body.name)
      })

    const app = createApp().use('/users', users)
    type Routes = RoutesOf<typeof app>

    expectTypeOf<keyof Routes>().toEqualTypeOf<'get /users/:id' | 'post /users'>()
    expectTypeOf<Routes['get /users/:id']['params']>().toEqualTypeOf<{ id: number }>()
  })

  it('composes nested use prefixes', () => {
    const posts = createRouter().get('/:postId', (req, res) => {
      res.json(req.params.postId)
    })

    const app = createApp().use('/api', createRouter().use('/:userId/posts', posts))
    type Routes = RoutesOf<typeof app>

    expectTypeOf<keyof Routes>().toEqualTypeOf<'get /api/:userId/posts/:postId'>()
  })

  it('keeps collected routes when use only registers middleware', () => {
    const app = createApp()
      .get('/ping', (_req, res) => {
        res.send('pong')
      })
      .use((_req, _res, next) => next())
      .use('/extra', (_req, _res, next) => next())

    type Routes = RoutesOf<typeof app>

    expectTypeOf<keyof Routes>().toEqualTypeOf<'get /ping'>()
  })

  it('rejects unknown route keys', () => {
    const app = createApp().get('/ping', (_req, res) => {
      res.send('pong')
    })

    type Routes = RoutesOf<typeof app>

    // @ts-expect-error route was never registered
    type Missing = Routes['get /missing']
    expectTypeOf<Missing>().toBeAny()
  })

  it('covers the full HttpMethod set', () => {
    const app = createApp()
      .query('/query', { query: z.object({ n: z.coerce.number() }) }, (req, res) => {
        expectTypeOf(req.query.n).toEqualTypeOf<number>()
        res.json(req.query.n)
      })
      .trace('/trace', (_req, res) => {
        res.send('ok')
      })
      .connect('/connect', (_req, res) => {
        res.send('ok')
      })

    type Routes = RoutesOf<typeof app>
    expectTypeOf<keyof Routes>().toEqualTypeOf<
      'query /query' | 'trace /trace' | 'connect /connect'
    >()
  })
})
