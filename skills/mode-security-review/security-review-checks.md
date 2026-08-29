# Security Review — Framework-Specific Checks

Disclosed reference for `SKILL.md`. Run only the section(s) matching the code surface being audited — skip any framework/language with no surface area. Report findings using the format defined in `SKILL.md`.

---

## Node.js-Specific Risks
- `child_process.exec` vs safer `execFile`/`spawn` with argument arrays (no shell interpolation)
- Unhandled promise rejections that could silently swallow security-relevant errors
- Synchronous crypto (`crypto.randomBytes` used synchronously for session tokens is fine; blocking the event loop with heavy sync ops is not)
- `Buffer.allocUnsafe` where `Buffer.alloc` is needed (uninitialized memory exposure)
- `require()` with user-controlled strings (arbitrary module load)
- Timing attacks: non-constant-time string comparison for HMAC / token validation — flag raw `===` on secrets; should use `crypto.timingSafeEqual`
- Dependency risk: flag `*` or very broad semver ranges in `package.json`; flag packages with known CVEs if detectable from import names

---

## NestJS-Specific Risks
- **Guard ordering**: `@UseGuards()` on a controller vs. individual routes — a guard on the controller class is bypassed by routes that re-declare `@UseGuards()` without including the original guard
- **`@SkipPermissionsCheck()` misuse**: verify it is only on health-check / public endpoints; flag any data-returning route with this decorator
- **Missing `ValidationPipe` globally**: if `app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))` is absent, unknown DTO fields pass through
- **DTO `@IsOptional()` + no type decorator**: an optional field with no `@IsString()` / `@IsNumber()` still accepts any type — check for missing type validators on optional fields
- **Partial DTO leaking writable fields**: `PartialType(CreateDto)` includes all fields as optional — verify read-only / server-generated fields (`id`, `createdAt`, `status`) are excluded
- **Exception filter info leakage**: custom `ExceptionFilter` implementations that forward raw `error.message` or `error.stack` to clients in production
- **Swagger in production**: `SwaggerModule.setup()` should be gated behind a non-production env check; unprotected `/api-docs` exposes full API surface and example payloads
- **Circular dependency injection**: NestJS silently resolves some circular deps with `forwardRef()` — these can produce `undefined` injected services that bypass security checks without throwing
- **Module imports exporting too much**: a module that `exports: [DataProvider, AdminService]` for a single feature leaks admin capabilities to every importing module

---

## Fastify-Specific Risks
- **Schema validation gaps**: routes without a `schema.body` / `schema.querystring` definition receive raw unvalidated input — every mutation route must define a JSON Schema
- **`ajv` coercion side-effects**: `coerceTypes: true` in AJV config can silently convert `"1"` to `1`, masking type-based access-control checks
- **Hook order**: `preValidation` vs `preHandler` — auth verification must be in `preHandler` (runs after schema validation) or `onRequest` (runs before everything); placing auth in `preParsing` skips body validation
- **JWT verification shortcut**: `fastify-jwt` `request.jwtVerify()` must be awaited — unawaited calls return before the token is checked
- **`reply.send()` after error throw**: if a route calls `reply.send(data)` and then throws, Fastify may double-send — verify error handler doesn't leak data already sent
- **`setErrorHandler` info leakage**: default Fastify error handler sends `error.message` in the response; custom handlers must sanitize before forwarding to clients
- **`@fastify/cors` origin function**: `origin: (origin, cb) => cb(null, true)` allows all origins — verify the origin allowlist logic
- **`@fastify/helmet` CSP gaps**: default Helmet CSP may not block `unsafe-inline` scripts; verify directives match actual needs
- **Rate-limiter scope**: `@fastify/rate-limit` applied globally vs. per-route — auth endpoints need stricter limits than read endpoints

---

## Angular / NgRx-Specific Risks
- **XSS via `innerHTML` binding**: `[innerHTML]="userContent"` without DomSanitizer — Angular auto-escapes interpolation `{{ }}` but not property bindings to raw HTML sinks
- **`bypassSecurityTrust*` misuse**: `DomSanitizer.bypassSecurityTrustHtml/Url/Script/Style` called with user-controlled values; these are intentional escapes and must only wrap known-safe content
- **Template injection via dynamic component creation**: `ViewContainerRef.createComponent()` with a component class derived from user input
- **Sensitive data in NgRx store**: PII, tokens, or raw API credentials stored in state (visible in Redux DevTools, serialized to localStorage via store plugins)
- **Sensitive data in `localStorage` / `sessionStorage`**: access tokens, session keys — prefer `sessionStorage` over `localStorage` for auth tokens; never store raw credentials
- **Route guard bypasses**: `canActivate` guards that return `true` on error (e.g., `catchError(() => of(true))`) instead of redirecting to login
- **`HttpClient` interceptor missing auth**: outgoing requests to authenticated endpoints that bypass the auth interceptor because the interceptor uses a URL prefix check that doesn't match all variants
- **Open redirect**: `router.navigate([userInput])` or `window.location.href = userValue` without allow-list validation
- **`EventEmitter` leaking internal state**: `@Output() clicked = new EventEmitter<InternalModel>()` — exposed output types should use public DTOs, not internal models
- **NgRx effect error swallowing**: `catchError(() => EMPTY)` in an effect silently kills the effect stream — subsequent dispatches of the same action never fire; also masks security-relevant errors

---

## TypeScript-Specific Risks
- **`as any` / `as unknown as T` casts on user-supplied data**: these disable type checking; flag any cast where the value originates from a request body, URL param, or external API response
- **`JSON.parse()` without try/catch and schema validation**: malformed input throws; even valid JSON may not match expected shape — add zod/class-validator parse after `JSON.parse`
- **Non-null assertion `!` on externally-sourced values**: `req.body.userId!` — if the field is absent the assertion doesn't throw, it just carries `undefined` through as a typed value
- **`Object.keys` / `for...in` on user objects**: iterates prototype chain properties; always use `Object.hasOwn()` or `Object.prototype.hasOwnProperty.call()`
- **Spread of user input into config objects**: `{ ...defaults, ...userSettings }` where `userSettings` can include `__proto__` or override security-relevant defaults
- **Enum reverse-mapping misuse**: numeric TypeScript enums have reverse mappings (`Permission[0]`); user-supplied numeric strings can accidentally resolve to valid enum names
- **Type guard functions returning `true` by default**: `function isAdmin(u: User): u is AdminUser { try { ... } catch { return true; } }` — fail-closed, not fail-open
- **`Date` from user string without validation**: `new Date(userInput)` accepts many formats and never throws for invalid input; it returns `Invalid Date` which compares unexpectedly with valid dates
