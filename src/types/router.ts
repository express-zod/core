import type { output, ZodObject, ZodType } from "zod";
import type { Exact, JoinString, JoinStringArray, MergeUnion, NormalizePath } from "./utility.ts";
import type e from "express";
import type { If, IsAny, IsUnion, IsUnknown, OmitIndexSignature, Or, Simplify } from "type-fest";
import type { Middleware, LazyMiddlewareOptions, LazyMiddlewareHandler } from "./middleware.ts";

declare global {
    namespace ExpressZod {
        interface RequestOptions {}
        interface RouteMap {}
    }
}

export declare class RouterInternal {
    "~options": e.RouterOptions;
    "~express"?: e.Express;
    "~router": e.Router;
    "~mounted": boolean;
    "~middleware": Middleware<e.Router>;

    "~addRoute": <M extends HttpMethod>(method: M) => RouteRegistrar<this, M>;
}

export declare class Router<
    _P extends string = "",
    _R extends RouteMap = {},
    _L = {},
> extends RouterInternal {
    use: Use<this>;
    listen: e.Express["listen"];
    onError: OnError<this>;

    get: RouteRegistrar<this, "get">;
    post: RouteRegistrar<this, "post">;
    put: RouteRegistrar<this, "put">;
    patch: RouteRegistrar<this, "patch">;
    delete: RouteRegistrar<this, "delete">;
    head: RouteRegistrar<this, "head">;
    options: RouteRegistrar<this, "options">;
    all: RouteRegistrar<this, "all">;
    query?: RouteRegistrar<this, "query">;
}

export interface RouterOptions extends e.RouterOptions {
    prefix?: string;
}

export const HTTP_METHODS = [
    "get",
    "post",
    "put",
    "patch",
    "delete",
    "head",
    "options",
    "all",
    "query",
] as const;

export type HttpMethod = (typeof HTTP_METHODS)[number];

export interface RouteRegistrar<T, Method extends HttpMethod> {
    <P extends string, O extends RequestOptions = {}>(
        path: P,
        options: Exact<O, RequestOptions>,
        ...handlers: RequestHandler<InferRequestOptions<O>>[]
    ): Router<
        PrefixOf<T>,
        MergeRoutes<
            {
                [K in NormalizePath<JoinString<PrefixOf<T>, P>>]: {
                    [M in Method]: InferRequestOptions<O>;
                };
            },
            RoutesOf<T>
        >
    >;
    <P extends string>(
        path: P,
        ...handlers: RequestHandler<{}>[]
    ): Router<
        PrefixOf<T>,
        MergeRoutes<
            {
                [K in NormalizePath<JoinString<PrefixOf<T>, P>>]: {
                    [M in Method]: {};
                };
            },
            RoutesOf<T>
        >
    >;
}

export type PrefixOf<T> = T extends Router<infer P> ? P : "";

export type RoutesOf<T> =
    T extends Router<infer _, infer Routes> ? If<IsAny<Routes>, {}, Routes> : {};

export interface RouteMap {
    [P: string]: {
        [M in HttpMethod]?: RequestOptions;
    };
}

type _RouteAt<T extends RouteMap, P extends PropertyKey> = P extends keyof T ? T[P] : {};

export type MergeRoutes<T extends RouteMap, S extends RouteMap> = Simplify<{
    [P in keyof S | keyof T]: {
        [M in keyof _RouteAt<T, P> | keyof _RouteAt<S, P>]: M extends keyof _RouteAt<S, P>
            ? _RouteAt<S, P>[M]
            : M extends keyof _RouteAt<T, P>
              ? _RouteAt<T, P>[M]
              : never;
    };
}>;

export interface RequestSchema {
    params?: ZodObject;
    query?: ZodObject;
    body?: ZodType;
    headers?: ZodObject;
    cookies?: ZodObject;
}

export interface ResponseSchema {
    responses?: Record<number, ZodType>;
}

export interface LocalsSchema {
    locals?: ZodObject;
}

export interface RequestOptions
    extends RequestSchema, ResponseSchema, LocalsSchema, ExpressZod.RequestOptions {}

export type RequestOptionsInferred = {
    [K in keyof RequestOptions]: unknown;
};

export type InferRequestOptions<T> = T extends RequestOptions
    ? {
          [K in keyof T]: K extends keyof ResponseSchema
              ? Simplify<_InferResponseSchema<T[K]>>
              : K extends keyof RequestSchema | keyof LocalsSchema
                ? output<T[K]>
                : T[K];
      }
    : T;

type _InferResponseSchema<T> = {
    [K in keyof T]: output<T[K]>;
};

