import type { NextFunction, Request, Response } from 'express'
import type { UnionToIntersection } from 'type-fest'

declare const middlewareBrand: unique symbol
declare const context: unique symbol

export interface Middleware<Provides extends object = {}> {
  (req: Request & Provides, res: Response, next: NextFunction): unknown
  readonly [middlewareBrand]: Provides
}

export interface MiddlewareContext<Entries extends object> {
  readonly [context]?: Entries
}

export type ScopeEntries<T> =
  T extends MiddlewareContext<infer Entries extends object> ? Entries : {}

export type ScopedProvides<Prefix extends string, Provides extends object> = {
  [Key in `scope:${Prefix}`]: Provides
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

export type ContextAt<T, Path extends string> =
  ScopedEntries<T, Path> extends infer Matched extends object
    ? [keyof Matched] extends [never]
      ? {}
      : UnionToIntersection<Matched[keyof Matched]>
    : {}
