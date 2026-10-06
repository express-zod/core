import express from "express";
import type { AnyHandler, RouteMap, RouterOptions } from "./types/router.ts";
import {
    HTTP_METHODS,
    type HttpMethod,
    type RequestOptions,
    type RouterInternal as RouterInternalType,
    type RouteRegistrar,
    type Router as RouterType,
} from "./types/router.ts";
import type { Middleware as MiddlewareType } from "./types/middleware.ts";
import { Middleware, splitArgs, toValidation } from "./middleware.ts";

export class RouterInternal implements RouterInternalType {
    "~options": RouterOptions;
    "~express"?: express.Express | undefined;
    "~router": express.Router;
    "~mounted": boolean;
    "~middleware": MiddlewareType<express.Router>;

    constructor(options?: RouterOptions) {
        this["~options"] = options ?? {};
        this["~router"] = express.Router(options);
        this["~mounted"] = false;
        this["~middleware"] = new Middleware(this["~router"]);

        Object.defineProperty(this["~router"], "mounted", {
            value: false,
            configurable: true,
            enumerable: false,
            writable: true,
        });
        Object.defineProperty(this, "~express", {
            value: undefined,
            configurable: true,
            enumerable: false,
            writable: true,
        });
    }

    "~addRoute"<M extends HttpMethod>(method: M) {
        return ((path: string, ...args: any[]) => {
            let { handlers, options } = splitArgs(args);
            const validation = toValidation(options ?? {});
            handlers = [validation as any, ...handlers].filter(Boolean);

            if (options) {
                const lazyHandlers = this["~middleware"].parse(options);
                if (lazyHandlers.length > 0) {
                    handlers.unshift(...(lazyHandlers as express.RequestHandler[]));
                }
            }

            this["~router"][method]?.(path, ...handlers);
            return this;
        }) as unknown as RouteRegistrar<this, M>;
    }

    get prefix() {
        return this["~options"].prefix ?? "";
    }
}

export function joinPath(...paths: string[]) {
    const path = paths
        .filter(Boolean)
        .map((p) => p.replace(/^\/+|\/+$/g, ""))
        .join("/");
    return `/${path}`.replace(/\/+/g, "/");
}

export const Router = /* @__PURE__ */ (() => {
    // oxlint-disable-next-line no-shadow
    class Router extends RouterInternal {
        on(method: HttpMethod, path: string, ...args: any[]) {
            return this["~addRoute"](method)(path, ...args);
        }

        use(...args: any[]) {
            const first = args[0];

            // router
            if (typeof first === "string" || first instanceof Router) {
                const second = args[1];
                if (first instanceof Router) {
                    this["~router"].use(first.prefix, first["~router"]);
                } else if (second instanceof Router) {
                    this["~router"].use(joinPath(first, second.prefix), second["~router"]);
                }
                return this;
            }

            // middleware
            this["~middleware"].use(...args);
            return this;
        }

        listen(...args: any[]) {
            if (!this["~express"]) {
                this["~express"] = express();
            }
            if (!this["~mounted"]) {
                this["~express"].use(this.prefix, this["~router"]);
                this["~mounted"] = true;
            }
            return this["~express"].listen(...args);
        }

        onError(options: RequestOptions | AnyHandler, ...handlers: AnyHandler[]) {
            this["~middleware"].use(options as any, ...handlers);
            return this;
        }
    }

    for (const method of HTTP_METHODS) {
        (Router as any).prototype[method] = function (this: Router, path: string, ...args: any[]) {
            return this.on(method, path, ...args);
        };
    }

    return Router;
})() as unknown as {
    new <P extends string = "", R extends RouteMap = {}>(
        options?: express.RouterOptions & { prefix?: P },
    ): RouterType<P, R>;
};
