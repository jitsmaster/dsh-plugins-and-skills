# Memory and Performance Analyzer — Framework-Specific Checks

Disclosed reference for `SKILL.md`. Run only the framework section(s) relevant to the code surface being analyzed — skip any framework with no surface area. Report findings using the format defined in `SKILL.md`.

## Node.js-Specific Issues

### Event Loop Blocking
- **Synchronous CPU-heavy work on the main thread**: `JSON.parse`/`JSON.stringify` on large payloads, `crypto` operations, regex on large strings, and `Array.sort` on large datasets all block the event loop. Look for these called directly in request handlers rather than offloaded to `worker_threads` or `setImmediate`.
- **`fs.readFileSync` / `fs.writeFileSync` in request paths**: Any sync `fs` call blocks every concurrent request. Even in startup code, prefer async variants if the file may grow.
- **`process.nextTick` storms**: Deeply recursive use of `process.nextTick` starves I/O callbacks because nextTick queue drains fully before I/O is processed. Prefer `setImmediate` when yielding within tight loops.

### Memory and GC Pressure
- **String concatenation in loops**: `str += chunk` in a loop creates O(n²) intermediate strings. Use `Buffer.concat` for binary or array `join('')` for text.
- **Unbounded `EventEmitter` listeners**: Adding listeners inside request handlers or loops without `removeListener` or using `.once()` accumulates listeners. Node warns at 11 listeners; memory grows linearly. Check for `emitter.on(...)` inside loops or lifecycle methods that run repeatedly.
- **`Buffer.alloc` vs `Buffer.allocUnsafe`**: `allocUnsafe` is faster but exposes old memory content — a security and correctness issue in data returned to users.
- **Closures capturing large objects**: An inner function that closes over a large request object or database result prevents GC of the entire closure scope. Look for async callbacks inside handlers that reference `req`, `res`, or large arrays.
- **`setInterval` / `setTimeout` without `clearInterval`**: Timers registered in module scope or inside class constructors that are never cleared keep their callback (and its closure) alive indefinitely.
- **Streams not consumed or destroyed**: A `Readable` stream that is piped but never consumed, or a `Transform` where an error event is not handled, stalls and holds its internal buffer. Look for streams without `.resume()`, `.pipe()`, or `.destroy()` in error paths.

### Cluster / Worker Threads
- **Serialization overhead of large messages**: Posting large objects between worker threads via `postMessage` requires full structured-clone serialization. Prefer `SharedArrayBuffer` + `Atomics` for high-throughput numeric data, or pass `ArrayBuffer` with transfer semantics.
- **Worker thread pool starvation**: A fixed-size thread pool (e.g., `Piscina`, `worker_threads`) where tasks queue faster than they complete leads to unbounded queue growth. Look for pools without backpressure or queue size limits.

### Outbound HTTP & Client Connections
- **No keep-alive agent on outbound HTTP**: `axios`/`node-fetch` calls made without a shared `http(s).Agent({ keepAlive: true })` (or undici pool) pay a full TCP+TLS handshake per call — dominant latency for chatty integrations (analytics, CMS). Look for `new Agent()` (or default agent) created per request instead of once at module scope.
- **Missing timeout / `AbortController` on outbound calls**: A hung upstream call holds sockets and pending promises (and their closures) indefinitely. Every outbound call to an external service needs a timeout.

### Jest Test Suite
- **Test teardown leaks**: A `TestingModule` created in `beforeEach` without a matching `module.close()` in `afterEach`, or un-cleared timers/intervals/DB handles from the code under test, causes Jest worker heap growth ("worker ran out of memory") and `--detectOpenHandles` warnings. Look for `Test.createTestingModule` without a corresponding `close()`.

---

