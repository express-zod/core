import type { NextFunction, Request, Response } from 'express'
import request from 'supertest'
import { z } from 'zod'

import { createApp, createRouter, ValidationError } from '../src/index.ts'

function sendValidationErrors(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!(error instanceof ValidationError)) {
    next(error)
    return
  }

  res.status(error.status).json({ location: error.location, issues: error.issues })
}

describe('native error handling', () => {
  it('forwards validation failures to the error middleware', async () => {
    const app = createApp()
      .get('/users/:id', { params: z.object({ id: z.number() }) }, (_req, res) => {
        res.send('ok')
      })
      .use(sendValidationErrors)

    const res = await request(app).get('/users/abc')

    expect(res.status).toBe(400)
    expect(res.body.location).toBe('params')
    expect(res.body.issues).toEqual([expect.objectContaining({ path: ['id'] })])
  })

  it('scopes handlers by path', async () => {
    const app = createApp()
      .get('/api/users/:id', { params: z.object({ id: z.number() }) }, (_req, res) => {
        res.send('ok')
      })
      .get('/users/:id', { params: z.object({ id: z.number() }) }, (_req, res) => {
        res.send('ok')
      })
      .onError('/api', sendValidationErrors)

    const scoped = await request(app).get('/api/users/abc')
    const unscoped = await request(app).get('/users/abc')

    expect(scoped.status).toBe(400)
    expect(scoped.body.location).toBe('params')
    expect(unscoped.status).toBe(400)
    expect(unscoped.body.location).toBeUndefined()
  })

  it('exposes the zod error on the validation error', async () => {
    const app = createApp()
      .post('/users', { body: z.object({ name: z.string() }) }, (_req, res) => {
        res.send('ok')
      })
      .onError((error: unknown, _req: Request, res: Response, next: NextFunction) => {
        if (!(error instanceof ValidationError)) {
          next(error)
          return
        }

        res.status(error.statusCode).json({
          name: error.name,
          location: error.location,
          issues: error.zodError.issues.length,
          cause: error.cause instanceof Error,
        })
      })

    const res = await request(app).post('/users').send({})

    expect(res.body).toEqual({
      name: 'ValidationError',
      location: 'body',
      issues: 1,
      cause: true,
    })
  })

  it('forwards failures from mounted routers', async () => {
    const router = createRouter().get(
      '/users',
      { query: z.object({ page: z.coerce.number() }) },
      (_req, res) => {
        res.send('ok')
      },
    )

    const app = createApp().use('/api', router).onError(sendValidationErrors)

    const res = await request(app).get('/api/users?page=abc')

    expect(res.status).toBe(400)
    expect(res.body.location).toBe('query')
  })

  it('registers handlers without the next parameter', async () => {
    const app = createApp()
      .get('/boom', () => {
        throw new Error('boom')
      })
      .onError((_error, _req, res) => {
        res.status(500).json({ handled: true })
      })

    const res = await request(app).get('/boom')

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ handled: true })
  })

  it('leaves other errors untouched', async () => {
    const app = createApp()
      .get('/boom', () => {
        throw new Error('boom')
      })
      .onError(sendValidationErrors)

    const res = await request(app).get('/boom')

    expect(res.status).toBe(500)
  })
})
