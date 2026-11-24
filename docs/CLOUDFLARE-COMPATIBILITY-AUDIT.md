# Cloudflare Compatibility Audit — REI System CBT

Audit date: 2026-11-24
Target branch: `cloudflare-migration`
Production impact: none

## Repository and hosting decision

- GitHub repository is now confirmed **Private**.
- The default branch remains `main`.
- Migration work is isolated in `cloudflare-migration`.
- Target platform: Cloudflare Workers + D1 + R2.
- Existing production hostname: `reitraining.click`.

## Current application stack

- Next.js 16.4.5
- React / React DOM 19.3.1
- TypeScript 5.9.3
- MySQL driver: `mysql2/promise`
- MySQL database: `db_cbt_rei`
- Session/JWT library: `jose`
- Excel export: `exceljs`
- Existing password library dependency: `bcryptjs`

## Database schema inventory

The schema-only MySQL dump at `database/schema.sql` is 61,096 characters and contains:

- 58 `CREATE TABLE` definitions.
- 18 declared foreign-key constraints.
- 24 ENUM columns that must become SQLite-compatible CHECK constraints or validated text fields.
- 28 table definitions with MySQL `ON UPDATE CURRENT_TIMESTAMP` behavior.
- Data types requiring conversion include BIGINT, INT, TINYINT, DECIMAL, VARCHAR, TEXT, DATETIME, TIMESTAMP, DATE, TIME, JSON, and ENUM.
- The dump includes MySQL-only database selection, charset/collation clauses, engine clauses, AUTO_INCREMENT values, and DROP TABLE statements. These must not be copied into D1 migrations as-is.

The 58 tables cover admin accounts and activity, participants, exams/questions/answers, scores, access tokens, training material/video progress, trainer evaluations, OJT assessments and reviews, 3/5-month reviews, WhatsApp OTP sessions, and related supporting tables.

Important: `database/schema.sql` is schema-only. It is not the full live production data backup.

## SQL and application compatibility findings

### 1. Database API

- `src/lib/db.ts` creates a global MySQL connection pool with `mysql2/promise`.
- The application uses `db.execute` throughout server components, actions, and route handlers.
- At least 10 files use `db.getConnection()` and explicit transaction methods.
- The D1 port must replace the driver and adapt the calling API; it cannot be a connection-string change.
- MySQL parameter placeholders are mostly `?`, but query results and insert IDs currently use mysql2 tuple/result shapes.

### 2. MySQL-specific SQL to port

The source search found uses of:

- `REGEXP_SUBSTR`
- `GROUP_CONCAT`
- `FIELD`
- `information_schema.tables`
- `information_schema.COLUMNS`
- `DATABASE()`
- `VERSION()`
- `NOW()`
- `ON UPDATE CURRENT_TIMESTAMP`
- Dynamic `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE` operations

These require SQLite equivalents, application-side logic, or versioned D1 migrations. In particular, runtime schema creation and ALTER operations must be removed from normal request paths and represented as explicit migrations.

### 3. Files and object storage

Local filesystem dependencies found include:

- Question image storage in `src/lib/question-image.ts`.
- Participant answer uploads in `src/app/api/cbt/route.ts`.
- File streaming and byte-range handling in `src/app/uploads/[...path]/route.ts`.
- Video directory scanning/fallback in `src/app/api/video-progress/route.ts`.

Workers local filesystem is not persistent application storage. R2 is the target for uploaded questions, answer attachments, training materials, and other persistent user files. Video delivery needs a separate review for range requests and large media.

### 4. Runtime compatibility

- 17 route files currently declare `runtime = "nodejs"`.
- Node built-ins include `node:crypto`, `node:fs`, `node:fs/promises`, `node:path`, and `node:stream`.
- `exceljs` is used for spreadsheet exports and needs a real Workers preview test.
- Current `next.config.ts` lists `mysql2` and `exceljs` as server external packages.
- The project uses App Router, route handlers, Server Actions, cookies, and streaming/file responses.

Cloudflare currently documents OpenNext as the maintenance path for existing Next.js applications, while recommending vinext for new projects. For this existing application, OpenNext is the conservative initial compatibility target; evaluate vinext only after feature-parity tests.

## Security findings requiring remediation before production

1. `src/app/login/actions.ts` compares the supplied password directly to the stored `admins.password` value. Do not expose the migrated app publicly until password hashes are in place.
2. The admin session uses `SESSION_SECRET`; configure it as a Cloudflare secret, never as a committed variable.
3. The employee authentication routes and any OTP flows need separate security review.
4. Existing file routes and uploads must preserve authorization and content-type validation after moving to R2.
5. Verify that no real `.env`, database dump, private key, or participant data exists in Git history. The current `.gitignore` excludes common env files and `uploads/*`, but ignore rules do not remove secrets previously committed.

## Windows-specific deployment assumptions

- `postinstall` runs `scripts/setup-backup.cjs`.
- Backup scripts invoke Windows PowerShell and Task Scheduler.
- These are not appropriate for Workers deployment. Remove this behavior from the Cloudflare install/deploy path and design backups around Cloudflare-supported export/snapshot procedures.

## Recommended technical path

1. Keep the existing application behavior and schema documented as the compatibility baseline.
2. Build a D1 schema migration with explicit SQLite DDL and constraints; do not mechanically execute the MySQL dump.
3. Add a typed D1 adapter and port a small, low-risk module first.
4. Replace local file writes and reads with R2 operations.
5. Port SQL constructs and dynamic DDL into versioned migrations.
6. Test OpenNext preview with Workers runtime, including ExcelJS, cookies, JWT, Server Actions, file streaming, and R2.
7. Import a copy of the full backup into a fresh staging D1 database and compare table counts, key relationships, and representative business flows.
8. Cut over DNS only after owner acceptance and a fresh verified MySQL backup.

## Explicitly not done

- No changes to `main`.
- No changes to the live MySQL database.
- No production data imported or deleted.
- No Cloudflare Worker deployed.
- No D1 or R2 production resource created.
- No passwords or secrets changed.