## RavenDB-Specific Issues
- **Session not disposed / long-lived sessions**: RavenDB sessions track every loaded entity for change detection; a session held across many operations (or per-app instead of per-request) accumulates the entire tracked-entity map. Look for `documentStore.openSession()` without `session.dispose()` or reuse of one session across requests.
- **Session request-limit signals N+1**: The client's default `maxNumberOfRequestsPerSession` caps a session at 30 requests — hitting that limit signals an N+1 pattern. Look for `session.load()` inside loops instead of a single batched `session.load([ids])` or `.include()`.
- **Query without `.take()` / streaming**: `session.query(...).all()` on an unbounded collection materializes every matching document. Use `.take()` for bounded results or `documentStore.stream()` for large result sets.
- **Multiple `DocumentStore` instances**: `new DocumentStore(...).initialize()` created per request or per service recreates connection pools and topology caches. There must be exactly one store per application (see `rendering-api/src/config/database.config.ts`).
- **Change-tracking overhead on read-only paths**: Read-only queries should use `session.advanced.noTracking` (or projections) to skip change-tracking cost when the loaded entities are never mutated.

---

## MongoDB-Specific Issues
This repo's `IDataProvider` abstraction (`server-shared/src/database/implementations/mongodb/`) supports Mongo alongside RavenDB — changes under `server-shared/src/database/**` must be evaluated against **both** backends, not just whichever one the diff happens to touch first.
- **`find()` without `.limit()` or projection**: `collection.find({...})` with no `.limit()` and no field projection materializes every matching document in full. Add `.limit()` for bounded UI lists and a projection (`{ field: 1 }`) when only specific fields are needed.
- **`find()` inside a loop instead of `$in`**: Looking up documents one ID at a time in a loop is the Mongo equivalent of the RavenDB N+1 problem. Use a single `find({ _id: { $in: ids } })` batch query instead.
- **Cursors materialized via `.toArray()` on large collections**: `.toArray()` pulls the entire result set into memory at once. For large or unbounded collections, iterate the cursor (`for await (const doc of cursor)`) or stream instead.
- **`new MongoClient(...)` created per request or per service instance**: Each client instantiation opens its own connection pool; creating one per request exhausts the DB's max-connections limit under load. There must be exactly one shared client (with an explicit `maxPoolSize`) per application, routed through the existing `MongoDBIndexManager` / data-provider setup rather than instantiated ad hoc.
- **Aggregation pipelines without `allowDiskUse` or an early `$limit`/`$match`**: A pipeline that sorts or groups a large collection without `allowDiskUse: true` can hit Mongo's in-memory stage limit; a pipeline with `$sort`/`$group` before a filtering `$match`/`$limit` does far more work than necessary. Check stage ordering.
- **Missing indexes for query patterns introduced in the diff**: A new query field should have a corresponding index verified via `MongoDBIndexManager`, not assumed to exist.

---

## AI Agents / LangChain-Specific Issues
`api/services/ai-agents/` (LLM factory, streaming callback handlers, task-state stores, RAG/vector search) is one of the largest and most leak-prone subsystems in this codebase — this branch's own recent history includes two related fixes (`TokenTrackingCallbackHandler` moving from a hand-rolled pending-run map to `lru-cache`, and `LLMFactoryService` merging rather than overwriting existing callbacks), so treat this as a proven bug class, not a theoretical one.
- **`BaseCallbackHandler` subclasses with unbounded per-run state**: A handler that keys a `Map`/plain object by run ID to track in-flight state, without an eviction policy, leaks forever for any run that errors, is abandoned, or is never explicitly completed. Grep `extends BaseCallbackHandler`, then inspect the class's fields for unbounded maps — prefer an `lru-cache` with a max size/TTL, matching the existing `TokenTrackingCallbackHandler` pattern.
- **LLM clients instantiated directly instead of via `LLMFactoryService`**: `new ChatOpenAI(...)` / `new ChatAnthropic(...)` (or equivalent) called outside `llm-factory.service.ts` / its provider files bypasses shared connection/callback configuration and risks duplicating the callback-overwrite bug class above. Grep for `new Chat(OpenAI|Anthropic)` outside the factory/providers directory.
- **Unbounded conversation history / agent scratchpad growth**: Multi-turn agent state that appends every turn's messages/tool outputs without a trim or summarization step grows without bound across a long-running session. `unified-skills-agent-memory.spec.ts` already guards this in tests — treat any new state-accumulation path without a matching guard as a gap.
- **Streaming token accumulation via string concatenation**: `str += token` per streamed chunk in a handler is the same O(n²) string-growth issue as the general Node.js case, but is easy to miss inside callback handler code — check `handleLLMNewToken` (or equivalent) implementations specifically.
- **Callback arrays overwritten instead of merged when composing handlers**: Passing a new `callbacks: [...]` array into an LLM call config can silently replace (not add to) callbacks already configured elsewhere (the `2fea7af5` fix). Any code constructing a callbacks array should spread/merge with existing callbacks rather than replacing them.
- **Large tool outputs or RAG chunks embedded into prompt context without truncation**: Vector-search results or tool call outputs appended directly into a prompt/context window without a size cap can blow up token cost and, for very large outputs, memory pressure building the prompt string. Check for a truncation/cap step before context assembly.

