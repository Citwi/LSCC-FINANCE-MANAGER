# LSCC Finance Manager V6.1

## Cloud persistence fix
- Fixed logout race where a save already in progress could cause logout to proceed without the newest data being stored.
- Added a persistent sync queue/generation counter so edits made during an active upload are uploaded afterward.
- Failed cloud synchronization now keeps the user logged in.
- Added a cloud sync status indicator in the header.
- Login now creates a local safety backup before applying cloud state.
- If the cloud is still at the initial revision and this device has existing records, login asks whether to preserve/upload the local records instead of silently replacing them.
- Added server-side read-back verification after Supabase writes.
- Added cloud health reporting with actual database reachability and revision.
- Kept the existing Supabase table and data; no database reset is required.


## V6.1.1 persistence hotfix
- Fixed Supabase REST update requests losing the service-role authentication headers when request-specific headers were supplied.
- Cloud saves can now authenticate correctly for PATCH/POST operations.
- Client sync status now includes a safe server error message when a save fails.
- Existing Supabase data/schema are unchanged.

## V6.1.2 – User Settings Restriction
- Non-Administrator users now see only **My Account** on the Settings page.
- Non-Administrators can edit only their own display name, username and email address.
- Non-Administrators can change only their own password.
- Administrative settings, cloud configuration, backups/restores, reset, income/expense type management, user permissions and user account management remain Administrator-only through the Settings interface.
- Administrator Settings remain unchanged.
