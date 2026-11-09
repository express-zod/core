import request from 'supertest'
import { z } from 'zod'

import { createApp } from '../src/index.ts'

const partialParams = z.object({ id: z.coerce.number() })

describe('strict params trimming', () => {
  it('accepts undeclared path params and merges them back', async () => {
    const app = createApp()
    app.get('/users/:id/posts/:postId', { params: partialParams.strict() }, (req, res) => {
      res.json(req.params)
    })

    const res = await request(app).get('/users/2/posts/abc')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ id: 2, postId: 'abc' })
  })

  it('trims for z.strictObject as well', async () => {
    const app = createApp()
    app.get(
      '/users/:id/posts/:postId',
      { params: z.strictObject({ id: z.coerce.number() }) },
      (req, res) => {
        res.json(req.params)
      },
    )

    const res = await request(app).get('/users/2/posts/abc')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ id: 2, postId: 'abc' })
  })

  it('trims when the strict object is wrapped in a transform', async () => {
    const app = createApp()
    app.get(
      '/users/:id/posts/:postId',
      { params: partialParams.strict().transform((value) => value) },
      (req, res) => {
        res.json(req.params)
      },
    )

    const res = await request(app).get('/users/2/posts/abc')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ id: 2, postId: 'abc' })
  })

  it('still reports fields declared by the strict schema but missing from the path', async () => {
    const app = createApp()
    app.get(
      '/users/:id',
      { params: z.strictObject({ id: z.coerce.number(), ticket: z.string() }) },
      (req, res) => {
        res.json(req.params)
      },
    )

    const res = await request(app).get('/users/2')

    expect(res.status).toBe(400)
    expect(res.body.errors).toEqual([
      expect.objectContaining({ code: 'invalid_type', path: ['ticket'] }),
    ])
  })

  it('leaves strip params schemas untouched', async () => {
    const app = createApp()
    app.get('/users/:id/posts/:postId', { params: partialParams }, (req, res) => {
      res.json(req.params)
    })

    const res = await request(app).get('/users/2/posts/abc')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ id: 2, postId: 'abc' })
  })

  it('leaves loose params schemas untouched', async () => {
    const app = createApp()
    app.get(
      '/users/:id/posts/:postId',
      { params: z.looseObject({ id: z.coerce.number() }) },
      (req, res) => {
        res.json(req.params)
      },
    )

    const res = await request(app).get('/users/2/posts/abc')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ id: 2, postId: 'abc' })
  })
})
