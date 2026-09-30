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

## V6.1 persistence fix

This build changes cloud persistence so that:
- saves are queued and awaited instead of being silently skipped while another save is running;
- Logout waits for the latest cloud save and is blocked if the save cannot be confirmed;
- a local copy is retained as a safety backup before login replaces the browser state;
- if the cloud is still at the empty/initial revision while this device has existing records, the user is asked whether to upload the device records instead of silently wiping them;
- the header shows Cloud: synced / pending / saving / offline / conflict;
- every successful Supabase update is read back and verified by the server;
- `/api/health` now checks actual Supabase reachability and reports the current cloud revision.

**Important:** Do not run `supabase.sql` again for this update. The existing `lscc_state` table is reused so existing cloud data is not reset.


## V6.1.3 EMAIL PASSWORD RESET
For genuine email reset links, configure these Render environment variables:
- `RESEND_API_KEY`: server-only Resend API key.
- `RESET_FROM_EMAIL`: sender address approved by Resend (prefer a verified domain).
- `APP_PUBLIC_URL`: `https://lscc-finance-manager-1.onrender.com` for this deployment.
No Supabase SQL migration is required. The reset token is signed and expires after 30 minutes; changing the password invalidates the previous token.
