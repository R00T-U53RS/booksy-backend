# Testing Strategy

This document describes how we intend to test **Booksy Backend**, with emphasis on **bookmark sync** and **change tracking**. Use it as the single reference when adding tests, CI, or local database setup for integration tests.

---

## Table of Contents

1. [Goals](#goals)
2. [What We Are Not Optimizing For](#what-we-are-not-optimizing-for)
3. [Layers: Unit vs Integration](#layers-unit-vs-integration)
4. [How Nest Fits In](#how-nest-fits-in)
5. [Frontend Payloads and DTOs](#frontend-payloads-and-dtos)
6. [Scope: Bookmark, Sync, and Change History](#scope-bookmark-sync-and-change-history)
7. [Repository and Folder Structure](#repository-and-folder-structure)
8. [Databases: Local vs GitHub Actions](#databases-local-vs-github-actions)
9. [Pre-Commit Hooks vs CI](#pre-commit-hooks-vs-ci)
10. [Checklist Before Adding a New Test](#checklist-before-adding-a-new-test)
11. [What Is Implemented in This Repository](#what-is-implemented-in-this-repository)

---

## Goals

- Catch regressions in **sync** and **change tracking** when refactoring or using generated code, without relying on manual checks only.
- Exercise **real persistence** (TypeORM + PostgreSQL) for flows where mocks hide bugs (transactions, queries, cascades, constraints).
- Keep contracts honest: bodies that match what the **frontend** sends, validated the same way as production (**DTOs** + `ValidationPipe` when we test at the HTTP boundary).
- Prefer **fast feedback in CI** and **predictable** local runs (documented env and database).

---

## What We Are Not Optimizing For

- **Browser end-to-end tests** (Playwright, Cypress, etc.) for this backend repo. The client and extension are tested elsewhere.
- Running **full integration tests on every local commit** if they require Docker or a running Postgres instance, unless the team explicitly accepts that cost.

---

## Layers: Unit vs Integration

| Layer           | What it tests                                     | Dependencies               | Best for                                                                            |
| --------------- | ------------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------- |
| **Unit**        | Pure functions and small classes in isolation     | Mocked repositories, no DB | `FieldDiffService`-style logic, edge cases (null vs empty, nested fields)           |
| **Integration** | Nest `TestingModule`, real TypeORM, real Postgres | Test database              | **Sync**, **processor**, **change logs**, **history queries** — the main safety net |

**Recommendation:** Invest most effort in **integration tests** for sync and change tracking. Add **unit tests** only where logic is pure and easy to get wrong without a database.

Optional **API-level integration** (HTTP via Supertest): same JSON as the client; runs **ValidationPipe** + controller + service. Not mandatory for every scenario if we validate DTOs with `class-transformer` / `class-validator` in the test and then call services directly.

---

## How Nest Fits In

- **Jest** is the usual test runner for NestJS (CLI and docs assume it).
- **`@nestjs/testing`** builds a Nest application context the same way as production (`Test.createTestingModule`, optional `INestApplication` for HTTP).
- **Supertest** (optional) sends HTTP requests to `INestApplication` in process — no browser; often placed in `test/*.e2e-spec.ts` in Nest samples, but here we treat those as **API integration** tests if we add them.

**Authentication in tests:** `JwtGuard` must be overridden or replaced with a stub that injects a fixed test user, otherwise protected routes return 401 in tests.

---

## Frontend Payloads and DTOs

**Workflow that works well:**

1. Copy the **request body** from the browser DevTools Network tab (exact JSON the frontend sends).
2. Save it under `test/fixtures/...` as `.json` files (one file per scenario or variant).
3. In tests: `JSON.parse(readFileSync(...))` and either:
   - **HTTP:** `request(app).post('/profiles/:id/bookmarks/sync').send(payload)` — full pipeline, or
   - **Service:** `plainToInstance(SyncBookmarkItemDto, item)` (for nested arrays, validate each level as needed), run `validate` / `validateSync`, then call `BookmarkService.sync` / orchestrator — same rules as a successful request without HTTP overhead.

**What DTOs do (mental model):**

- They **validate** shape and types; they do not invent business data.
- **`class-transformer`** may coerce types (e.g. plain object to nested DTO instances).
- **Global `ValidationPipe` options** (e.g. `whitelist`) may **strip** unknown properties. Testing through HTTP or mirroring the same validation in tests keeps expectations aligned with production.

---

## Scope: Bookmark, Sync, and Change History

High-value scenarios to cover over time (not all at once):

| Area                                           | Suggested assertions                                                                                                                                                               |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`POST /profiles/:profileId/bookmarks/sync`** | Body: array of `SyncBookmarkItemDto` (including nested `children`). Counters `{ updated, created, deleted }`. Rows in `bookmarks` match expected tree/order/parent links.          |
| **Change tracking**                            | Rows in `BookmarkChangeLog` for creates, updates, deletes; expected `changeType`, `source`, `fieldChanges` / snapshots where important; **`syncBatchId`** grouping per sync batch. |
| **History APIs**                               | `GET .../history/recent` and `GET .../history/batches` return data consistent with stored logs (totals, limits, batch grouping).                                                   |
| **Edge cases**                                 | Empty sync, idempotent re-sync, moves between parents, deletes — driven by additional fixture files.                                                                               |

Reference implementation paths: `BookmarkService` → `BookmarkSyncService` (orchestrator) → `BookmarkProcessor`; `BookmarkChangeTracker`; `BookmarkHistoryService`.

---

## Repository and Folder Structure

Current layout:

```text
test/
  constants/
    bookmark-sync-history.constants.ts
  fixtures/
    *.json                    (sync scenarios; paths passed to loadSyncFixtureFile as e.g. single-bookmark-under-root.json)
  integration/
    bookmark-sync/
      mutations.integration.spec.ts
      history.integration.spec.ts
  assertions/
    single-bookmark-under-root.ts
    bookmark-sync-*.ts
  helpers/
    assert-found.ts
    assert-stable-after-identical-resync.ts
    bookmark-integration-repos.ts
    clear-bookmark-sync-tables.ts
    clear-test-tables.ts
    create-bookmark-integration-module.ts
    load-sync-fixture.ts
    seed-second-test-user.ts
    seed-test-user-profile.ts
    setup-bookmark-integration.ts
  setup/
    jest.setup.ts
  env.test.example
jest.config.cjs
tsconfig.spec.json
```

Colocating under `src/bookmark/__tests__/` is an alternative if we prefer feature-local tests.

---

## Databases: Local vs GitHub Actions

### Local

- Run **PostgreSQL** yourself: Docker, Docker Compose, or a local install.
- Use a **dedicated database name** for tests (for example `booksy_test`) so integration tests never wipe development data.
- Connection settings should match what the app expects. This project reads database settings from config (see `src/config/database.config.ts`), typically via env vars such as:
  - `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`, `DB_SYNC`
- **Schema:** Either run migrations against the test database before tests, or use `DB_SYNC=true` **only** in test/local with care — document the chosen approach and keep production unsafe options out of production config.

### GitHub Actions

- GitHub does **not** provide a managed Postgres instance for your repository.
- Standard approach: define a **service container** in the workflow YAML using the official **`postgres`** Docker image. Each job gets a **fresh** database; it is destroyed when the job ends.
- The workflow sets `POSTGRES_*` (or equivalent) and maps port **5432**. Test steps set the same `DB_*` (or `DATABASE_URL`) env vars the app uses so `npm test` connects to that container.
- Use a **health check** (`pg_isready`) so tests start only after Postgres accepts connections.

Example pattern (illustrative — adjust env names to match `getDatabaseConfig` / `env.validation`):

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: booksy_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm ci
      - run: npm run test
        env:
          DB_HOST: localhost
          DB_PORT: 5432
          DB_USERNAME: test
          DB_PASSWORD: test
          DB_DATABASE: booksy_test
          DB_SYNC: 'true'
          JWT_SECRET: test-jwt-secret
          JWT_EXPIRES_IN: 7d
```

Do not rely on `NODE_ENV=test` in the workflow for **ConfigModule** validation: this app’s `validate()` only allows `local`, `staging`, and `production`. Jest sets `NODE_ENV=test` by default; `test/setup/jest.setup.ts` sets `NODE_ENV=local` before Nest boots so integration tests pass the same rules as the app.

**Same test command locally and in CI**; only **host and credentials** change through environment variables.

Integration Jest config uses **`maxWorkers: 1`** so multiple `*.integration.spec.ts` files do not run in parallel against the same database (parallel workers would interleave `DELETE`/`INSERT` and cause flaky foreign-key failures).

---

## Pre-Commit Hooks vs CI

| Mechanism               | Suitable for                                | Notes                                                                                                 |
| ----------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Pre-commit (Husky)**  | Fast checks: `type-check`, ESLint, Prettier | Keeps commits cheap; avoid long-running integration tests here unless everyone runs Postgres locally. |
| **GitHub Actions**      | `npm test` with Postgres service, build     | Primary gate for **integration tests** on every PR.                                                   |
| **Pre-push** (optional) | Full test suite                             | Can duplicate CI; may be slow or flaky if DB is not running.                                          |

**Practical split:**

- **Pre-commit:** typecheck + lint (+ format). Optionally **only** very fast unit tests with a narrow `testPathPattern` if we add them.
- **CI:** full integration test suite against Postgres.

---

## Checklist Before Adding a New Test

1. **Fixture:** Is the JSON copied from a real client request or built to match the DTO exactly?
2. **Database:** Is the test using the **test** database name and cleaning up or using transactions where appropriate?
3. **Auth:** Is `JwtGuard` overridden or the route tested through a module that supplies a test user?
4. **Assertions:** Do we assert **DB state** (bookmarks + change logs) and not only HTTP status?
5. **CI:** Does the workflow export the same env vars the test run needs?

---

## What Is Implemented in This Repository

- **Commands:** `npm test` (integration suite), `npm run test:watch`.
- **Config:** `jest.config.cjs` runs `test/**/*.integration.spec.ts` with `ts-jest`, `tsconfig.spec.json`, and **`maxWorkers: 1`** so integration suites do not race on one database.
- **Env loading:** `test/setup/jest.setup.ts` loads `.env.test` if present, otherwise falls back to `.env`. It then sets `NODE_ENV=local` so `src/config/env.validation.ts` succeeds under Jest. Copy `test/env.test.example` to the project root as `.env.test` when you want a dedicated test database.
- **Integration tests:** `test/integration/bookmark-sync/*.integration.spec.ts` (mutations vs history) share `integration-lifecycle.ts` for Nest bootstrap/teardown; **`test/assertions/`** holds scenario helpers; **`test/helpers/`** holds setup, repos, and idempotent re-sync helpers; **`test/fixtures/`** holds JSON trees referenced by filename (e.g. `single-bookmark-under-root.json`).
- **Scenario:** seeds `User` + `Profile`, runs `BookmarkService.sync` with a fixture path, asserts bookmark rows and `BookmarkChangeLog` (`CREATED`, `SYNC`).
- **SQL logging:** `getDatabaseConfig` disables TypeORM query logging when `JEST_WORKER_ID` is set so Jest output stays readable while keeping verbose SQL in normal `NODE_ENV=local` runs.

---

## Related Documents

- [Change Tracking Integration Guide](./CHANGE_TRACKING_INTEGRATION_GUIDE.md) — API behavior and client integration
- [Bookmark Sync Explanation](./BOOKMARK_SYNC_EXPLANATION.md) — sync behavior (if present)
- [Roadmap](./ROADMAP.md) — product direction

---

_Last updated: April 2026._