export type RequestHandler<T extends RequestOptionsInferred = {}, ReqExtra = {}> = (
    req: Request<T> & ReqExtra,
    res: Response<T["responses"] & {}, T["locals"] & {}>,
    next: e.NextFunction,
) => unknown;

export type ErrorRequestHandler<T extends RequestOptionsInferred = {}> = (
    err: unknown,
    req: Request<T>,
    res: Response<T["responses"] & {}, T["locals"] & {}>,
    next: e.NextFunction,
) => unknown;

export interface AnyHandler<T extends RequestOptionsInferred = {}> {
    (
        req: Request<T>,
        res: Response<T["responses"] & {}, T["locals"] & {}>,
        next: e.NextFunction,
    ): unknown;
    (
        err: unknown,
        req: Request<T>,
        res: Response<T["responses"] & {}, T["locals"] & {}>,
        next: e.NextFunction,
    ): unknown;
}

export interface Request<T extends RequestOptionsInferred> extends Omit<
    e.Request<T["params"], ResBody<T["responses"]>, T["body"], T["query"], T["locals"] & {}>,
    "headers" | "cookies"
> {
    headers: InferHeaders<T["headers"]>;
    cookies: T["cookies"];
}

export interface Response<
    Responses extends Record<number, any>,
    Locals extends Record<string, any>,
    Urls extends string = never,
    StatusCode extends keyof Responses = 200,
>
    extends
        Omit<
            e.Response<Responses[StatusCode], Locals>,
            "statusCode" | "sendStatus" | "status" | "json" | "send" | "redirect"
        >,
        Express.Response {
    statusCode: keyof Responses;
    sendStatus<Code extends keyof Responses>(code: Code): Response<Responses, Locals, Urls, Code>;
    status<Code extends keyof Responses>(statusCode: Code): Response<Responses, Locals, Urls, Code>;
    json(body: Responses[StatusCode]): Response<Responses, Locals, Urls, StatusCode>;
    send(
        body: Responses[StatusCode] | Buffer<ArrayBufferLike>,
    ): Response<Responses, Locals, Urls, StatusCode>;
    redirect(url: Urls | keyof ExpressZod.RouteMap): void;
    redirect(status: number, url: Urls | keyof ExpressZod.RouteMap): void;
}

export type ResBody<Responses, StatusCode extends number = never> = Responses extends {
    [S in keyof StatusCode]: infer R;
}
    ? R
    : Responses extends { 200: infer R }
      ? R
      : unknown;

export type InferHeaders<T> =
    Or<IsAny<T>, IsUnknown<T>> extends true
        ? OmitIndexSignature<e.Request["headers"]>
        : T & OmitIndexSignature<e.Request["headers"]>;

export interface Use<T> {
    <O extends RequestOptions, L extends LazyMiddlewareOptions["lazy"]>(
        options: (Exact<O, RequestOptions> & { lazy?: never }) | { lazy?: L },
        ...handlers: IsUnion<L> extends true
            ? RequestHandler<InferRequestOptions<O>>[]
            : LazyMiddlewareHandler<
                  MergeUnion<
                      {
                          [K in keyof L]: L[K] extends (...args: any[]) => infer R
                              ? InferRequestOptions<R>
                              : InferRequestOptions<L[K]>;
                      }[keyof L]
                  >,
                  {
                      [K in keyof L]?: L[K] extends (...args: infer A) => any
                          ? A["length"] extends 0
                              ? boolean
                              : A
                          : boolean;
                  }
              >[]
    ): T;
    (...handlers: RequestHandler<{}>[]): T;
    <R extends Router>(router: R): Router<PrefixOf<T>, MergeRoutes<RoutesOf<R>, RoutesOf<T>>>;
    <P extends string, R extends Router>(
        prefix: P,
        router: R,
    ): Router<
        PrefixOf<T>,
        MergeRoutes<PrefixingRoutes<RoutesOf<R>, [PrefixOf<T>, P]>, RoutesOf<T>>
    >;
}

export type PrefixingRoutes<T, P extends string[]> = {
    [
        K in NormalizePath<JoinString<JoinStringArray<P>, keyof T extends string ? keyof T : never>>
    ]: T[keyof T];
} extends infer R extends RouteMap
    ? R
    : {};

export interface OnError<T> {
    (...handlers: ErrorRequestHandler<{}>[]): T;
    <O extends RequestOptions = {}>(
        options: Exact<O, RequestOptions>,
        ...handlers: ErrorRequestHandler<InferRequestOptions<O>>[]
    ): T;
}