---

## SSE / Streaming-Specific Issues
SSE is a core, pervasive pattern here (`SseUtilitiesService`, `sse.types.ts`, streaming controllers, `streaming-utilities.service.ts`, streaming NgRx effects) — treat it as its own review surface spanning server and client, in addition to the narrower NestJS SSE bullet above.
- **Heartbeat/keep-alive timers not cleared on disconnect**: A `setInterval` sending periodic keep-alive pings per SSE connection must be cleared when the connection closes. Look for a connection registry (`Map` of active clients) that isn't pruned on `close`/disconnect — this is the SSE-specific version of the general unbounded-cache/listener leak.
- **Ignoring backpressure from `reply.raw.write()`**: `write()` returns `false` when the underlying buffer is full (a slow client). Code that ignores this and keeps writing regardless lets the server-side buffer for that connection grow unbounded. Check for handling of the `false` return (pause/drain) on high-throughput SSE routes.
- **Client-side stream readers not cancelled on teardown**: An `EventSource` or fetch-stream reader not closed/cancelled when the owning component is destroyed, or not tied to the NgRx effect's cancellation (`switchMap`/`takeUntil`), continues consuming server resources after the UI has moved on.
- **Dispatching one NgRx action per streamed token**: The most expensive version of this pattern — dispatching an action for every individual token during an AI generation causes a reducer spread + selector recomputation + change-detection pass *per token*, which is effectively O(n²) state churn over a long generation. Buffer tokens with `bufferTime`/`auditTime` (or accumulate locally and dispatch on a coarser interval) before dispatching to the store. This is directly relevant to any AI-token-tracking or streaming-response work.

---

## Background Workers / Polling-Specific Issues
Applies to scheduled/polling services such as `scheduled-experience-launcher.service.ts`, `rendering-api/src/tasks/MetadataPollingTask.ts` + `MetadataPollingService.ts`, and worker processes under `ace/memory/workers/`.
- **Overlapping poll runs (reentrancy)**: An interval/cron tick that fires again before the previous run's async work has resolved runs two instances concurrently, which can double-process data or corrupt shared state. This is the actual common failure mode for polling services — the generic "clear your `setInterval`" check does not catch it. Look for a poll callback with no `isRunning`/in-flight guard.
- **Unbounded result sets fetched every tick**: A poll that queries "everything changed since last run" without a bound can, under a backlog, fetch and hold an ever-growing result set in memory each cycle.
- **Timers not cleared in shutdown/`onModuleDestroy` hooks**: A polling interval started in a service constructor or `onModuleInit` without a matching `clearInterval` in `onModuleDestroy` (or an equivalent shutdown hook) keeps polling after the module should have stopped, which is especially disruptive in tests where modules are repeatedly created and torn down.
- **Worker respawn without terminating the previous worker**: A worker-thread pool or long-running worker that gets recreated on error/restart without explicitly terminating the prior instance leaks the old worker's memory and any handles it held.

---

