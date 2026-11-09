import request from 'supertest'
import { z } from 'zod'

import { createApp } from '../src/index.ts'

describe('request schemas', () => {
  it('writes the parsed query back to the request', async () => {
    const app = createApp().get(
      '/search',
      { query: z.object({ page: z.coerce.number() }) },
      (req, res) => {
        res.json(req.query)
      },
    )

    const res = await request(app).get('/search?page=2&extra=1')

    expect(res.body).toEqual({ page: 2 })
  })

  it('writes the parsed headers back to the request', async () => {
    const app = createApp().get(
      '/headers',
      { headers: z.object({ authorization: z.string() }) },
      (req, res) => {
        res.json(req.headers)
      },
    )

    const res = await request(app).get('/headers').set('authorization', 'Bearer token')

    expect(res.body).toEqual({ authorization: 'Bearer token' })
  })
})
