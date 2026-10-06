import type { IsStringLiteral, KeysOfUnion, Simplify } from "type-fest";

type _Exact<S, T> = Readonly<S> & Record<Exclude<keyof T, KeysOfUnion<S>>, never>;

export type Exact<T, S> = T & _Exact<S, T>;

export type JoinString<A extends string, B extends string> = `${A}${B}` extends infer T extends
    string
    ? IsStringLiteral<T> extends true
        ? T
        : ""
    : "";

export type JoinStringArray<T extends string[], _Result extends string = ""> = T extends [
    infer H extends string,
    ...infer Rest extends string[],
]
    ? JoinStringArray<Rest, JoinString<_Result, H>>
    : _Result;

export type NormalizePath<T extends string> = T extends "/" | ""
    ? "/"
    : T extends `${infer A}//${infer B}`
      ? NormalizePath<`${A}/${B}`>
      : T;

export type MergeUnion<T> = Simplify<{
    [K in KeysOfUnion<T>]: T extends Record<K, infer V> ? V : never;
}>;