## Caching and Rate-Limiting-Specific Issues
Grounded in this repo's actual cache/rate-limit services: `valkey-cache.service.ts`, `skill-cache.service.ts`, `task-state-store.service.ts`, `rendering-api/src/utils/cache.ts`, `rendering-api/src/middleware/rate-limiter.ts`.
- **Cache-miss stampede**: N concurrent requests that all miss the same cache key simultaneously each independently recompute/re-fetch the expensive value instead of coalescing into a single in-flight computation. Look for cache-read code with no single-flight/in-flight-promise memoization guarding the miss path.
- **Cache entries written without a TTL**: An entry set via `valkey`/`skill-cache`/`task-state-store` with no expiry accumulates indefinitely if the corresponding delete/invalidate path is ever missed or racy.
- **In-memory `Map` used as a cache with no eviction path**: A class field `Map` used for caching that only ever grows (no `.delete()`, no max-size check, no LRU) is an unbounded cache regardless of whether a "real" cache service exists elsewhere in the file. Grep for `new Map<` as a class field in services, then check whether anything ever removes entries.
- **Per-client-IP rate-limiter state growing unbounded**: A rate limiter keyed by IP/user with no sweep/expiry for stale keys accumulates one entry per distinct client forever, particularly under traffic from a large or rotating IP pool.

---

## NestJS-Specific Issues

### Dependency Injection Scope Mismatches
- **Singleton service holding request-scoped state**: A `@Injectable()` service with default `Scope.DEFAULT` (singleton) that stores per-request data (e.g., user context, tenant ID, request-specific cache) causes data leakage across requests. All shared state in singletons must be read-only or per-call local.
- **`Scope.REQUEST` on high-traffic paths**: Request-scoped providers recreate the entire DI subtree on every request, including all transitive dependencies declared `REQUEST`-scoped. This causes high allocation pressure. Prefer `AsyncLocalStorage` or parameter passing for request context instead of `Scope.REQUEST` in hot paths.
- **Circular dependency resolved via `forwardRef`**: `forwardRef(() => SomeService)` defers resolution; if the cycle is deep, it delays startup and occasionally causes partial initialization. Look for more than 2 `forwardRef` calls in a module as a sign of architectural coupling.

### Interceptors, Guards, and Pipes
- **Interceptors that subscribe to `Observable` without completing**: An interceptor using `tap` or `map` on `next.handle()` that holds an open subscription (e.g., wrapping with a never-completing `Subject`) prevents the response stream from being garbage-collected. Ensure every interceptor returns the observable without side subscriptions that outlive the request.
- **Global guards making DB calls on every request**: `APP_GUARD` runs before every handler. A guard that calls the database to validate a session or permission on each request without caching is a guaranteed bottleneck. Look for DB/network calls in guard `canActivate` that lack in-memory caching.
- **Pipes transforming large arrays**: `ValidationPipe` with `transform: true` instantiates class-validator class instances for every array element. On endpoints receiving arrays of 1000+ objects, this creates significant GC pressure. Consider validation-only (`transform: false`) or manual partial validation for bulk endpoints.

### Module and Lifecycle
- **`OnModuleDestroy` not releasing resources**: Services that open DB connections, file handles, or background timers in `onModuleInit` without corresponding cleanup in `onModuleDestroy` will leak in test environments (where the module is torn down between tests) and in graceful-shutdown scenarios.
- **`imports` array containing the same module multiple times**: NestJS deduplicates global modules, but locally imported duplicates can cause multiple service instances and doubled memory usage for their internal state. Check `imports: [SomeModule, SomeModule]` patterns.
- **Heavy work in module constructors vs `onModuleInit`**: Synchronous expensive work done in a service constructor (large data pre-computation, config parsing) blocks the DI container during startup. Move to `onModuleInit()` so it is async and non-blocking.

### Streaming (SSE / Observables)
- **`Observable` returned from controller with no `takeUntil` on client disconnect**: If the client closes the SSE connection, the server-side Observable keeps emitting and processing unless the controller is backed by a `ReplaySubject` or uses `req.on('close', ...)` to complete the stream. Look for `createEffect` / `interval` Observables in SSE controllers without disconnect handling.

---

## Fastify-Specific Issues

