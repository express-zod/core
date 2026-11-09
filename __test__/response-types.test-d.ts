import { z } from 'zod'

import { createApp, type RoutesOf } from '../src/index.ts'

describe('response schema', () => {
  it('types res.json from the response schema', () => {
    const app = createApp().get(
      '/users/:id',
      {
        params: z.object({ id: z.coerce.number() }),
        response: z.object({ id: z.number(), name: z.string() }),
      },
      (req, res) => {
        expectTypeOf<Parameters<typeof res.json>[0]>().toEqualTypeOf<
          { id: number; name: string } | undefined
        >()

        res.status(200).json({ id: req.params.id, name: 'a' })

        // @ts-expect-error response body does not match the schema
        res.json({ id: '1', name: 'a' })
      },
    )

    type Routes = RoutesOf<typeof app>
    expectTypeOf<Routes['get /users/:id']['response']>().toEqualTypeOf<{
      200: { id: number; name: string }
    }>()
  })

  it('falls back to any without a response schema', () => {
    const app = createApp().get('/ping', (_req, res) => {
      expectTypeOf<Parameters<typeof res.json>[0]>().toBeAny()
      res.json('anything')
    })

    type Routes = RoutesOf<typeof app>
    expectTypeOf<Routes['get /ping']['response']>().toEqualTypeOf<{}>()
  })

  it('types each status code separately', () => {
    const app = createApp().post(
      '/users',
      {
        response: {
          200: z.object({ id: z.number() }),
          409: z.object({ message: z.string() }),
        },
      },
      (_req, res) => {
        res.status(200).json({ id: 1 })
        res.status(409).json({ message: 'dup' })

        // @ts-expect-error body belongs to the 200 response
        res.status(409).json({ id: 1 })

        // chaining other response methods keeps the narrowed status
        res.status(200).set('x-trace', 'abc').json({ id: 2 })
        // @ts-expect-error body belongs to the 409 response
        res.status(200).set('x-trace', 'abc').json({ message: 'dup' })

        // without status() the default body is the 200 one
        res.json({ id: 3 })
        // @ts-expect-error body belongs to the 409 response
        res.json({ message: 'dup' })
      },
    )

    type Routes = RoutesOf<typeof app>
    expectTypeOf<Routes['post /users']['response']>().toEqualTypeOf<{
      200: { id: number }
      409: { message: string }
    }>()
  })

  it('treats no-body statuses as bodyless', () => {
    const app = createApp().delete(
      '/users/:id',
      { response: { 200: z.object({ id: z.number() }), 204: z.void() } },
      (_req, res) => {
        res.status(204).end()
        res.status(204).json()

        // @ts-expect-error 204 responses carry no body
        res.status(204).json({ id: 1 })

        res.status(200).json({ id: 1 })
      },
    )

    type Routes = RoutesOf<typeof app>
    expectTypeOf<Routes['delete /users/:id']['response']>().toEqualTypeOf<{
      200: { id: number }
      204: undefined
    }>()
  })

  it('allows 204 even when it is not declared', () => {
    createApp().get('/ping', { response: { 200: z.object({ ok: z.boolean() }) } }, (_req, res) => {
      res.status(204).end()

      // @ts-expect-error 204 responses carry no body
      res.status(204).json({ ok: true })
    })
  })
})
