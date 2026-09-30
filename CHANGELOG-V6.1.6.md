# LSCC Finance Manager V6.1.6

- Added SMS Messaging module powered by Africa's Talking.
- Added All Members, Home Cell, Member Type, Department, Special Department, Gender, Selected Members, and Custom Numbers recipient modes.
- Added member search/selection, message templates, personalization using `{MemberName}`, SMS character/segment count, send confirmation, batched sending, and SMS history.
- Added server-side Africa's Talking configuration using Render environment variables. API credentials are never exposed to the browser.
- Added Kenyan phone-number normalization to `+254...`.
- Added `sms` permission module so administrators can grant SMS access to other users.
- Existing Supabase state table is reused; no new SQL migration is required.
