# Local Postgres (Docker)

## Start

From this directory:

```bash
docker compose up -d
```

Default credentials and main app DB match `.env.example` (`booksyDB`).

## Test database (`booksy_test`)

Integration tests use `DB_DATABASE=booksy_test` in `.env.test`. That is a **separate** database name; Postgres does not create it automatically unless you use the init script below on a **fresh** volume.

### If you already have a running container (existing volume)

The init scripts under `init/` only run the **first** time the data volume is created. Create the test DB once:

```bash
docker exec -it postgres psql -U postgres -c "CREATE DATABASE booksy_test;"
```

If it already exists, Postgres will report an error; that is safe to ignore.

### New clone or after wiping the volume

`docker-compose.yml` mounts `init/` into `docker-entrypoint-initdb.d`, so a **new** volume gets `booksy_test` automatically when the container initializes.

To wipe and recreate (destroys all local DB data):

```bash
docker compose down -v
docker compose up -d
```

## Verify

```bash
docker exec -it postgres psql -U postgres -c "\l"
```

You should see both `booksydb` (or `booksyDB` — Postgres folds unquoted names to lower case unless quoted) and `booksy_test` depending on how they were created.
