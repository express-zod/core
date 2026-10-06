import type { Express } from "express";

import request from "supertest";
import { z } from "zod";

import { Router } from "express-zod";

type App = InstanceType<typeof Router>;

/**
 * The router only builds and mounts its Express app inside `listen`, so boot it
 * on a throwaway port, close that server, and hand the mounted app to
 * supertest, which runs (and closes) its own server per request.
 */
function mount(router: App): Promise<Express> {
    return new Promise((resolve, reject) => {
        const server = router.listen(0, () => {
            server.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(router["~express"] as Express);
            });
        });
    });
}

describe("Router", () => {
    it("exposes a method per http verb", () => {
        const router = new Router();

        for (const verb of [
            "get",
            "post",
            "put",
            "patch",
            "delete",
            "head",
            "options",
            "all",
        ] as const) {
            expect(router[verb]).toBeTypeOf("function");
        }
    });

    it("returns the same router, so routes can be chained", () => {
        const router = new Router();

        expect(router.get("/ping", (_req, res) => res.end("pong"))).toBe(router);
    });

    it("mounts the router under its prefix", async () => {
        const router = new Router({ prefix: "/api" });
        router.get("/ping", (_req, res) => res.end("pong"));

        const app = await mount(router);

        const mounted = await request(app).get("/api/ping").expect(200);
        expect(mounted.text).toBe("pong");
        await request(app).get("/ping").expect(404);
    });

    it("joins the prefixes of a nested router", async () => {
        const api = new Router();
        const users = new Router({ prefix: "/users" });
        users.get("/:id", (_req, res) => res.end("user"));

        api.use("/api", users);

        const app = await mount(api);

        const response = await request(app).get("/api/users/7").expect(200);
        expect(response.text).toBe("user");
    });

    it("validates the request and hands the handler the parsed value", async () => {
        const router = new Router();
        router.get(
            "/search",
            {
                query: z.object({ page: z.coerce.number().int().min(1) }),
                responses: { 200: z.object({ page: z.number() }) },
            },
            (req, res) => {
                res.json({ page: req.query.page });
            },
        );

        const app = await mount(router);
        const response = await request(app).get("/search?page=2").expect(200);

        expect(response.body).toEqual({ page: 2 });
    });

    it("validates route params", async () => {
        const router = new Router();
        router.get(
            "/users/:id",
            {
                params: z.object({ id: z.coerce.number() }),
                responses: { 200: z.object({ id: z.number() }) },
            },
            (req, res) => {
                res.json({ id: req.params.id });
            },
        );

        const app = await mount(router);
        const response = await request(app).get("/users/42").expect(200);

        expect(response.body).toEqual({ id: 42 });
    });

    it("hands validation failures to the error handler", async () => {
        const router = new Router();
        router.get("/search", { query: z.object({ page: z.coerce.number() }) }, (_req, res) => {
            res.end("ok");
        });

        // Express only recognises error middleware by arity, so all four
        // parameters have to be declared even though `next` is unused.
        router.onError(
            { responses: { 400: z.object({ error: z.string() }) } },
            (_err, _req, res, _next) => {
                res.status(400).json({ error: "invalid query" });
            },
        );

        const app = await mount(router);
        const response = await request(app).get("/search?page=nope").expect(400);

        expect(response.body).toEqual({ error: "invalid query" });
    });

    it("leaves the request untouched when the schema is marked skip", async () => {
        const router = new Router();
        router.get(
            "/search",
            {
                query: z.object({ page: z.coerce.number() }).meta({ skip: true }),
                responses: { 200: z.object({ kind: z.string() }) },
            },
            (req, res) => {
                res.json({ kind: typeof req.query.page });
            },
        );

        const app = await mount(router);
        const response = await request(app).get("/search?page=2").expect(200);

        expect(response.body).toEqual({ kind: "string" });
    });
});
