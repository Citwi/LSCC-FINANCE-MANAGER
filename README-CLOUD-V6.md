# LSCC Finance Manager V6 — Cloud Deployment

## Architecture
The existing V5 single-page application is served by a small Node.js API. The central state is stored in a Supabase PostgreSQL database as JSONB, with revision checks preventing silent overwrites.

## Deploy with Supabase + Render/Railway/Fly.io
1. Create a Supabase project.
2. Open SQL Editor and run `supabase.sql`.
3. Copy the project's URL and **service-role key**. Keep the service-role key server-side only.
4. Deploy this folder as a Node 20 web service, or build the supplied Dockerfile.
5. Set environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SESSION_SECRET` (long random value)
   - `PORT` (usually supplied by the host)
6. Open the resulting HTTPS web URL.

## Default administrator
The seeded account is:
- Username: `admin`
- Password: `LSCC@1234`

Change the administrator password immediately after the first login.

## Existing V5 data
Use the existing V5 application's **Settings → Backup JSON** to export the current database before migration. The cloud migration/import workflow should be completed before multiple users start entering new records.

## Security
- The Supabase service-role key must never be placed in `index.html` or exposed to browsers.
- Use the hosting provider's HTTPS URL.
- The application authenticates users through the server before returning the central database.
- Database updates use a revision check and reject stale writes.
