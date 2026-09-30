# LSCC Finance Manager V6.1.4

Password reset routing fix.

- Reset email links containing `/?reset=...` now correctly serve the application.
- Reset token confirmation flow remains unchanged.
- No Supabase schema changes required.
- No existing cloud data is reset or deleted.
