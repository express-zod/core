import express from 'express'
import request from 'supertest'
import { z } from 'zod'

import { createApp } from '../src/index.ts'

describe('response schema', () => {
  const app = createApp()
  app.use(express.json())

  app.post(
    '/users',
    {
      body: z.object({ name: z.string() }),
      response: z.object({ id: z.number(), name: z.string() }),
    },
    (req, res) => {
      res.status(201).json({ id: 1, name: req.body.name })
    },
  )

  it('registers the route and validates the request', async () => {
    const res = await request(app).post('/users').send({ name: 'a' })

    expect(res.status).toBe(201)
    expect(res.body).toEqual({ id: 1, name: 'a' })
  })

  app.post(
    '/orders',
    {
      response: {
        200: z.object({ ok: z.boolean() }),
        409: z.object({ message: z.string() }),
      },
    },
    (_req, res) => {
      res.status(409).json({ message: 'duplicate' })
    },
  )

  app.delete('/users/:id', { response: { 204: z.void() } }, (_req, res) => {
    res.status(204).end()
  })

  it('sends a bodyless 204 response', async () => {
    const res = await request(app).delete('/users/1')

    expect(res.status).toBe(204)
    expect(res.text).toBe('')
  })

  it('registers routes whose response is a status-keyed map', async () => {
    const res = await request(app).post('/orders')

    expect(res.status).toBe(409)
    expect(res.body).toEqual({ message: 'duplicate' })
  })

  it('still rejects invalid request bodies', async () => {
    const res = await request(app).post('/users').send({ name: 1 })

    expect(res.status).toBe(400)
  })
})
