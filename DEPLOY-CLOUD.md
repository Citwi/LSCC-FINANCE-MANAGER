# Cloud V6 deployment checklist

## 1. Supabase
Create a Supabase project and run `supabase.sql` in SQL Editor.

Keep the **service-role key private**. It belongs only in the server environment.

## 2. Hosting
Recommended simple path: Render with the included `render.yaml` and `Dockerfile`.

Create a Web Service from this project and set:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SESSION_SECRET`

The service listens on the host-provided `PORT` and serves the LSCC application at `/`.

## 3. First login
Default seeded account:
- Username: `admin`
- Password: `LSCC@1234`

Immediately change the administrator password from the user management area.

## 4. Move existing V5 data
From the existing V5 application:
1. Settings → Backup JSON.
2. Save the JSON backup.
3. After cloud deployment, run:

`node migrate-backup.js backup.json https://YOUR-CLOUD-URL admin LSCC@1234`

The migration script refuses to overwrite an already initialized cloud database.

## 5. Multiple devices
Give every authorized user the same HTTPS web address. All devices use the same central PostgreSQL-backed state.

## 6. Backups
Enable Supabase's database backups/point-in-time recovery on a paid production plan as appropriate for the church's retention requirements. Also keep periodic application JSON exports as an additional recovery copy.
