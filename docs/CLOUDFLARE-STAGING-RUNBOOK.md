# Cloudflare Staging Setup — Operator Runbook

This runbook prepares the local working copy for a non-production Cloudflare staging migration. It does not deploy or touch production.

## Current decisions

- Repository: Private
- Source branch: main (unchanged)
- Migration branch: cloudflare-migration
- Runtime: Cloudflare Workers via OpenNext for this existing Next.js app
- Database: Cloudflare D1 (staging first)
- File storage: Cloudflare R2 (staging first)
- Production hostname: reitraining.click (do not attach until cutover approval)

## Step 1 — Verify local Git working tree

From PowerShell:

```powershell
$Project = "C:\laragon\www\rei-system-cbt"
Set-Location $Project
git status --short
git branch --show-current
git fetch origin
git branch -a --list "*cloudflare-migration*"
```

If `git status --short` is not empty, stop and save/commit your local work before switching branches. Do not discard changes.

Then, only if the working tree is clean:

```powershell
git switch cloudflare-migration
git pull origin cloudflare-migration
git status --short
```

## Step 2 — Confirm Cloudflare CLI login

```powershell
npx wrangler whoami
```

If not authenticated, run `npx wrangler login` and complete the browser authorization using the intended Raja Emas Cloudflare account. Do not share API tokens in chat or commit them.

## Step 3 — Create staging resources

Use unique staging-only resources:
- D1 database name: `rei-system-cbt-staging`
- R2 application bucket: `rei-system-cbt-uploads-staging`

Create them from the Cloudflare dashboard or Wrangler only after confirming the correct account. Record the D1 database ID from Wrangler output. Do not reuse or connect the live MySQL database.

## Step 4 — Install the supported adapter locally

The repository uses Next.js 16.4.5. Current OpenNext Cloudflare documentation supports Next.js 16 and documents the existing-app setup path. Cloudflare's current guidance recommends vinext for new projects but documents OpenNext for maintaining an existing OpenNext application; we will use OpenNext first and evaluate alternatives only if a concrete compatibility gap appears.

Run this only after Step 1 and Step 2:

```powershell
npm install @opennextjs/cloudflare@latest
npm install --save-dev wrangler@latest
```

Then verify the package peer dependency range and run:

```powershell
npx @opennextjs/cloudflare migrate
```

Review every changed file before committing. This command automates adapter setup and may configure an R2 bucket for OpenNext caching if R2 is enabled. The application uploads bucket must remain a separate binding from the cache bucket.

## Step 5 — D1 schema and R2 application storage

Do not import production data yet.

- Build and validate SQLite migrations against a fresh local D1 database.
- Create and validate a fresh remote staging D1 database.
- Bind the application R2 bucket separately from any OpenNext cache bucket.
- Move question images, participant attachments, and training assets only after authorization and URL behavior have been tested.
- Preserve the original MySQL dump and full data backup unchanged.

## Step 6 — Security gates

Before any public preview:
- Replace plaintext admin password verification with bcrypt hash verification and a safe migration strategy.
- Review employee and participant authentication, OTP, cookie security, and role checks.
- Configure `SESSION_SECRET` as a Cloudflare secret.
- Verify no secrets, .env files, full SQL data dumps, or participant files exist in repository history.

## Step 7 — Staging acceptance

Test admin/employee/participant login, exam ticket validation, question retrieval, answer saves, autosubmit, file uploads, scoring, correction, exports, training material playback, OJT, reviews, and audit logs. Compare D1 row counts and key relationships to the source backup.

Only after sign-off and a new verified MySQL backup should a production cutover be planned. Do not change DNS or disable the existing production system during staging.

## Important note

The source MySQL schema contains 58 tables, 18 declared foreign keys, 24 ENUM columns, and numerous MySQL-specific SQL constructs. D1 is SQLite. The MySQL dump must be converted and reviewed, not directly imported.