### Schema and Serialization
- **Inline schema objects in route definitions**: Fastify compiles JSON Schema to fast-json-stringify serializers at registration time. If a schema object is defined inline as a new object literal on each `fastify.route()` call (e.g., inside a loop or factory), it is recompiled each time. Define schemas once and reference by `$id`.
- **Missing response schema on high-throughput routes**: Without a `schema.response` definition, Fastify falls back to `JSON.stringify`, which is 2–5× slower than the compiled serializer. Any route returning large payloads should have a response schema.
- **`ajv` keyword plugins added after schema compilation**: Adding custom AJV keywords (`addKeyword`) after schemas have already been compiled by Fastify causes silent fallback to full validation on subsequent requests. Always register plugins before `fastify.ready()`.

### Plugin and Hook Lifecycle
- **`fastify.register` plugins that capture `fastify` instance in closure**: Plugins registered with `fastify-plugin` (no encapsulation) that close over the parent `fastify` instance in a `setInterval` or `WeakRef`-less cache prevent GC of the entire server instance during tests. Use `onClose` hooks to clean up.
- **`onRequest` / `preHandler` hooks that `await` heavy operations without short-circuit**: Hooks run for every matched route. An `onRequest` hook that unconditionally awaits a Redis/DB call on every request — even for routes that don't need auth — adds latency to all routes. Use route-level `preHandler` arrays instead of global hooks for selective processing.
- **Not calling `reply.send()` or `reply.raw.end()` in error paths**: A Fastify handler that throws synchronously without calling `reply.send()` will close the connection, but the request object and any attached context remain alive until the GC cycle. Always ensure `reply.send()` or error propagation is explicit.

### Connection and Keep-Alive
- **Disabling `keepAliveTimeout` below upstream proxy timeout**: If a load balancer has a 60s keep-alive and Fastify's `keepAliveTimeout` is lower (default 5s), the proxy reuses connections that Fastify has already closed, causing `ECONNRESET`. Set `keepAliveTimeout` slightly above the LB's value.
- **Unbounded connection concurrency without `connectionTimeout`**: Without `connectionTimeout`, slow clients that open connections and never send headers will hold the socket open indefinitely. Each open socket holds a file descriptor; on low-FD-limit environments this causes `EMFILE` errors.

### Pino Logging
- **`logger.info(largeObject)` in hot paths**: Pino serializes the full object even if the log level is filtered downstream. Use `logger.child({ context })` to bind static fields and pass only variable data inline. Avoid logging full request bodies or large arrays at `info` level in production.
- **Synchronous Pino transport in production**: `pino-pretty` (synchronous transport) in production serializes synchronously on the main thread. It should only be used in development. Production should use async transports or `pino/file`.

---

## Angular-Specific Issues

### Change Detection
- **`ChangeDetectionStrategy.Default` on frequently-updated components**: Default components re-check on every change detection cycle triggered anywhere in the app. Components that display data from store selectors or inputs that change rarely should use `OnPush`. Look for data-display components without `OnPush` that receive Observable inputs.
- **`async` pipe vs manual subscription in `OnPush` components**: A manual `.subscribe()` in the component body (instead of the `async` pipe) does not automatically mark the `OnPush` component for check. Changes arrive in the store but the view doesn't update, causing developers to add `cdr.markForCheck()` calls in every subscriber — or worse, switch back to `Default`.
- **Zone-polluting third-party libraries**: Libraries that patch `setTimeout`, `XHR`, or `fetch` outside Angular's explicit zone setup (e.g., some D3 / chart libs, Mapbox, Monaco) trigger change detection on every timer/request tick. Look for libraries called directly in component methods without `ngZone.runOutsideAngular()`.
- **`ngOnChanges` doing expensive computation directly**: If a component receives a rapidly-changing `@Input`, any synchronous computation in `ngOnChanges` (sorting, filtering, calculating derived values) runs synchronously on every emission. Store the derived result in a plain field assigned inside `ngOnChanges`, or expose it via a store selector and the `async` pipe.
- **`trackBy` missing on `*ngFor` over large lists**: Without `trackBy`, Angular destroys and recreates every DOM element in the list on any reference change. On lists of 100+ items this causes significant DOM churn and layout reflow.
- **Template bindings to expensive getters**: A getter bound in a template (`{{ myGetter }}`, `[input]="myGetter"`, `*ngIf="myGetter"`) is called on **every change detection cycle** — potentially dozens of times per second. Getters that filter arrays, sort, compute derived objects, or access deeply nested properties must not be bound directly in templates. The fix is to compute the value once in `ngOnInit` / `ngOnChanges` and store it in a plain field, or expose it as an `async` pipe from a store selector. Identify these by looking for `get` accessors in the component class whose names appear in the template.

