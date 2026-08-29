# AI Pitfall Review — Extended Checks (Sections 5–12)

Disclosed reference for `SKILL.md`. Run only the sections below relevant to the code surface being audited — skip any with no surface area. Report findings using the format and severity levels defined in `SKILL.md`.

### 5. Inconsistent Naming Conventions

Context drift causes AI to mix naming styles, especially across files or in long sessions.

**Detect:**
- camelCase / snake_case / PascalCase mixing within a single file or across related files
- Method names that don't follow the project's verb convention (`get` vs `fetch` vs `load` vs `retrieve` for the same operation type)
- Boolean variable names without the `is/has/can/should` prefix where the codebase uses that pattern consistently
- File names that don't follow the `kebab-case.component.ts` / `PascalCase.ts` convention established elsewhere
- Observable stream variables missing the `$` suffix where the project convention requires it
- Private field names missing the `_` prefix where the project convention requires it

---

### 6. Unnecessary Boilerplate & Verbose Code

AI over-explains, over-annotates, and over-wraps.

**Detect:**
- Comments that restate what the code already clearly says (`// increment counter`, `// call the service`)
- Multi-line implementations of operations expressible in one line
- Explicit type annotations where TypeScript inference is sufficient and the inferred type is obvious
- Unnecessary `async/await` wrapping around non-async operations
- `try/catch` blocks that catch, log, and immediately re-throw without adding any context
- Logging statements in every method entry/exit with no diagnostic value
- Return-type annotations on trivial arrow functions where inference is unambiguous

---

### 7. Scope Creep & Unauthorized Changes

AI makes "improvements" outside the requested scope. This is a systematic behaviour, not an accident.

**Detect:**
- Modifications to files not mentioned in the task or diff scope
- Refactoring of adjacent code that was not part of the requirement
- Renamed variables, reordered imports, or reformatted blocks in unchanged code sections
- Added features, optional parameters, or configuration knobs not present in the requirements
- Changed test assertions beyond fixing the failing test
- Deleted or commented-out code not covered by the task scope (flag unless AI created it in this session)

---

### 8. Improper Error Handling

AI frequently swallows errors, over-catches, or handles errors inconsistently with the project's pattern.

**Detect:**
- Empty catch blocks: `catch (e) {}` or `catch { }` with no logging, re-throw, or user-facing message
- Catch-all exception handlers (`catch (e: any)`) where specific error types should be handled differently
- Async functions with `await` calls and no `try/catch` or error propagation to caller
- `Promise.all()` without handling partial failures (one rejection immediately rejects the whole batch, discarding any already-succeeded results)
- Error objects converted to strings with `.toString()` or `'' + e` instead of preserving the original error
- Errors logged at the wrong severity level (debug for user-facing failures, error for expected validation noise)
- NgRx effects: `catchError` missing or placed on the outer pipe (the effect stream dies permanently after the first error), or inner `catchError(() => EMPTY)` swallowing a failure with no dispatched error action or user-facing feedback
- Stack traces or raw exception messages returned to clients in production responses

---

### 9. Security Anti-Patterns from Training Data

AI reproduces insecure patterns common in public repositories. These reflect systematic training data bias, not random mistakes.

**Detect:**
- **Hardcoded secrets**: API keys, passwords, tokens, connection strings embedded directly in source files or test fixtures
- **Missing input validation**: user-supplied values used directly in queries, file paths, shell commands, or template strings without sanitisation
- **SQL / NoSQL injection**: raw string interpolation into query strings instead of parameterised queries
- **Command injection**: `exec()`/`execSync()` with user-controlled string interpolation; `eval()`, `new Function()`
- **Path traversal**: `fs.*` or `path.join` calls where any segment originates from user input without `path.resolve` + prefix check
- **Insecure randomness**: `Math.random()` used for security-sensitive values (tokens, session IDs, nonces) instead of `crypto.randomBytes`
- **Broad CORS**: `origin: '*'` or `Access-Control-Allow-Origin: *` on authenticated endpoints
- **Sensitive data in logs**: passwords, tokens, PII, or partial secrets appearing in `console.log` / `Logger` calls

---

### 10. Magic Numbers & Unexplained Hardcoded Values

AI generates working code with literals that are opaque to future maintainers.

**Detect:**
- Numeric literals in logic conditions with no named constant (e.g., `if (retries > 3)`, `timeout: 5000`)
- Hardcoded string literals that belong in a configuration file, enum, or constants module
- Date/time values hardcoded as raw millisecond counts without explanation
- Array indices used to access specific positional elements without a named constant or comment
- Repeated identical literal values across the file that could be a single named constant

---

### 11. Simulated Success & Hollow Assertions

AI claims correctness without verifying it. This manifests as stubs that look complete but aren't.

**Detect:**
- Test assertions checking only `toBeDefined()` or `toBeTruthy()` instead of specific expected values
- `expect(result).not.toThrow()` as the sole assertion (passes even if the function does nothing)
- Functions returning a hardcoded success value instead of computing it (`return { success: true }` with no logic)
- `TODO` / `FIXME` stubs left in code paths being reviewed as complete
- Mock implementations returning static fixtures in paths that should exercise real logic
- Tests disabled (`.skip`, `xit`, `xdescribe`), deleted, or commented out to make a failing suite pass
- `console.log` statements in place of actual return values or side effects in supposedly complete implementations
- Type assertions (`as SomeType`) applied to values never validated to actually be of that type

---

### 12. Context Drift & Plan Non-Compliance

In long sessions, AI forgets earlier decisions and diverges from the agreed architecture. Scope: divergence from written decisions — CLAUDE.md, docs, or the task plan (see section 4 for divergence from patterns visible only in surrounding code).

**Detect:**
- Implementation that contradicts documented decisions in `CLAUDE.md`, `documentation/`, or the task description
- Different architectural approaches in new files vs. the established pattern in existing files (e.g., constructor injection vs. `inject()` in this project)
- Store feature keys that don't match the exact string constants defined in the project (silent runtime bugs)
- New files placed in the wrong directory relative to the project's module structure
- API response shapes that don't match the OpenAPI spec or existing DTO definitions
- Missing required calls established by project rules (e.g., `applyEditFormState` in 3 places per `CLAUDE.md`)
