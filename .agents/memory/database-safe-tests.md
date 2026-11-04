---
name: Database-safe tests
description: Prevent test suites from using the configured MongoDB database.
---

Token-registry tests use MongoDB whenever `MONGO_URL`, `MONGO_PUBLIC_URL`, or `MONGODB_URI` is present; their JSON file cleanup does not isolate Mongo-backed writes.

**Why:** Running tests in an environment with production secrets can create or change records in the connected database.

**How to apply:** Keep database URI variables unset and set `NODE_ENV=test` for test runs. Never run the token-registry suite against a live database.