### Memory Leaks in Components
- **Subscriptions not cleaned up on destroy**: In this repo, cleanup goes through `ComponentBase` via one of two sanctioned patterns — `takeUntil(this.unsubscribeStream)` (used in `ngOnInit` and other lifecycle hooks) or `this.observableSubTeardowns.push(...)` (used in `subscribeToVariations()`). Both are correctly cleaned up in `ComponentBase.ngOnDestroy()` — do **not** flag either as a leak. Flag any `.subscribe(` in a component that uses **neither** pattern and isn't backed by the `async` pipe: grep for `\.subscribe\(` in changed component files, then check each hit against these two patterns before reporting it.
- **`interval` / `timer` without cleanup**: Observable intervals created in `ngOnInit` that poll for data or animate elements — without `takeUntil(this.unsubscribeStream)` or an `observableSubTeardowns` entry — continue running after route navigation away from the component.
- **Event listeners added via `renderer.listen()` without cleanup**: `Renderer2.listen()` returns a cleanup function that must be called in `ngOnDestroy`. Uncalled cleanup functions keep the listener and its closure alive.
- **`HostListener` on `window` or `document`**: `@HostListener('window:scroll', ...)` or `@HostListener('document:click', ...)` adds a DOM event listener that is tied to the component's lifetime. When many component instances are created/destroyed (e.g., in a list), brief lifecycle without proper cleanup accumulates listeners.
- **`window.addEventListener('message', ...)` without a matching removal**: CMS iframe integration (`window.top.NG_REF`, postMessage) is a core pattern in this app. A raw `addEventListener('message', handler)` in a component or service without `removeEventListener` in `ngOnDestroy` leaks the handler and its closure every time the toolbar/component is instantiated — this is a more common real-world leak here than the generic `HostListener` case above. Grep: `addEventListener\('message'` without a corresponding `removeEventListener` call in the same class.
- **`shareReplay` without `refCount: true`**: `shareReplay(1)` alone keeps the source subscription alive forever once at least one subscriber has connected, even after all subscribers unsubscribe — the classic Angular service-level leak. Use `shareReplay({ bufferSize: 1, refCount: true })` unless the stream is intentionally meant to outlive all subscribers. Look for `shareReplay(1)` on HTTP or store-derived streams in singleton services.
- **`BehaviorSubject` / `ReplaySubject` in singleton services retaining large payloads**: A service-level subject caching the last API response keeps that object alive for the app's lifetime. Check buffer sizes and whether stale data is ever cleared.

### Bundle and Load Performance
- **Eagerly imported feature modules that could be lazy-loaded**: Any module imported directly in `AppModule.imports` that is only needed after user interaction (dashboards, editors, dialogs) should be lazy-loaded via `loadChildren`. Each eagerly imported module adds to the initial bundle.
- **Large `@NgModule` `declarations` arrays without lazy loading**: A feature module declaring 50+ components that all get eagerly loaded increases parse and compile time on app startup proportionally.
- **Unoptimized images via `<img src="...">` without `NgOptimizedImage`**: Direct `<img>` tags without `NgOptimizedImage` miss LCP hints, lazy loading, and automatic `srcset` generation.

---

## NgRx-Specific Issues

