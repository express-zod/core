import type e from "express";
import type {
    AnyHandler,
    RequestOptions,
    Response,
    RequestOptionsInferred,
    Request,
} from "./router.ts";

export declare class Middleware<T> {
    "~lazyMap": Map<string, LazyMiddleware>;
    "~host": T;

    "~mount": {
        (...handlers: AnyHandler[]): void;
        (options: RequestOptions, ...handlers: AnyHandler[]): void;
    };
    "~lazify": (options: LazyMiddlewareOptions, ...handlers: LazyMiddlewareHandler[]) => void;
    use: {
        (...handlers: AnyHandler[]): void;
        (options: RequestOptions, ...handlers: AnyHandler[]): void;
    };
    parse: (options: RequestOptions) => (e.RequestHandler | LazyMiddlewareHandler)[];
}

export interface LazyMiddleware {
    tri: LazyMiddlewareTrigger;
    handlers: LazyMiddlewareHandler[];
}

export interface MiddlewareConstructor {
    new <T>(host: T): Middleware<T>;
}

export type LazyMiddlewareOptions = {
    lazy?: {
        [Trigger: string]: LazyMiddlewareTrigger;
    };
};

export type LazyMiddlewareTrigger = RequestOptions | ((...args: any[]) => RequestOptions);

export interface RequestWithTrigger<T extends RequestOptionsInferred, U = {}> extends Request<T> {
    /** Lazy middleware trigger */
    _trigger?: U;
}

export type LazyMiddlewareHandler<T extends RequestOptionsInferred = {}, Trigger = {}> = (
    req: RequestWithTrigger<T, Trigger>,
    res: Response<T["responses"] & {}, T["locals"] & {}>,
    next: e.NextFunction,
) => unknown;
