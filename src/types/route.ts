import type {
  ErrorRequestHandler,
  Express,
  NextFunction,
  Request,
  RequestHandler,
  Response,
  Router as ExpressRouter,
} from 'express'
import type { PathParams } from 'path-to-regexp-types'
import type { Simplify } from 'type-fest'
import type { ZodType, output } from 'zod'

import type { HttpStatusCode, NoBodyStatus, RouteMethod } from './http.ts'
import type {
  ContextAt,
  Middleware,
  MiddlewareContext,
  NormalizePrefix,
  ScopedProvides,
  ScopeEntries,
} from './middleware.ts'

export interface RouteSchemas {
  params?: ZodType
  query?: ZodType
  body?: ZodType
  headers?: ZodType
  response?: ZodType | Partial<Record<HttpStatusCode, ZodType>>
}

export interface RouteRecord {
  method: RouteMethod
  path: string
  schemas?: RouteSchemas
}

type ParamsOf<Schemas, Path extends string> = Schemas extends {
  params: infer Schema extends ZodType
}
  ? Merge<AutoParams<Path>, output<Schema>>
  : string extends Path
    ? Request['params']
    : PathParams<Path>

type AutoParams<Path extends string> = string extends Path ? {} : PathParams<Path>

type Merge<Base, Override> = Simplify<Omit<Base, keyof Override> & Override>

type QueryOf<Schemas> = Schemas extends { query: infer Schema extends ZodType }
  ? output<Schema>
  : Request['query']

type BodyOf<Schemas> = Schemas extends { body: infer Schema extends ZodType } ? output<Schema> : any

type HeadersOf<Schemas> = Schemas extends { headers: infer Schema extends ZodType }
  ? output<Schema>
  : Request['headers']

type ResponseMap<Schemas> = Schemas extends { response: infer ResponseSchema }
  ? ResponseSchema extends ZodType
    ? { 200: ResponseSchema }
    : ResponseSchema
  : {}

type ResponseBody<Schemas, Code extends number | undefined> = Code extends NoBodyStatus
  ? undefined
  : Code extends number
    ? Code extends keyof ResponseMap<Schemas>
      ? output<ResponseMap<Schemas>[Code]>
      : DefaultResponseBody<Schemas>
    : DefaultResponseBody<Schemas>

type DefaultResponseBody<Schemas> = 200 extends keyof ResponseMap<Schemas>
  ? output<ResponseMap<Schemas>[200]>
  : keyof ResponseMap<Schemas> extends never
    ? any
    : output<ResponseMap<Schemas>[keyof ResponseMap<Schemas>]>

export type ResponseBodies<Schemas> = {
  [Code in keyof ResponseMap<Schemas>]: Code extends NoBodyStatus
    ? undefined
    : output<ResponseMap<Schemas>[Code]>
}

export type TypedResponse<Schemas, Code extends number | undefined = undefined> = {
  status<Next extends NoBodyStatus | (keyof ResponseMap<Schemas> & number)>(
    code: Next,
  ): TypedResponse<Schemas, Next>
  status(code: number): TypedResponse<Schemas, undefined>
} & Response<ResponseBody<Schemas, Code>>

export type RouteResponse<Schemas> = [keyof ResponseMap<Schemas>] extends [never]
  ? Response
  : TypedResponse<Schemas>

export type RouteRequest<Schemas, Path extends string> = Omit<
  Request<ParamsOf<Schemas, Path>, any, BodyOf<Schemas>, QueryOf<Schemas>>,
  'headers'
> & { headers: HeadersOf<Schemas> }

export type RouteHandler<Schemas, Path extends string, Context extends object = {}> = (
  req: RouteRequest<Schemas, Path> & Context,
  res: RouteResponse<Schemas>,
  next: NextFunction,
) => unknown

type PathHandler<Path extends string, Context extends object> = (
  req: Request<PathParams<Path>> & Context,
  res: Response,
  next: NextFunction,
) => unknown

type HandlerOrHandlers<Handler> = Handler | Handler[]

type Handlers<Handler> = [HandlerOrHandlers<Handler>, ...Array<HandlerOrHandlers<Handler>>]

export type RouteKey<Method extends RouteMethod, Path extends string> = `${Method} ${Path}`

export interface RouteDefinition<
  Method extends RouteMethod,
  Path extends string,
  Schemas extends RouteSchemas,
