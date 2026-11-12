# Moving from Local Deployment to a Hosted Instance

This app is built for fully local operation (localhost PostgreSQL + local filesystem
storage). Making it available beyond a single machine mainly involves configuration, not
code changes.

## 1. Database

- Host PostgreSQL on a server or managed instance (Azure Database for PostgreSQL,
  RDS, self-hosted).
- Change `ConnectionStrings:Default` (host, port, database, user, password, `SSL Mode=Requires`).
- Prefer environment variables over appsettings for credentials:
  `ConnectionStrings__Default="Host=...;Username=...;Password=..."`.
- Migration state ships in the repository; on deploy either let `Seed:AutoMigrate=true`
  apply pending migrations at startup, or run
  `dotnet ef database update --project Backend\Infrastructures\Infrastructures.csproj --startup-project Backend\Apis\Apis.csproj`.
- Back up the database before applying `RemovePostFeatures`. It drops post, comment,
  reaction, and post-notification data while preserving media files, media ownership,
  and album membership. Rolling the migration back creates synthetic posts by media
  owner; it cannot restore original post groups, captions, comments, reactions, or
  notifications.

## 2. Storage

`MediaStorage:Root` accepts any absolute path — point it at a mounted volume or durable
disk rather than a directory next to the binaries. Files must survive app redeploys; the
database only records relative paths (`media/<kind>/<file>`, `trash/<kind>/<file>`).

### Preview-only uploads

Apply `AddPreviewOnlyMedia` and `EnsurePreviewDraftExpiry` before deploying the updated
API/frontend. These additive migrations preserve existing gallery media and upload history. New album/place
preview uploads use shared `preview-assets/image/` storage, so back up that directory
alongside the database and normal media files.

If the API reports PostgreSQL error `42703` for `preview_draft_expires_at`, the database
may have applied the earlier version of `AddPreviewOnlyMedia` before draft expiry was
included. EF does not rerun an applied migration after its source changes.
`EnsurePreviewDraftExpiry` adds the nullable column only when it is missing, so it
also works on databases that already have the column. Apply pending migrations through
the database workflow above, then restart the updated API. Reverting only this repair
keeps the column because `AddPreviewOnlyMedia` owns it.

Stop `dotnet watch` before scaffolding migrations: startup can apply a generated,
still-empty migration before its custom SQL is finished. If migration history already
records `EnsurePreviewDraftExpiry` but the column is still missing, apply
`RepairPreviewDraftExpiryColumn`. It repeats the conditional column addition under
a new migration ID. Keep the API stopped until pending migrations have been applied.

Unused previews are permanently removed after their last active album/place
reference disappears, including replacement and deletion. Cancelled drafts are
released immediately; abandoned drafts expire after 24 hours. A five-minute worker
retries pending cleanup. Database rows remain soft-deleted, but preview files and
generated thumbnails are not recoverable through Trash.

For rollback, stop the updated API and restore a coordinated database/storage backup
from before this feature, or first remove all preview-only references and allow cleanup
to finish. Do not drop the preview-only columns while live preview assets remain:
older APIs would treat those rows as gallery media. Rolling back schema cannot
restore preview files already permanently removed.

## 3. Secrets & JWT

- Replace `Jwt:Key` with a 64+ character random secret (`encryptionKey` rotations require
  re-issuing refresh tokens; access tokens are short-lived so rotation is painless).
- Tighten lifetimes if desired: `Jwt:AccessTokenMinutes`, `Jwt:RefreshTokenDays`.
- Disable or rename the seeded admin: remove `Seed:AdminPassword`, create the real admin
  manually, and change the seeded account's password.

## 4. Networking & HTTPS

- Terminate TLS at a reverse proxy (IIS / nginx / Caddy) and forward to the API.
- Set `ASPNETCORE_ENVIRONMENT=Production`; Swagger then serves only in Development.

## 5. CORS

`Cors:AllowedOrigins` in appsettings (or `Cors__AllowedOrigins` env var) must contain the
frontend's public origin. Defaults are localhost-appropriate.

## 6. Frontend

Set `VITE_API_URL` to the public API base URL at build time (`npm run build`).

## 7. Overnight concerns (none apply locally)

- Set up scheduled backups for both the database and the media/Trash directories.
- Decide on a trash-purge policy (see known limitations in README).

## Security Checklist for a Public Deployment

- [ ] HTTPS/TLS everywhere; HSTS at the proxy
- [ ] Secrets in a vault or environment variables — never in git
- [ ] Rate limiting on auth endpoints (recommend `Microsoft.AspNetCore.RateLimiting`)
- [ ] CORS restricted to the exact production origin
- [ ] Structured/logging sink (Serilog + file/Seq/App Insights)
- [ ] Regular database + media backups, restore-tested
- [ ] Refresh-token reuse detection already revokes token families (enabled by default)