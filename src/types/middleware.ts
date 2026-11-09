import type { NextFunction, Request, Response } from 'express'
import type { Simplify, UnionToIntersection } from 'type-fest'
import type { ZodType, output } from 'zod'

import type { RouteSchemas } from './route.ts'

declare const middlewareBrand: unique symbol
declare const schemasBrand: unique symbol
declare const context: unique symbol

export interface Middleware<Provides extends object = {}, Schemas extends RouteSchemas = {}> {
  (req: Request & Provides, res: Response, next: NextFunction): unknown
  readonly [middlewareBrand]: Provides
  readonly [schemasBrand]: Schemas
}

export interface MiddlewareContext<Entries extends object> {
  readonly [context]?: Entries
}

export type ScopeEntries<T> =
  T extends MiddlewareContext<infer Entries extends object> ? Entries : {}

export type ScopedMiddleware<
  Prefix extends string,
  Provides extends object,
  Schemas extends RouteSchemas,
> = {
  [Key in `scope:${Prefix}`]: { provides: Provides; schemas: Schemas }
}

export interface ResolvedContext {
  context: object
  request: object
}

type TrimTrailingSlash<Path extends string> = Path extends `${infer Rest}/`
  ? TrimTrailingSlash<Rest>
  : Path

export type NormalizePrefix<Prefix extends string> = Prefix extends '/'
  ? ''
  : TrimTrailingSlash<Prefix>

type AppliesTo<Prefix extends string, Path extends string> = Prefix extends ''
  ? true
  : Path extends Prefix
    ? true
    : Path extends `${Prefix}/${string}`
      ? true
      : false

type ScopedEntries<T, Path extends string> = {
  [
    Key in keyof ScopeEntries<T> as Key extends `scope:${infer Prefix}`
      ? AppliesTo<Prefix, Path> extends true
        ? Key
        : never
      : never
  ]: ScopeEntries<T>[Key]
}

type RequestFrom<Schemas> = Simplify<
  (Schemas extends { query: infer Schema extends ZodType } ? { query: output<Schema> } : {}) &
    (Schemas extends { headers: infer Schema extends ZodType }
      ? { headers: Request['headers'] & output<Schema> }
      : {}) &
    (Schemas extends { body: infer Schema extends ZodType } ? { body: output<Schema> } : {})
>

type Resolve<Entry> = {
  context: Entry extends { provides: infer Provides extends object } ? Provides : {}
  request: Entry extends { schemas: infer Schemas extends RouteSchemas } ? RequestFrom<Schemas> : {}
}

export type ContextAt<T, Path extends string> =
  ScopedEntries<T, Path> extends infer Matched extends object
    ? [keyof Matched] extends [never]
      ? Resolve<{}>
      : Resolve<UnionToIntersection<Matched[keyof Matched]>>
    : Resolve<{}>
