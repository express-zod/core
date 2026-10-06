# express-zod

Type-safe, schema-validated routing for Express and Zod.

Routes declare their request and response schemas as Zod schemas, and the handler
signature is inferred from them: `req.query` carries the parsed output type, and
`res.json` only accepts a body matching the status code it was given.

## Install

```sh
pnpm add express-zod express zod
```

`express` 5 and `zod` 4 are peer dependencies.

## Quick start

```ts
import { z } from "zod";

import { Router } from "express-zod";

const router = new Router({ prefix: "/api" });

router.get(
    "/users/:id",
    {
        params: z.object({ id: z.coerce.number() }),
        responses: {
            200: z.object({ id: z.number(), name: z.string() }),
            404: z.object({ message: z.string() }),
        },
    },
    (req, res) => {
        // `req.params.id` is a number — the schema coerced it.
        if (req.params.id === 0) {
            res.status(404).json({ message: "no such user" });
            return;
        }
        res.json({ id: req.params.id, name: "Ada" });
    },
);

router.listen(3000);
```

`router.listen` builds the Express app, mounts the router under its prefix, and
starts the server. The route methods return the router, so they chain.

## Validating the request

The options object takes one Zod schema per part of the request:

| Key       | Validates     |
| --------- | ------------- |
| `params`  | `req.params`  |
| `query`   | `req.query`   |
| `body`    | `req.body`    |
| `headers` | `req.headers` |
| `cookies` | `req.cookies` |

When a schema is given, the value is validated before the handler runs and the
parsed result **replaces** the raw one, so coercions and transforms are visible
inside the handler:

```ts
router.get("/search", { query: z.object({ page: z.coerce.number() }) }, (req, res) => {
    // GET /search?page=2 → req.query.page is the number 2, not "2".
    res.end(String(req.query.page));
});
```

A failed parse is passed to `next()`, so it reaches the error handler covered
below. Marking a schema `.meta({ skip: true })` opts that part of the request out
of validation.

## Responses

`responses` maps status codes to the body sent with them. It types `res.json` and
`res.send` per status, so a body that does not match the code is a compile error:

```ts
router.get(
    "/users/:id",
    {
        params: z.object({ id: z.coerce.number() }),
        responses: {
            200: z.object({ id: z.number() }),
            404: z.object({ message: z.string() }),
        },
    },
    (req, res) => {
        res.status(404).json({ message: "gone" });
        // res.status(404).json({ id: 1 });  →  type error: `id` is not a `message`
        res.json({ id: req.params.id });
    },
);
```

`res.status(...)` and `res.sendStatus(...)` narrow the code, and the next `json` or
`send` is checked against it.

## Prefixes and nesting

A router can carry a prefix of its own, and can be mounted inside another router:

```ts
const api = new Router();
const users = new Router({ prefix: "/users" });

users.get("/:id", { params: z.object({ id: z.coerce.number() }) }, (_req, res) => {
    res.end("user");
});

api.use("/api", users); // the route now lives at /api/users/:id

api.listen(3000);
```

`use(router)` mounts a router at its own prefix; `use(prefix, router)` joins the
two.

## Error handling

`router.onError` registers an Express error handler, which is where failed
validation lands. Because Express identifies error middleware by arity, the
handler must declare all four parameters:

```ts
router.onError(
    { responses: { 500: z.object({ message: z.string() }) } },
    (err, _req, res, _next) => {
        res.status(500).json({ message: "something went wrong" });
    },
);
```

The options argument is optional, but it is what types the response. Without it
the handler's response map is empty, and `res.status(...)` accepts no status code
at all — so pass one whenever the handler writes a body.