> {
  method: Method
  path: Path
  params: ParamsOf<Schemas, Path>
  query: QueryOf<Schemas>
  body: BodyOf<Schemas>
  headers: HeadersOf<Schemas>
  response: ResponseBodies<Schemas>
  schemas: Schemas
}

export type RouteEntry<
  Method extends RouteMethod,
  Path extends string,
  Schemas extends RouteSchemas,
> = {
  [Key in RouteKey<Method, Path>]: RouteDefinition<Method, Path, Schemas>
}

export type RoutesOf<Target> = {
  [Key in keyof Target as Key extends RouteKey<RouteMethod, string> ? Key : never]: Target[Key]
}

type TrimTrailingSlash<Path extends string> = Path extends `${infer Rest}/`
  ? TrimTrailingSlash<Rest>
  : Path

export type JoinPath<Prefix extends string, Path extends string> = Prefix extends ''
  ? Path
  : Prefix extends '/'
    ? Path
    : Path extends '' | '/'
      ? TrimTrailingSlash<Prefix>
      : Path extends `/${string}`
        ? `${TrimTrailingSlash<Prefix>}${Path}`
        : `${TrimTrailingSlash<Prefix>}/${Path}`

type UseHandler = RequestHandler | ErrorRequestHandler | Array<RequestHandler | ErrorRequestHandler>

type RoutedTarget<Target> = [keyof RoutesOf<Target>] extends [never] ? never : unknown

type PrefixedDefinition<Definition, Prefix extends string> =
  Definition extends RouteDefinition<
    infer Method extends RouteMethod,
    infer Path extends string,
    infer Schemas extends RouteSchemas
  >
    ? RouteDefinition<Method, JoinPath<Prefix, Path>, Schemas>
    : never

type DefinitionKey<Definition> =
  Definition extends RouteDefinition<
    infer Method extends RouteMethod,
    infer Path extends string,
    RouteSchemas
  >
    ? RouteKey<Method, Path>
    : never

export type PrefixedRoutes<Routes, Prefix extends string> = {
  [
    Key in keyof Routes as DefinitionKey<PrefixedDefinition<Routes[Key], Prefix>>
  ]: PrefixedDefinition<Routes[Key], Prefix>
}

