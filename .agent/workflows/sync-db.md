---
description: Synchronize Supabase DB Types
---
# Sync DB Workflow

This workflow updates the TypeScript definitions for the Supabase database.

1. **Check Environment**: Ensure logged in to Supabase CLI (or have access token).

2. **Generate Types**:
   - Run the following command (requires `SUPABASE_PROJECT_ID` in `.env` or known):
   // turbo
   - `npx supabase gen types typescript --project-id "$SUPABASE_PROJECT_ID" --schema public > types/database.ts`
   *(If `SUPABASE_PROJECT_ID` is not set, ask user for it)*

3. **Verify**:
   - Run `npm run lint` to check for any breaking type changes.
