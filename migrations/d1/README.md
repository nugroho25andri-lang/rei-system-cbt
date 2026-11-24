# D1 migrations

This folder is reserved for versioned Cloudflare D1 (SQLite) migrations.

Rules:
- Each migration must be forward-only and numbered, for example `0001_initial_schema.sql`.
- Never copy the MySQL dump directly into this folder.
- Do not include `DROP TABLE` statements in the initial migration.
- Preserve IDs and foreign-key relationships where possible.
- Convert MySQL ENUM columns to TEXT with explicit CHECK constraints.
- Replace MySQL `ON UPDATE CURRENT_TIMESTAMP` with explicit application updates or carefully tested SQLite triggers.
- Move all runtime CREATE TABLE / ALTER TABLE operations into migrations.
- Validate every migration against a fresh local D1 database before applying it to remote staging.
- Production D1 must not be created or modified until staging validation and backup verification are complete.

The first migration is intentionally not generated yet. The MySQL schema requires reviewed SQLite conversion; a mechanical text replacement could silently change constraints, timestamps, indexes, and data semantics.