### Selector Memoization and Recomputation
- **Selectors composed from non-memoized inline functions**: A selector created with `createSelector` where a projector function creates a new object literal or array on every call (`(state) => ({ ...state.foo })`) breaks memoization — it always returns a new reference even when data is unchanged, causing subscribers to re-render.
- **Selectors with `combineLatest`-like behavior via multiple `withLatestFrom`**: Chaining multiple `withLatestFrom` inside effects instead of using a single combined selector means the effect re-evaluates independently for each selector emission. Define a compound selector and use a single `withLatestFrom`.
- **Parameterized selectors called with new factory arguments on each render**: `createSelector` factories called as `selectById(id)` inside a component template (`{{ store.select(selectById(id)) | async }}`) create a new selector instance on every change detection cycle, bypassing memoization entirely. Create the selector once in `ngOnInit` and store it.
- **Deeply nested state slices selected at the leaf level without intermediate selectors**: Selecting `state.featureA.subB.subC.value` directly in 20 different selectors means each one traverses the full path independently. Intermediate selectors (one for `subB`, composing into `value`) prevent redundant traversal and improve reuse.

### Effect Subscriptions and Action Storms
- **Effects using `mergeMap` where `switchMap` / `exhaustMap` is correct**: `mergeMap` creates a new inner observable for every dispatched action. On a "load" action that can be dispatched rapidly (e.g., triggered by route params or user typing), this races multiple in-flight requests. Use `switchMap` (cancel previous) for loads, `exhaustMap` (ignore new while running) for saves/submits.
- **Infinite action dispatch loops**: An effect that listens to `ActionA` and dispatches `ActionB`, where a reducer handling `ActionB` modifies state that triggers `ActionA` again. Check for effects where the output action type is transitively reachable from a reducer that feeds the input selector.
- **Effects dispatching on every store selector emission via `withLatestFrom`**: `withLatestFrom` reads a selector value for context — but if the effect also `ofType`s an action dispatched in a high-frequency path (e.g., every keystroke), the combination creates a request per keystroke. Use `debounceTime` or `distinctUntilChanged` before the effect's main operator.
- **`combineLatest` over many high-frequency sources without debouncing**: `combineLatest` emits once per source emission, so combining several fast-changing streams produces N intermediate emissions (glitches) that each trigger a change-detection pass or effect execution. Add `debounceTime(0)` or `auditTime` when combining sources that don't need per-tick precision.
- **`dispatch: false` effects that still subscribe to expensive observables**: Even non-dispatching effects (`{ dispatch: false }`) keep their inner observable alive for the lifetime of the injectable. A `dispatch: false` effect that polls an API with `interval` without a `takeUntil` or `switchMap` tied to a "stop" action leaks indefinitely.

### Store Shape and State Growth
- **Unbounded array growth in state slices**: State slices that `push` to arrays (conversation history, log entries, notifications) without a max-length trim in the reducer grow without bound and slow selector projectors that map over them. Look for `[...state.items, newItem]` without a corresponding trim or eviction.
- **Storing derived or computed values in state**: State that stores values which are purely derived from other state fields (e.g., `filteredList` computed from `list + filterCriteria`) duplicates data and requires keeping it in sync via additional actions. These should be selectors, not state fields.
- **Large objects stored in state that contain non-serializable values**: NgRx requires serializable state for devtools and time-travel. Storing `Date` objects, class instances with methods, `Observable` references, or DOM nodes in state causes devtools to fail and prevents SSR hydration.
- **`resetState` / `clearAll` actions not clearing all sub-slices**: When a user logs out or navigates away, if some nested slices are not reset, they hold stale references to prior-user data in memory. Check that logout/reset effects dispatch a reset action handled by every feature reducer.

### Subscription Management in Effects
- **Effects that inject services with `interval` or persistent polling inside `switchMap`**: A `switchMap` that starts an `interval` polling loop inside the inner observable will cancel the previous interval correctly — but only if the outer action fires again. If the action is a one-time setup action, `switchMap` provides no cancellation, and subsequent navigations away don't stop the poll. Use `takeUntil(this.actions$.pipe(ofType(stopAction)))` inside the inner observable.