export interface RouteMethods {
  readonly registry: readonly RouteRecord[]
  use<Prefix extends string, Target extends object>(
    path: Prefix,
    target: Target & RoutedTarget<Target>,
    ...handlers: UseHandler[]
  ): this & PrefixedRoutes<RoutesOf<Target>, Prefix>
  use<Target extends object>(
    target: Target & RoutedTarget<Target>,
    ...handlers: UseHandler[]
  ): this & PrefixedRoutes<RoutesOf<Target>, ''>
  use<Provides extends object>(
    middleware: Middleware<Provides>,
  ): this & MiddlewareContext<ScopeEntries<this> & ScopedProvides<'', Provides>>
  use<Prefix extends string, Provides extends object>(
    path: Prefix,
    middleware: Middleware<Provides>,
  ): this &
    MiddlewareContext<ScopeEntries<this> & ScopedProvides<NormalizePrefix<Prefix>, Provides>>
  /**
   * Merges the middleware's request context into the app or router type
   * without registering the middleware at runtime. Use it when an ancestor
   * already registered the middleware, so it only runs once per request.
   */
  inherit<Provides extends object>(
    middleware: Middleware<Provides>,
  ): this & MiddlewareContext<ScopeEntries<this> & ScopedProvides<'', Provides>>
  /**
   * Merges the middleware's request context for routes under `path` inside
   * this router, without registering the middleware at runtime.
   */
  inherit<Prefix extends string, Provides extends object>(
    path: Prefix,
    middleware: Middleware<Provides>,
  ): this &
    MiddlewareContext<ScopeEntries<this> & ScopedProvides<NormalizePrefix<Prefix>, Provides>>
  all<Path extends string, Schemas extends RouteSchemas>(
    path: Path,
    schemas: Schemas,
    ...handlers: Handlers<RouteHandler<Schemas, Path, ContextAt<this, Path>>>
  ): this & RouteEntry<'all', Path, Schemas>
  all<Path extends string>(
    path: Path,
    ...handlers: Handlers<PathHandler<Path, ContextAt<this, Path>>>
  ): this & RouteEntry<'all', Path, {}>
  connect<Path extends string, Schemas extends RouteSchemas>(
    path: Path,
    schemas: Schemas,
    ...handlers: Handlers<RouteHandler<Schemas, Path, ContextAt<this, Path>>>
  ): this & RouteEntry<'connect', Path, Schemas>
  connect<Path extends string>(
    path: Path,
    ...handlers: Handlers<PathHandler<Path, ContextAt<this, Path>>>
  ): this & RouteEntry<'connect', Path, {}>
  delete<Path extends string, Schemas extends RouteSchemas>(
    path: Path,
    schemas: Schemas,
    ...handlers: Handlers<RouteHandler<Schemas, Path, ContextAt<this, Path>>>
  ): this & RouteEntry<'delete', Path, Schemas>
  delete<Path extends string>(
    path: Path,
    ...handlers: Handlers<PathHandler<Path, ContextAt<this, Path>>>
  ): this & RouteEntry<'delete', Path, {}>
  get<Path extends string, Schemas extends RouteSchemas>(
    path: Path,
    schemas: Schemas,
    ...handlers: Handlers<RouteHandler<Schemas, Path, ContextAt<this, Path>>>
  ): this & RouteEntry<'get', Path, Schemas>
  get<Path extends string>(
    path: Path,
    ...handlers: Handlers<PathHandler<Path, ContextAt<this, Path>>>
  ): this & RouteEntry<'get', Path, {}>
  head<Path extends string, Schemas extends RouteSchemas>(
    path: Path,
    schemas: Schemas,
    ...handlers: Handlers<RouteHandler<Schemas, Path, ContextAt<this, Path>>>
  ): this & RouteEntry<'head', Path, Schemas>
  head<Path extends string>(
    path: Path,
    ...handlers: Handlers<PathHandler<Path, ContextAt<this, Path>>>
  ): this & RouteEntry<'head', Path, {}>
  options<Path extends string, Schemas extends RouteSchemas>(
    path: Path,
    schemas: Schemas,
    ...handlers: Handlers<RouteHandler<Schemas, Path, ContextAt<this, Path>>>
  ): this & RouteEntry<'options', Path, Schemas>
  options<Path extends string>(
    path: Path,
    ...handlers: Handlers<PathHandler<Path, ContextAt<this, Path>>>
  ): this & RouteEntry<'options', Path, {}>
  patch<Path extends string, Schemas extends RouteSchemas>(
    path: Path,
    schemas: Schemas,
    ...handlers: Handlers<RouteHandler<Schemas, Path, ContextAt<this, Path>>>
  ): this & RouteEntry<'patch', Path, Schemas>
  patch<Path extends string>(
    path: Path,
    ...handlers: Handlers<PathHandler<Path, ContextAt<this, Path>>>
  ): this & RouteEntry<'patch', Path, {}>
  post<Path extends string, Schemas extends RouteSchemas>(
    path: Path,
    schemas: Schemas,
    ...handlers: Handlers<RouteHandler<Schemas, Path, ContextAt<this, Path>>>
  ): this & RouteEntry<'post', Path, Schemas>
  post<Path extends string>(
    path: Path,
    ...handlers: Handlers<PathHandler<Path, ContextAt<this, Path>>>
  ): this & RouteEntry<'post', Path, {}>
  put<Path extends string, Schemas extends RouteSchemas>(
    path: Path,
    schemas: Schemas,
    ...handlers: Handlers<RouteHandler<Schemas, Path, ContextAt<this, Path>>>
  ): this & RouteEntry<'put', Path, Schemas>
  put<Path extends string>(
    path: Path,
    ...handlers: Handlers<PathHandler<Path, ContextAt<this, Path>>>
  ): this & RouteEntry<'put', Path, {}>
  query<Path extends string, Schemas extends RouteSchemas>(
    path: Path,
    schemas: Schemas,
    ...handlers: Handlers<RouteHandler<Schemas, Path, ContextAt<this, Path>>>
  ): this & RouteEntry<'query', Path, Schemas>
  query<Path extends string>(
    path: Path,
    ...handlers: Handlers<PathHandler<Path, ContextAt<this, Path>>>
  ): this & RouteEntry<'query', Path, {}>
  trace<Path extends string, Schemas extends RouteSchemas>(
    path: Path,
    schemas: Schemas,
    ...handlers: Handlers<RouteHandler<Schemas, Path, ContextAt<this, Path>>>
  ): this & RouteEntry<'trace', Path, Schemas>
  trace<Path extends string>(
    path: Path,
    ...handlers: Handlers<PathHandler<Path, ContextAt<this, Path>>>
  ): this & RouteEntry<'trace', Path, {}>
}

export type App = RouteMethods & Express

export type Router = RouteMethods & ExpressRouter
