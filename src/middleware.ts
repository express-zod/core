import type { Router } from "express";
import type {
    LazyMiddleware,
    LazyMiddlewareHandler,
    LazyMiddlewareOptions,
    MiddlewareConstructor,
    Middleware as MiddlewareType,
} from "./types/middleware.ts";
import type { AnyHandler, RequestOptions } from "./types/router.ts";
import type { ZodType } from "zod";
import type e from "express";

export const Middleware = /* @__PURE__ */ (() => {
    // oxlint-disable-next-line no-shadow
    class Middleware<T extends Router = any> implements MiddlewareType<T> {
        "~lazyMap": Map<string, LazyMiddleware>;
        "~host": T;

        constructor(host: T) {
            this["~host"] = host;
            this["~lazyMap"] = new Map();
            Object.defineProperty(this, "~host", {
                configurable: false,
                enumerable: false,
                writable: true,
            });
        }

        "~mount"(...args: unknown[]) {
            let { options, handlers } = splitArgs(args);
            const validation = toValidation(options ?? {});
            handlers = [validation as any, ...handlers].filter(Boolean);
            if (handlers.length > 0) {
                this["~host"].use(...handlers);
            }
        }

        "~lazify"(options: LazyMiddlewareOptions, ...handlers: LazyMiddlewareHandler[]) {
            if (!options.lazy) {
                return;
            }
            for (const key in options.lazy) {
                if (this["~lazyMap"].has(key)) {
                    continue;
                }
                this["~lazyMap"].set(key, {
                    tri: options.lazy[key] as RequestOptions,
                    handlers: handlers as unknown as AnyHandler[],
                });
            }
        }

        use(...args: unknown[]) {
            let { options, handlers } = splitArgs(args);
            if (options && "lazy" in options) {
                this["~lazify"](
                    options as LazyMiddlewareOptions,
                    ...(handlers as LazyMiddlewareHandler[]),
                );
                return;
            }
            this["~mount"](...args);
        }

        parse(options: RequestOptions) {
            const lazyHandlers: any[] = [];
            const lazyKeys = new Set(
                Object.keys(options).filter(
                    (key) => !REQUEST_KEYS.includes(key as any) && key !== "responses",
                ),
            );

            for (const key of new Set(lazyKeys)) {
                const target = this["~lazyMap"].get(key);
                if (!target) {
                    continue;
                }

                const value = options[key as keyof typeof options];
                const { tri, handlers } = target;

                const opts = typeof tri === "function" ? tri(value) : tri;
                lazyHandlers.push(toValidation(opts));

                lazyHandlers.push(
                    ...handlers?.flatMap<LazyMiddlewareHandler>((handler) => {
                        return (req, res, next) => {
                            ((req._trigger as Record<string, any>) ??= {})[key] = value;
                            if (res.headersSent || res.writableEnded) {
                                return;
                            }
                            return handler(req, res, next);
                        };
                    }),
                );
            }

            return lazyHandlers.filter(Boolean);
        }
    }

    return Middleware;
})() as unknown as MiddlewareConstructor;

export const REQUEST_KEYS = ["params", "query", "body", "headers", "cookies"] as const;

export type RequestKey = (typeof REQUEST_KEYS)[number];

export function toValidation(
    options: Partial<Record<RequestKey, ZodType>>,
): e.RequestHandler | null {
    const schemas = REQUEST_KEYS.map((key) => [key, options?.[key]] as const)
        .filter((entry): entry is [RequestKey, ZodType] => entry[1] !== undefined)
        .filter(([, schema]) => !schema.meta?.()?.skip);

    if (schemas.length === 0) {
        return null;
    }

    return function validation(req, _res, next) {
        for (const [key, schema] of schemas) {
            const parsed = schema.safeParse(req[key]);
            if (!parsed.success) {
                next(parsed.error);
                return;
            }

            Object.defineProperty(req, key, {
                value: parsed.data,
                writable: true,
                configurable: true,
                enumerable: true,
            });
        }
        next();
    };
}

export function splitArgs(args: unknown[]): {
    options?: RequestOptions;
    handlers: e.RequestHandler[];
} {
    let options = args[0] as RequestOptions | undefined;
    let handlers = args as e.RequestHandler[];
    if (typeof options === "function") {
        options = undefined;
    } else {
        handlers = handlers.slice(1);
    }
    return {
        options,
        handlers,
    };
}
