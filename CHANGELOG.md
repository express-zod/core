# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Nothing yet.

## [0.0.1] - 2026-11-10

First release, published under the `alpha` dist-tag.

### Added

- `createApp` and `createRouter` with routes whose `:param` placeholders are
  inferred as typed route keys.
- Request schemas for `params`, `query`, `body` and `headers`, validated at
  runtime and reflected in the handler's request type.
- `defineMiddleware` and router middleware, including schemas declared on
  middleware and scoped to a path prefix.
- Custom schema keys accepted without registration.
- `ValidationError`, carrying the failing location and the underlying
  `ZodError`, so Express error handlers can answer validation failures.
- `HttpStatus`, `HttpStatusCode` and `NoBodyStatus`.

### Fixed

- Middleware builders are named so declaration emit stays portable across
  TypeScript versions.
