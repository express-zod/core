import { z } from "zod";

import { Router } from "express-zod";
import type { HttpMethod, Request, RouterOptions } from "express-zod";

describe("public types", () => {
    it("narrows HttpMethod to the supported verbs", () => {
        expectTypeOf<HttpMethod>().toEqualTypeOf<
            "get" | "post" | "put" | "patch" | "delete" | "head" | "options" | "all" | "query"
        >();
    });

    it("makes the router options optional and adds a prefix", () => {
        expectTypeOf<RouterOptions["prefix"]>().toEqualTypeOf<string | undefined>();

        const router = new Router({ prefix: "/api", caseSensitive: true });
        expectTypeOf(router).toHaveProperty("get");
        expectTypeOf(router).toHaveProperty("onError");
        expectTypeOf(router).toHaveProperty("listen");
    });

    it("types a request against its inferred options", () => {
        expectTypeOf<Request<{ params: { id: number } }>["params"]>().toEqualTypeOf<{
            id: number;
        }>();
    });

    it("infers handler inputs and response bodies from the route schemas", () => {
        const router = new Router();

        router.get(
            "/users/:id",
            {
                params: z.object({ id: z.coerce.number() }),
                query: z.object({ page: z.coerce.number().default(1) }),
                responses: {
                    200: z.object({ id: z.number() }),
                    404: z.object({ message: z.string() }),
                },
            },
            (req, res) => {
                expectTypeOf(req.params).toEqualTypeOf<{ id: number }>();
                expectTypeOf(req.query).toEqualTypeOf<{ page: number }>();

                res.json({ id: req.params.id });
                res.status(404).json({ message: "missing" });
            },
        );
    });

    it("rejects a response body that does not match the declared schema", () => {
        const router = new Router();
        const responses = { 200: z.object({ pong: z.boolean() }) };

        router.get("/ping", { responses }, (_req, res) => {
            expectTypeOf(res.json).parameter(0).toEqualTypeOf<{ pong: boolean }>();

            // @ts-expect-error - `pong` is declared as a boolean
            res.json({ pong: "yes" });
        });
    });

    it("accepts a Zod object for headers and rejects anything else", () => {
        const router = new Router();

        router.get("/ping", { headers: z.object({ "x-token": z.string() }) }, (_req, res) => {
            expectTypeOf(res).toHaveProperty("end");
            res.end("ok");
        });

        // @ts-expect-error - `headers` is declared as a Zod object
        router.get("/ping", { headers: z.number() }, (_req, res) => res.end("ok"));
    });
});
